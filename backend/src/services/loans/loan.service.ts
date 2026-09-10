import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { CreateLoanInput, UpdateLoanInput, EarlyClosureInput, LoanQueryParams } from '../../validators/loan.validator';
import { computeLoanSchedule, computeEarlyClosure, todayIST } from '../../domain/loan/loanCalculation';
import { Prisma } from '@prisma/client';

export class LoanService {
  private static async generateLoanNumber(): Promise<string> {
    const lastLoan = await prisma.loan.findFirst({
      orderBy: { loanNumber: 'desc' },
      select: { loanNumber: true },
    });

    if (!lastLoan || !lastLoan.loanNumber) {
      return 'LN-000001';
    }

    const matches = lastLoan.loanNumber.match(/LN-(\d+)/);
    if (!matches) {
      return 'LN-000001';
    }

    const nextNum = parseInt(matches[1], 10) + 1;
    return `LN-${String(nextNum).padStart(6, '0')}`;
  }

  static async createLoan(input: CreateLoanInput, userId?: string) {
    // 1. Check customer existence (supports both UUID id and customerCode)
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { id: input.customerId },
          { customerCode: input.customerId },
        ],
      },
    });

    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    if (customer.status !== 'ACTIVE') {
      throw ApiError.badRequest('Cannot create loan for inactive or blocked customer');
    }

    const principalAmount = input.principalAmount ?? (input as any).principal ?? 10000;
    const interestRate = input.interestRate ?? (input as any).annualRate ?? 18;
    const loanProductId = input.loanProductId ?? (input as any).productId ?? null;
    const targetFirstDueDate = input.firstDueDate ?? (input as any).firstEmiDate;

    // 2. Validate product if provided
    if (loanProductId) {
      const product = await prisma.loanProduct.findUnique({
        where: { id: loanProductId },
      });
      if (!product) {
        throw ApiError.notFound('Loan product not found');
      }
      if (!product.isActive) {
        throw ApiError.badRequest('Selected loan product is inactive');
      }
      if (principalAmount < Number(product.minAmount) || principalAmount > Number(product.maxAmount)) {
        throw ApiError.badRequest(
          `Principal amount must be between ₹${product.minAmount} and ₹${product.maxAmount} for this product`
        );
      }
    }

    // 3. Compute domain schedule
    const scheduleResult = computeLoanSchedule({
      principal: principalAmount,
      annualRate: interestRate,
      interestType: input.interestType,
      tenure: input.tenure,
      frequency: input.frequency,
      startDate: input.startDate,
      firstDueDate: targetFirstDueDate,
    });

    const loanNumber = await this.generateLoanNumber();
    const maturityDate = scheduleResult.schedule[scheduleResult.schedule.length - 1]?.dueDate || input.startDate;
    const computedFirstDueDate = scheduleResult.schedule[0]?.dueDate || input.startDate;

    // 4. Prisma transaction to atomically create Loan and Installments
    const loan = await prisma.$transaction(async (tx) => {
      const createdLoan = await tx.loan.create({
        data: {
          loanNumber,
          customerId: customer.id,
          loanProductId,
          principalAmount: new Prisma.Decimal(principalAmount),
          interestRate: new Prisma.Decimal(interestRate),
          interestType: input.interestType,
          tenure: input.tenure,
          frequency: input.frequency,
          processingFee: new Prisma.Decimal(input.processingFee || 0),
          totalInterest: new Prisma.Decimal(scheduleResult.totalInterest),
          totalPayable: new Prisma.Decimal(scheduleResult.totalPayable),
          emiAmount: new Prisma.Decimal(scheduleResult.emiAmount),
          startDate: input.startDate,
          firstDueDate: computedFirstDueDate,
          maturityDate,
          paidAmount: new Prisma.Decimal(0),
          outstandingAmount: new Prisma.Decimal(scheduleResult.totalPayable),
          overdueAmount: new Prisma.Decimal(0),
          status: 'ACTIVE',
          purpose: input.purpose,
          disbursementMethod: input.disbursementMethod,
          bankTransactionId: input.bankTransactionId,
        },
      });

      // Create all installments
      const installmentData = scheduleResult.schedule.map((item) => ({
        loanId: createdLoan.id,
        installmentNumber: item.installmentNumber,
        dueDate: item.dueDate,
        principalAmount: new Prisma.Decimal(item.principalAmount),
        interestAmount: new Prisma.Decimal(item.interestAmount),
        totalAmount: new Prisma.Decimal(item.totalAmount),
        paidAmount: new Prisma.Decimal(0),
        outstandingAmount: new Prisma.Decimal(item.totalAmount),
        status: 'PENDING' as const,
      }));

      await tx.installment.createMany({
        data: installmentData,
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          customerId: customer.id,
          entityType: 'Loan',
          entityId: createdLoan.id,
          action: 'CREATE',
          newValue: {
            loanNumber,
            principal: input.principalAmount,
            totalPayable: scheduleResult.totalPayable,
            tenure: input.tenure,
          },
        },
      });

      return createdLoan;
    });

    return this.getLoanById(loan.id);
  }

  static async getLoans(params: LoanQueryParams) {
    const { skip, take, page, limit } = parsePagination(params);

    const where: Prisma.LoanWhereInput = {};

    if (params.customerId) {
      where.customerId = params.customerId;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.frequency) {
      where.frequency = params.frequency;
    }

    if (params.startDate || params.endDate) {
      where.startDate = {};
      if (params.startDate) (where.startDate as any).gte = params.startDate;
      if (params.endDate) (where.startDate as any).lte = params.endDate;
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { loanNumber: { contains: q } },
        { customer: { fullName: { contains: q } } },
        { customer: { mobile: { contains: q } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.loan.count({ where }),
      prisma.loan.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              customerCode: true,
              fullName: true,
              mobile: true,
              city: true,
            },
          },
          loanProduct: {
            select: {
              id: true,
              name: true,
            },
          },
          installments: {
            orderBy: { installmentNumber: 'asc' },
          },
          _count: {
            select: {
              installments: true,
              payments: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  static async getLoanById(id: string) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        customer: true,
        loanProduct: true,
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!loan) {
      throw ApiError.notFound('Loan not found');
    }

    return loan;
  }

  static async getLoanSummary(id: string) {
    const loan = await this.getLoanById(id);
    const today = todayIST();

    const totalInstallments = loan.installments.length;
    const paidInstallments = loan.installments.filter((i) => i.status === 'PAID').length;
    const overdueInstallments = loan.installments.filter(
      (i) => i.status !== 'PAID' && i.dueDate < today
    ).length;

    const nextDue = loan.installments.find(
      (i) => i.status !== 'PAID' && i.dueDate >= today
    );

    const progressPercentage = totalInstallments > 0
      ? Math.round((paidInstallments / totalInstallments) * 100)
      : 0;

    return {
      loanId: loan.id,
      loanNumber: loan.loanNumber,
      customerName: loan.customer.fullName,
      status: loan.status,
      principalAmount: loan.principalAmount,
      totalInterest: loan.totalInterest,
      totalPayable: loan.totalPayable,
      paidAmount: loan.paidAmount,
      outstandingAmount: loan.outstandingAmount,
      overdueAmount: loan.overdueAmount,
      emiAmount: loan.emiAmount,
      totalInstallments,
      paidInstallments,
      overdueInstallments,
      progressPercentage,
      nextDueDate: nextDue ? nextDue.dueDate : null,
      nextDueAmount: nextDue ? nextDue.outstandingAmount : null,
    };
  }

  static async updateLoan(id: string, input: UpdateLoanInput, userId?: string) {
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) {
      throw ApiError.notFound('Loan not found');
    }

    const updated = await prisma.loan.update({
      where: { id },
      data: input,
    });

    await prisma.auditLog.create({
      data: {
        userId,
        customerId: loan.customerId,
        entityType: 'Loan',
        entityId: id,
        action: 'UPDATE',
        oldValue: loan as any,
        newValue: updated as any,
      },
    });

    return updated;
  }

  static async earlyClosureQuote(loanId: string, input: EarlyClosureInput) {
    const loan = await this.getLoanById(loanId);
    if (loan.status === 'CLOSED' || loan.status === 'CANCELLED') {
      throw ApiError.badRequest('Loan is already closed or cancelled');
    }

    const quote = computeEarlyClosure(
      {
        principal: Number(loan.principalAmount),
        annualRate: Number(loan.interestRate),
        interestType: loan.interestType as any,
        tenure: loan.tenure,
        frequency: loan.frequency as any,
        startDate: loan.startDate,
      },
      loan.installments.map((i) => ({
        installmentNumber: i.installmentNumber,
        dueDate: i.dueDate,
        principalAmount: Number(i.principalAmount),
        interestAmount: Number(i.interestAmount),
        totalAmount: Number(i.totalAmount),
        paidAmount: Number(i.paidAmount),
        outstandingAmount: Number(i.outstandingAmount),
        status: i.status as any,
      })),
      input.closureDate,
      input.foreclosureChargePercent,
      input.waiveLateFee
    );

    return quote;
  }
}
