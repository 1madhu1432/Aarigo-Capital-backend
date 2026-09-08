import { prisma } from '../../lib/prisma';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';

export interface AuditLogQueryParams {
  page?: number;
  limit?: number;
  entityType?: string;
  userId?: string;
}

export class AuditLogService {
  static async getAuditLogs(params: AuditLogQueryParams) {
    const { skip, take, page, limit } = parsePagination(params);

    const where: any = {};
    if (params.entityType) {
      where.entityType = params.entityType;
    }
    if (params.userId) {
      where.userId = params.userId;
    }

    const [total, items] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          customer: {
            select: {
              id: true,
              customerCode: true,
              fullName: true,
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

  static async createAuditLog(data: {
    userId?: string;
    customerId?: string;
    entityType: string;
    entityId: string;
    action: string;
    reason?: string;
    ipAddress?: string;
    newValue?: any;
    oldValue?: any;
  }) {
    return prisma.auditLog.create({
      data: {
        userId: data.userId,
        customerId: data.customerId,
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        reason: data.reason,
        ipAddress: data.ipAddress,
        newValue: data.newValue,
        oldValue: data.oldValue,
      },
    });
  }
}
