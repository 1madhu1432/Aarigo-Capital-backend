import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import { CreateCustomerInput, UpdateCustomerInput, CustomerQueryParams } from '../../validators/customer.validator';
import { Prisma } from '@prisma/client';

export class CustomerService {
  private static async generateCustomerCode(): Promise<string> {
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { customerCode: 'desc' },
      select: { customerCode: true },
    });

    if (!lastCustomer || !lastCustomer.customerCode) {
      return 'CUS-000001';
    }

    const matches = lastCustomer.customerCode.match(/CUS-(\d+)/);
    if (!matches) {
      return 'CUS-000001';
    }

    const nextNum = parseInt(matches[1], 10) + 1;
    return `CUS-${String(nextNum).padStart(6, '0')}`;
  }

  static async createCustomer(input: CreateCustomerInput, userId?: string) {
    const existing = await prisma.customer.findUnique({
      where: { mobile: input.mobile },
    });

    if (existing) {
      throw ApiError.conflict(`Customer with mobile ${input.mobile} already exists`);
    }

    const customerCode = await this.generateCustomerCode();

    const customer = await prisma.customer.create({
      data: {
        customerCode,
        fullName: input.fullName,
        mobile: input.mobile,
        alternateMobile: input.alternateMobile,
        email: input.email,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        occupation: input.occupation,
        monthlyIncome: input.monthlyIncome ? new Prisma.Decimal(input.monthlyIncome) : null,
        kycType: input.kycType,
        kycNumber: input.kycNumber,
        kycStatus: input.kycStatus || 'PENDING',
        guarantorName: input.guarantorName,
        guarantorRelationship: input.guarantorRelationship,
        guarantorMobile: input.guarantorMobile,
        guarantorAddress: input.guarantorAddress,
        notes: input.notes,
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        customerId: customer.id,
        entityType: 'Customer',
        entityId: customer.id,
        action: 'CREATE',
        newValue: customer as any,
      },
    });

    return customer;
  }

  static async getCustomers(params: CustomerQueryParams) {
    const { skip, take, page, limit } = parsePagination(params);

    const where: Prisma.CustomerWhereInput = {};

    if (params.status) {
      where.status = params.status;
    }

    if (params.kycStatus) {
      where.kycStatus = params.kycStatus;
    }

    if (params.city) {
      where.city = { contains: params.city };
    }

    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { fullName: { contains: q } },
        { mobile: { contains: q } },
        { customerCode: { contains: q } },
        { email: { contains: q } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take,
        orderBy: {
          [params.sortBy || 'createdAt']: params.sortOrder || 'desc',
        },
        include: {
          _count: {
            select: { loans: true },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  static async getCustomerById(id: string) {
    let customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        loans: {
          orderBy: { createdAt: 'desc' },
          include: {
            loanProduct: true,
          },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        visits: {
          orderBy: { visitDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      customer = await prisma.customer.findUnique({
        where: { customerCode: id },
        include: {
          loans: {
            orderBy: { createdAt: 'desc' },
            include: {
              loanProduct: true,
            },
          },
          documents: {
            orderBy: { uploadedAt: 'desc' },
          },
          visits: {
            orderBy: { visitDate: 'desc' },
            take: 10,
          },
        },
      });
    }

    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    return customer;
  }

  static async updateCustomer(id: string, input: UpdateCustomerInput, userId?: string) {
    let existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      existing = await prisma.customer.findUnique({ where: { customerCode: id } });
    }
    if (!existing) {
      throw ApiError.notFound('Customer not found');
    }

    if (input.mobile && input.mobile !== existing.mobile) {
      const mobileExists = await prisma.customer.findUnique({
        where: { mobile: input.mobile },
      });
      if (mobileExists) {
        throw ApiError.conflict(`Mobile number ${input.mobile} is already registered`);
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...input,
        monthlyIncome: input.monthlyIncome !== undefined
          ? (input.monthlyIncome ? new Prisma.Decimal(input.monthlyIncome) : null)
          : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        customerId: id,
        entityType: 'Customer',
        entityId: id,
        action: 'UPDATE',
        oldValue: existing as any,
        newValue: updated as any,
      },
    });

    return updated;
  }

  static async deleteCustomer(id: string, userId?: string) {
    let customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        loans: {
          where: {
            status: { in: ['ACTIVE', 'OVERDUE'] },
          },
        },
      },
    });

    if (!customer) {
      customer = await prisma.customer.findUnique({
        where: { customerCode: id },
        include: {
          loans: {
            where: {
              status: { in: ['ACTIVE', 'OVERDUE'] },
            },
          },
        },
      });
    }

    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    if (customer.loans.length > 0) {
      throw ApiError.badRequest('Cannot delete customer with active or overdue loans');
    }

    // Soft delete by marking INACTIVE
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { status: 'INACTIVE' },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        customerId: id,
        entityType: 'Customer',
        entityId: id,
        action: 'DEACTIVATE',
        newValue: { status: 'INACTIVE' },
      },
    });

    return updated;
  }

  static async addDocument(customerId: string, docData: {
    documentType: any;
    documentNumber?: string;
    fileName: string;
    filePath: string;
    mimeType?: string;
    fileSizeBytes?: number;
  }) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw ApiError.notFound('Customer not found');
    }

    return prisma.customerDocument.create({
      data: {
        customerId,
        documentType: docData.documentType,
        documentNumber: docData.documentNumber,
        fileName: docData.fileName,
        filePath: docData.filePath,
        mimeType: docData.mimeType,
        fileSizeBytes: docData.fileSizeBytes,
      },
    });
  }

  static async getDocuments(customerId: string) {
    return prisma.customerDocument.findMany({
      where: { customerId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  static async deleteDocument(customerId: string, documentId: string) {
    const doc = await prisma.customerDocument.findFirst({
      where: { id: documentId, customerId },
    });

    if (!doc) {
      throw ApiError.notFound('Document not found');
    }

    return prisma.customerDocument.delete({
      where: { id: documentId },
    });
  }
}
