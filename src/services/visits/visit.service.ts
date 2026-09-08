import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { CreateVisitInput, UpdateVisitInput, VisitQueryParams } from '../../validators/visit.validator';
import { Prisma } from '@prisma/client';

export class VisitService {
  static async createVisit(input: CreateVisitInput) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw ApiError.notFound('Customer not found');

    const loan = await prisma.loan.findUnique({ where: { id: input.loanId } });
    if (!loan) throw ApiError.notFound('Loan not found');

    return prisma.visit.create({
      data: {
        customerId: input.customerId,
        loanId: input.loanId,
        visitDate: input.visitDate,
        purpose: input.purpose,
        status: input.status,
        notes: input.notes,
        location: input.location,
        dueAmount: input.dueAmount !== undefined && input.dueAmount !== null ? new Prisma.Decimal(input.dueAmount) : null,
        collected: input.collected !== undefined && input.collected !== null ? new Prisma.Decimal(input.collected) : null,
        nextVisit: input.nextVisit,
      },
    });
  }

  static async getVisits(params: VisitQueryParams) {
    const { skip, take, page, limit } = parsePagination(params);

    const where: any = {};
    if (params.customerId) where.customerId = params.customerId;
    if (params.loanId) where.loanId = params.loanId;
    if (params.visitDate) where.visitDate = params.visitDate;
    if (params.status) where.status = params.status;

    const [total, items] = await Promise.all([
      prisma.visit.count({ where }),
      prisma.visit.findMany({
        where,
        skip,
        take,
        orderBy: { visitDate: 'desc' },
        include: {
          customer: {
            select: { id: true, customerCode: true, fullName: true, mobile: true, address: true },
          },
          loan: {
            select: { id: true, loanNumber: true, outstandingAmount: true },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  static async getVisitById(id: string) {
    const visit = await prisma.visit.findUnique({
      where: { id },
      include: { customer: true, loan: true },
    });

    if (!visit) throw ApiError.notFound('Visit not found');
    return visit;
  }

  static async updateVisit(id: string, input: UpdateVisitInput) {
    const visit = await prisma.visit.findUnique({ where: { id } });
    if (!visit) throw ApiError.notFound('Visit not found');

    return prisma.visit.update({
      where: { id },
      data: {
        ...input,
        dueAmount: input.dueAmount !== undefined ? (input.dueAmount !== null ? new Prisma.Decimal(input.dueAmount) : null) : undefined,
        collected: input.collected !== undefined ? (input.collected !== null ? new Prisma.Decimal(input.collected) : null) : undefined,
      },
    });
  }
}
