import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { CreateRouteInput, UpdateRouteInput, RouteQueryParams } from '../../validators/route.validator';
import { Prisma } from '@prisma/client';

export class RouteService {
  static async createRoute(input: CreateRouteInput) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw ApiError.notFound('Customer not found');

    return prisma.route.create({
      data: {
        routeDate: input.routeDate,
        customerId: input.customerId,
        loanId: input.loanId,
        sequence: input.sequence,
        visitStatus: input.visitStatus,
        collectionStatus: input.collectionStatus,
        amountDue: input.amountDue !== undefined && input.amountDue !== null ? new Prisma.Decimal(input.amountDue) : null,
        amountCollected: input.amountCollected !== undefined && input.amountCollected !== null ? new Prisma.Decimal(input.amountCollected) : null,
        notes: input.notes,
      },
    });
  }

  static async getRoutes(params: RouteQueryParams) {
    const { skip, take, page, limit } = parsePagination(params);

    const where: any = {};
    if (params.routeDate) where.routeDate = params.routeDate;
    if (params.customerId) where.customerId = params.customerId;
    if (params.visitStatus) where.visitStatus = params.visitStatus;

    const [total, items] = await Promise.all([
      prisma.route.count({ where }),
      prisma.route.findMany({
        where,
        skip,
        take,
        orderBy: [{ routeDate: 'desc' }, { sequence: 'asc' }],
        include: {
          customer: {
            select: { id: true, customerCode: true, fullName: true, mobile: true, address: true, city: true },
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

  static async getRouteById(id: string) {
    const route = await prisma.route.findUnique({
      where: { id },
      include: { customer: true, loan: true },
    });

    if (!route) throw ApiError.notFound('Route stop not found');
    return route;
  }

  static async updateRoute(id: string, input: UpdateRouteInput) {
    const route = await prisma.route.findUnique({ where: { id } });
    if (!route) throw ApiError.notFound('Route stop not found');

    return prisma.route.update({
      where: { id },
      data: {
        ...input,
        amountDue: input.amountDue !== undefined ? (input.amountDue !== null ? new Prisma.Decimal(input.amountDue) : null) : undefined,
        amountCollected: input.amountCollected !== undefined ? (input.amountCollected !== null ? new Prisma.Decimal(input.amountCollected) : null) : undefined,
      },
    });
  }
}
