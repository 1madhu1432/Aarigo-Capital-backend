import { prisma } from '../../lib/prisma';
import { todayIST, addDays } from '../../domain/loan/loanCalculation';

export class DashboardService {
  static async getSummary() {
    const today = todayIST();
    const next7Days = addDays(today, 7);

    const [
      totalCustomers,
      activeLoansCount,
      overdueLoansCount,
      closedLoansCount,
      loanAggregates,
      todayPayments,
      todayDueInstallments,
      recentPayments,
      upcomingDue,
    ] = await Promise.all([
      prisma.customer.count({ where: { status: 'ACTIVE' } }),
      prisma.loan.count({ where: { status: 'ACTIVE' } }),
      prisma.loan.count({ where: { status: 'OVERDUE' } }),
      prisma.loan.count({ where: { status: 'CLOSED' } }),
      prisma.loan.aggregate({
        _sum: {
          principalAmount: true,
          totalPayable: true,
          paidAmount: true,
          outstandingAmount: true,
          overdueAmount: true,
        },
      }),
      prisma.payment.aggregate({
        where: { paymentDate: today },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.installment.aggregate({
        where: { dueDate: today, status: { not: 'PAID' } },
        _sum: { outstandingAmount: true },
        _count: { id: true },
      }),
      prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { fullName: true, mobile: true } },
          loan: { select: { loanNumber: true } },
        },
      }),
      prisma.installment.findMany({
        where: {
          dueDate: { gte: today, lte: next7Days },
          status: { not: 'PAID' },
        },
        take: 5,
        orderBy: { dueDate: 'asc' },
        include: {
          loan: {
            select: {
              loanNumber: true,
              customer: { select: { fullName: true, mobile: true } },
            },
          },
        },
      }),
    ]);

    return {
      today,
      metrics: {
        totalCustomers,
        activeLoans: activeLoansCount,
        overdueLoans: overdueLoansCount,
        closedLoans: closedLoansCount,
        totalDisbursed: Number(loanAggregates._sum.principalAmount || 0),
        totalReceivable: Number(loanAggregates._sum.totalPayable || 0),
        totalCollected: Number(loanAggregates._sum.paidAmount || 0),
        totalOutstanding: Number(loanAggregates._sum.outstandingAmount || 0),
        totalOverdue: Number(loanAggregates._sum.overdueAmount || 0),
        todayCollectionAmount: Number(todayPayments._sum.amount || 0),
        todayCollectionCount: todayPayments._count.id,
        todayDueAmount: Number(todayDueInstallments._sum.outstandingAmount || 0),
        todayDueCount: todayDueInstallments._count.id,
      },
      recentPayments,
      upcomingDue,
    };
  }
}
