import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { CreatePaymentInput, PaymentQueryParams } from '../../validators/payment.validator';
import { allocatePayment } from '../../domain/payment/paymentAllocation';
import { todayIST } from '../../domain/loan/loanCalculation';
import { Prisma } from '@prisma/client';

export class PaymentService {
  private static async generatePaymentNumber(): Promise<string> {
    const last = await prisma.payment.findFirst({
      orderBy: { paymentNumber: 'desc' },
      select: { paymentNumber: true },
    });

    if (!last || !last.paymentNumber) {
      return 'PAY-000001';
    }

    const matches = last.paymentNumber.match(/PAY-(\d+)/);
    if (!matches) {
      return 'PAY-000001';
    }

    const nextNum = parseInt(matches[1], 10) + 1;
    return `PAY-${String(nextNum).padStart(6, '0')}`;
  }

  private static async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RCP-${year}-`;
    const last = await prisma.receipt.findFirst({
      where: { receiptNumber: { startsWith: prefix } },
      orderBy: { receiptNumber: 'desc' },
      select: { receiptNumber: true },
    });

    if (!last || !last.receiptNumber) {
      return `${prefix}00001`;
    }

    const numPart = last.receiptNumber.replace(prefix, '');
    const nextNum = parseInt(numPart, 10) + 1;
    return `${prefix}${String(nextNum).padStart(5, '0')}`;
  }

  static async recordPayment(input: CreatePaymentInput, userId?: string) {
    const loan = await prisma.loan.findUnique({
      where: { id: input.loanId },
      include: {
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!loan) {
      throw ApiError.notFound('Loan not found');
    }

    if (loan.status === 'CLOSED' || loan.status === 'CANCELLED') {
      throw ApiError.badRequest(`Cannot accept payment for loan with status ${loan.status}`);
    }

    const paymentNumber = await this.generatePaymentNumber();
    const receiptNumber = await this.generateReceiptNumber();

    // Perform atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Calculate installment allocations
      const domainInstallments = loan.installments.map((i) => ({
        id: i.id,
        installmentNumber: i.installmentNumber,
        dueDate: i.dueDate,
        principalAmount: Number(i.principalAmount),
        interestAmount: Number(i.interestAmount),
        totalAmount: Number(i.totalAmount),
        paidAmount: Number(i.paidAmount),
        outstandingAmount: Number(i.outstandingAmount),
        status: i.status as any,
      }));

      const allocationResult = allocatePayment(
        domainInstallments,
        input.amount,
        input.paymentDate
      );

      // 2. Create the Payment record
      const payment = await tx.payment.create({
        data: {
          paymentNumber,
          loanId: loan.id,
          customerId: loan.customerId,
          createdByUserId: userId,
          amount: new Prisma.Decimal(input.amount),
          paymentDate: input.paymentDate,
          paymentMethod: input.paymentMethod,
          referenceNumber: input.referenceNumber,
          notes: input.notes,
          isEarlyClosure: input.isEarlyClosure ?? false,
        },
      });

      // 3. Update each modified installment
      for (const update of allocationResult.allocations) {
        await tx.installment.update({
          where: { id: update.installmentId },
          data: {
            paidAmount: new Prisma.Decimal(update.newPaidAmount),
            outstandingAmount: new Prisma.Decimal(update.newOutstandingAmount),
            status: update.newStatus as any,
            paidAt: update.newStatus === 'PAID' ? new Date() : undefined,
          },
        });
      }

      // If early closure, mark any remaining future installments as waived/PAID with 0
      if (input.isEarlyClosure) {
        await tx.installment.updateMany({
          where: {
            loanId: loan.id,
            status: { in: ['PENDING', 'PARTIAL'] },
          },
          data: {
            outstandingAmount: new Prisma.Decimal(0),
            status: 'PAID',
            paidAt: new Date(),
          },
        });
      }

      // 4. Calculate new loan totals
      const newPaidAmount = Number(loan.paidAmount) + input.amount;
      const newOutstanding = Math.max(0, Number(loan.totalPayable) - newPaidAmount);

      // Calculate remaining overdue
      const remainingInstallments = await tx.installment.findMany({
        where: { loanId: loan.id },
      });
      const today = todayIST();
      const newOverdue = remainingInstallments
        .filter((i) => i.status !== 'PAID' && i.dueDate < today)
        .reduce((sum, i) => sum + Number(i.outstandingAmount), 0);

      const isFullyPaid = input.isEarlyClosure || newOutstanding <= 0.01;
      const newStatus = isFullyPaid
        ? 'CLOSED'
        : newOverdue > 0
        ? 'OVERDUE'
        : 'ACTIVE';

      await tx.loan.update({
        where: { id: loan.id },
        data: {
          paidAmount: new Prisma.Decimal(newPaidAmount),
          outstandingAmount: new Prisma.Decimal(isFullyPaid ? 0 : newOutstanding),
          overdueAmount: new Prisma.Decimal(newOverdue),
          status: newStatus,
        },
      });

      // 5. Create Collection record
      const collection = await tx.collection.create({
        data: {
          loanId: loan.id,
          customerId: loan.customerId,
          paymentId: payment.id,
          collectedByUserId: userId,
          collectionDate: input.paymentDate,
          amount: new Prisma.Decimal(input.amount),
          paymentMethod: input.paymentMethod,
          referenceNumber: input.referenceNumber,
          notes: input.notes,
        },
      });

      // 6. Create Receipt record
      const receipt = await tx.receipt.create({
        data: {
          receiptNumber,
          paymentId: payment.id,
          loanId: loan.id,
          status: 'ISSUED',
        },
      });

      // 7. Audit log
      await tx.auditLog.create({
        data: {
          userId,
          customerId: loan.customerId,
          entityType: 'Payment',
          entityId: payment.id,
          action: 'CREATE',
          newValue: {
            paymentNumber,
            amount: input.amount,
            method: input.paymentMethod,
            receiptNumber,
          },
        },
      });

      return {
        payment,
        collection,
        receipt,
        loanStatus: newStatus,
        remainingOutstanding: isFullyPaid ? 0 : newOutstanding,
      };
    });

    return result;
  }

  static async getPayments(params: PaymentQueryParams) {
    const { skip, take, page, limit } = parsePagination(params);

    const where: Prisma.PaymentWhereInput = {};

    if (params.loanId) {
      where.loanId = params.loanId;
    }

    if (params.customerId) {
      where.customerId = params.customerId;
    }

    if (params.paymentMethod) {
      where.paymentMethod = params.paymentMethod;
    }

    if (params.startDate) {
      where.paymentDate = { gte: params.startDate };
    }

    if (params.endDate) {
      where.paymentDate = { lte: params.endDate };
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { paymentNumber: { contains: q } },
        { referenceNumber: { contains: q } },
        { customer: { fullName: { contains: q } } },
        { customer: { mobile: { contains: q } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { paymentDate: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              customerCode: true,
              fullName: true,
              mobile: true,
            },
          },
          loan: {
            select: {
              id: true,
              loanNumber: true,
            },
          },
          receipt: true,
        },
      }),
    ]);

    return {
      items,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  static async getPaymentById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        loan: true,
        receipt: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!payment) {
      throw ApiError.notFound('Payment not found');
    }

    return payment;
  }
}
