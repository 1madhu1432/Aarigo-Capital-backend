import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { CreateCollectionInput, CollectionQueryParams } from '../../validators/collection.validator';
import { PaymentService } from '../payments/payment.service';

export class CollectionService {
  static async recordCollection(input: CreateCollectionInput, userId?: string) {
    // A collection records a payment directly into the ledger
    return PaymentService.recordPayment(
      {
        loanId: input.loanId,
        amount: input.amount,
        paymentDate: input.collectionDate,
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber,
        notes: input.notes,
        isEarlyClosure: false,
      },
      userId
    );
  }

  static async getCollections(params: CollectionQueryParams) {
    const { skip, take, page, limit } = parsePagination(params);

    const where: any = {};

    if (params.loanId) where.loanId = params.loanId;
    if (params.customerId) where.customerId = params.customerId;
    if (params.collectionDate) where.collectionDate = params.collectionDate;
    if (params.paymentMethod) where.paymentMethod = params.paymentMethod;

    const [total, items] = await Promise.all([
      prisma.collection.count({ where }),
      prisma.collection.findMany({
        where,
        skip,
        take,
        orderBy: { collectionDate: 'desc' },
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
          collectedBy: {
            select: {
              id: true,
              name: true,
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

  static async getCollectionById(id: string) {
    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        customer: true,
        loan: true,
        payment: true,
        collectedBy: { select: { id: true, name: true } },
      },
    });

    if (!collection) {
      throw ApiError.notFound('Collection not found');
    }

    return collection;
  }

  static async getDailyRun(date?: string) {
    const targetDate = date || new Date().toISOString().slice(0, 10);

    const dueInstallments = await prisma.installment.findMany({
      where: {
        dueDate: { lte: targetDate },
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
        loan: {
          status: 'ACTIVE',
        },
      },
      include: {
        loan: {
          include: {
            customer: {
              select: {
                id: true,
                customerCode: true,
                fullName: true,
                mobile: true,
                address: true,
                city: true,
              },
            },
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { installmentNumber: 'asc' },
      ],
    });

    const totalDue = dueInstallments.reduce((acc, inst) => acc + Number(inst.outstandingAmount), 0);
    const count = dueInstallments.length;

    return {
      date: targetDate,
      totalDue,
      count,
      items: dueInstallments,
    };
  }
}
