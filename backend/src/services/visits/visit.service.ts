import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { CreateVisitInput, UpdateVisitInput, VisitQueryParams } from '../../validators/visit.validator';
import { Prisma } from '@prisma/client';

export class VisitService {
  static async createVisit(input: CreateVisitInput) {
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { id: input.customerId },
          { customerCode: input.customerId },
        ],
      },
      include: {
        loans: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!customer) throw ApiError.notFound('Customer not found');

    let resolvedLoanId = input.loanId;
    if (resolvedLoanId) {
      const loan = await prisma.loan.findFirst({
        where: {
          OR: [
            { id: resolvedLoanId },
            { loanNumber: resolvedLoanId },
          ],
        },
      });
      if (loan) {
        resolvedLoanId = loan.id;
      } else if (customer.loans.length > 0) {
        resolvedLoanId = customer.loans[0].id;
      } else {
        throw ApiError.notFound('Loan not found');
      }
    } else {
      if (customer.loans.length > 0) {
        resolvedLoanId = customer.loans[0].id;
      } else {
        throw ApiError.badRequest('No loan associated with this customer to record a visit');
      }
    }

    return prisma.visit.create({
      data: {
        customerId: customer.id,
        loanId: resolvedLoanId,
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

    const { customerId, loanId, dueAmount, collected, ...rest } = input;
    const data: any = { ...rest };

    if (dueAmount !== undefined) {
      data.dueAmount = dueAmount !== null ? new Prisma.Decimal(dueAmount) : null;
    }
    if (collected !== undefined) {
      data.collected = collected !== null ? new Prisma.Decimal(collected) : null;
    }

    return prisma.visit.update({
      where: { id },
      data,
    });
  }
}
