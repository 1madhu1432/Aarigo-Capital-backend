import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { CreateDailyClosingInput, DailyClosingQueryParams } from '../../validators/dailyClosing.validator';
import { Prisma } from '@prisma/client';

export class DailyClosingService {
  static async performClosing(input: CreateDailyClosingInput, userId?: string) {
    const { closingDate, notes } = input;

    // Check if already closed
    const existing = await prisma.dailyClosing.findUnique({
      where: { closingDate },
    });

    if (existing && existing.status === 'CLOSED') {
      throw ApiError.badRequest(`Daily closing for ${closingDate} is already closed`);
    }

    // 1. Aggregate payments on this date
    const payments = await prisma.payment.findMany({
      where: { paymentDate: closingDate },
    });

    let cashAmount = 0;
    let cashCount = 0;
    let upiAmount = 0;
    let upiCount = 0;
    let bankAmount = 0;
    let bankCount = 0;

    for (const p of payments) {
      const amt = Number(p.amount);
      if (p.paymentMethod === 'CASH') {
        cashAmount += amt;
        cashCount += 1;
      } else if (p.paymentMethod === 'UPI') {
        upiAmount += amt;
        upiCount += 1;
      } else if (p.paymentMethod === 'BANK_TRANSFER') {
        bankAmount += amt;
        bankCount += 1;
      }
    }

    const totalCollected = cashAmount + upiAmount + bankAmount;
    const transactionsCount = payments.length;

    // 2. Aggregate installments due on this date
    const dueInstallments = await prisma.installment.findMany({
      where: { dueDate: closingDate },
    });

    const totalDue = dueInstallments.reduce((sum, i) => sum + Number(i.totalAmount), 0);
    const shortfall = Math.max(0, totalDue - totalCollected);
    const collectionRate = totalDue > 0 ? (totalCollected / totalDue) * 100 : 100;

    // 3. Count visits on this date
    const visitsCount = await prisma.visit.count({
      where: { visitDate: closingDate },
    });

    const closingData = {
      closingDate,
      totalDue: new Prisma.Decimal(totalDue),
      totalCollected: new Prisma.Decimal(totalCollected),
      shortfall: new Prisma.Decimal(shortfall),
      collectionRate: new Prisma.Decimal(collectionRate.toFixed(2)),
      cashAmount: new Prisma.Decimal(cashAmount),
      cashCount,
      upiAmount: new Prisma.Decimal(upiAmount),
      upiCount,
      bankAmount: new Prisma.Decimal(bankAmount),
      bankCount,
      transactionsCount,
      visitsCount,
      status: 'CLOSED' as const,
      closedByUserId: userId,
      closedAt: new Date(),
      notes,
    };

    if (existing) {
      return prisma.dailyClosing.update({
        where: { id: existing.id },
        data: closingData,
      });
    }

    return prisma.dailyClosing.create({
      data: closingData,
    });
  }

  static async getDailyClosings(params: DailyClosingQueryParams) {
    const { skip, take, page, limit } = parsePagination(params);

    const where: any = {};
    if (params.startDate) where.closingDate = { gte: params.startDate };
    if (params.endDate) where.closingDate = { lte: params.endDate };
    if (params.status) where.status = params.status;

    const [total, items] = await Promise.all([
      prisma.dailyClosing.count({ where }),
      prisma.dailyClosing.findMany({
        where,
        skip,
        take,
        orderBy: { closingDate: 'desc' },
        include: {
          closedBy: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return {
      items,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  static async getDailyClosingById(id: string) {
    const closing = await prisma.dailyClosing.findUnique({
      where: { id },
      include: {
        closedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!closing) throw ApiError.notFound('Daily closing not found');
    return closing;
  }
}
