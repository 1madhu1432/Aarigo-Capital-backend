import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { CreateLoanProductInput, UpdateLoanProductInput } from '../../validators/loanProduct.validator';
import { Prisma } from '@prisma/client';

export class LoanProductService {
  static async createProduct(input: CreateLoanProductInput) {
    const existing = await prisma.loanProduct.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      throw ApiError.conflict(`Loan product with name "${input.name}" already exists`);
    }

    return prisma.loanProduct.create({
      data: {
        name: input.name,
        description: input.description,
        minAmount: new Prisma.Decimal(input.minAmount),
        maxAmount: new Prisma.Decimal(input.maxAmount),
        interestRate: new Prisma.Decimal(input.interestRate),
        interestType: input.interestType,
        defaultTenure: input.defaultTenure,
        repaymentFrequency: input.repaymentFrequency,
        processingFee: new Prisma.Decimal(input.processingFee),
        isActive: input.isActive ?? true,
      },
    });
  }

  static async getProducts(activeOnly: boolean = false) {
    const where = activeOnly ? { isActive: true } : {};
    return prisma.loanProduct.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { loans: true } },
      },
    });
  }

  static async getProductById(id: string) {
    const product = await prisma.loanProduct.findUnique({
      where: { id },
      include: {
        _count: { select: { loans: true } },
      },
    });

    if (!product) {
      throw ApiError.notFound('Loan product not found');
    }

    return product;
  }

  static async updateProduct(id: string, input: UpdateLoanProductInput) {
    const existing = await prisma.loanProduct.findUnique({ where: { id } });
    if (!existing) {
      throw ApiError.notFound('Loan product not found');
    }

    if (input.name && input.name !== existing.name) {
      const nameExists = await prisma.loanProduct.findUnique({
        where: { name: input.name },
      });
      if (nameExists) {
        throw ApiError.conflict(`Loan product with name "${input.name}" already exists`);
      }
    }

    return prisma.loanProduct.update({
      where: { id },
      data: {
        name: input.name,
        description: input.description,
        minAmount: input.minAmount !== undefined ? new Prisma.Decimal(input.minAmount) : undefined,
        maxAmount: input.maxAmount !== undefined ? new Prisma.Decimal(input.maxAmount) : undefined,
        interestRate: input.interestRate !== undefined ? new Prisma.Decimal(input.interestRate) : undefined,
        interestType: input.interestType,
        defaultTenure: input.defaultTenure,
        repaymentFrequency: input.repaymentFrequency,
        processingFee: input.processingFee !== undefined ? new Prisma.Decimal(input.processingFee) : undefined,
        isActive: input.isActive,
      },
    });
  }

  static async deleteProduct(id: string) {
    const product = await prisma.loanProduct.findUnique({
      where: { id },
      include: {
        _count: { select: { loans: true } },
      },
    });

    if (!product) {
      throw ApiError.notFound('Loan product not found');
    }

    if (product._count.loans > 0) {
      // Soft-delete if in use
      return prisma.loanProduct.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return prisma.loanProduct.delete({
      where: { id },
    });
  }
}
