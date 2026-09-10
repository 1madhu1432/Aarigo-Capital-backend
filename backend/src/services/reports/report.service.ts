import { prisma } from '../../lib/prisma';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { todayIST } from '../../domain/loan/loanCalculation';

export class ReportService {
  static async getLoanReport(params: { startDate?: string; endDate?: string; status?: any; page?: number; limit?: number }) {
    const { skip, take, page, limit } = parsePagination(params);
    const where: any = {};
    if (params.status) where.status = params.status;
    if (params.startDate || params.endDate) {
      where.startDate = {};
      if (params.startDate) where.startDate.gte = params.startDate;
      if (params.endDate) where.startDate.lte = params.endDate;
    }

    const [total, items] = await Promise.all([
      prisma.loan.count({ where }),
      prisma.loan.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { fullName: true, mobile: true, customerCode: true } },
          loanProduct: { select: { name: true } },
        },
      }),
    ]);

    return { items, pagination: buildPaginationMeta(total, page, limit) };
  }

  static async getPaymentReport(params: { startDate?: string; endDate?: string; paymentMethod?: any; page?: number; limit?: number }) {
    const { skip, take, page, limit } = parsePagination(params);
    const where: any = {};
    if (params.paymentMethod) where.paymentMethod = params.paymentMethod;
    if (params.startDate || params.endDate) {
      where.paymentDate = {};
      if (params.startDate) where.paymentDate.gte = params.startDate;
      if (params.endDate) where.paymentDate.lte = params.endDate;
    }

    const [total, items] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { paymentDate: 'desc' },
        include: {
          customer: { select: { fullName: true, mobile: true } },
          loan: { select: { loanNumber: true } },
        },
      }),
    ]);

    return { items, pagination: buildPaginationMeta(total, page, limit) };
  }

  static async getCollectionReport(params: { startDate?: string; endDate?: string; page?: number; limit?: number }) {
    const { skip, take, page, limit } = parsePagination(params);
    const where: any = {};
    if (params.startDate || params.endDate) {
      where.collectionDate = {};
      if (params.startDate) where.collectionDate.gte = params.startDate;
      if (params.endDate) where.collectionDate.lte = params.endDate;
    }

    const [total, items] = await Promise.all([
      prisma.collection.count({ where }),
      prisma.collection.findMany({
        where,
        skip,
        take,
        orderBy: { collectionDate: 'desc' },
        include: {
          customer: { select: { fullName: true, mobile: true } },
          loan: { select: { loanNumber: true } },
          collectedBy: { select: { name: true } },
        },
      }),
    ]);

    return { items, pagination: buildPaginationMeta(total, page, limit) };
  }

  static async getOverdueReport(params: { page?: number; limit?: number }) {
    const { skip, take, page, limit } = parsePagination(params);
    const today = todayIST();

    const where: any = {
      status: { not: 'PAID' },
      dueDate: { lt: today },
    };

    const [total, items] = await Promise.all([
      prisma.installment.count({ where }),
      prisma.installment.findMany({
        where,
        skip,
        take,
        orderBy: { dueDate: 'asc' },
        include: {
          loan: {
            select: {
              loanNumber: true,
              customer: {
                select: { id: true, fullName: true, mobile: true, customerCode: true, address: true },
              },
            },
          },
        },
      }),
    ]);

    return { items, pagination: buildPaginationMeta(total, page, limit) };
  }

  static async getDailyCollectionSummary(date?: string) {
    const targetDate = date || todayIST();

    const payments = await prisma.payment.findMany({
      where: { paymentDate: targetDate },
      include: {
        customer: { select: { fullName: true, mobile: true } },
        loan: { select: { loanNumber: true } },
      },
    });

    const summary = payments.reduce(
      (acc, p) => {
        const amt = Number(p.amount);
        acc.total += amt;
        if (p.paymentMethod === 'CASH') acc.cash += amt;
        else if (p.paymentMethod === 'UPI') acc.upi += amt;
        else if (p.paymentMethod === 'BANK_TRANSFER') acc.bank += amt;
        else acc.other += amt;
        acc.count += 1;
        return acc;
      },
      { total: 0, cash: 0, upi: 0, bank: 0, other: 0, count: 0 }
    );

    return {
      date: targetDate,
      summary,
      transactions: payments,
    };
  }

  static async getPortfolioReport() {
    const [
      totalLoans,
      activeLoans,
      closedLoans,
      overdueLoans,
      totalCustomers,
      loans,
      payments,
    ] = await Promise.all([
      prisma.loan.count(),
      prisma.loan.count({ where: { status: 'ACTIVE' } }),
      prisma.loan.count({ where: { status: 'CLOSED' } }),
      prisma.loan.count({ where: { status: 'OVERDUE' } }),
      prisma.customer.count(),
      prisma.loan.findMany({
        select: {
          principalAmount: true,
          totalInterest: true,
          totalPayable: true,
          paidAmount: true,
          outstandingAmount: true,
          status: true,
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const totalDisbursed = loans.reduce((sum, l) => sum + Number(l.principalAmount || 0), 0);
    const totalExpected = loans.reduce((sum, l) => sum + Number(l.totalPayable || 0), 0);
    const totalCollected = Number(payments._sum.amount || 0);
    const totalOutstanding = loans.reduce((sum, l) => sum + Number(l.outstandingAmount || 0), 0);
    const recoveryRate = totalExpected > 0 ? Number(((totalCollected / totalExpected) * 100).toFixed(2)) : 100;

    return {
      portfolioSummary: {
        totalCustomers,
        totalLoans,
        activeLoans,
        closedLoans,
        overdueLoans,
        totalDisbursed,
        totalExpected,
        totalCollected,
        totalOutstanding,
        recoveryRate,
        totalPaymentsCount: payments._count.id,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}
