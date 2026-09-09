import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

export class InstallmentController {
  static async getInstallments(req: Request, res: Response, next: NextFunction) {
    try {
      const loanId = req.query.loanId as string | undefined;
      const status = req.query.status as string | undefined;
      const dueDate = req.query.dueDate as string | undefined;

      const where: any = {};
      if (loanId) where.loanId = loanId;
      if (status) where.status = status;
      if (dueDate) where.dueDate = dueDate;

      const installments = await prisma.installment.findMany({
        where,
        take: 1000,
        orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
        include: {
          loan: {
            select: {
              id: true,
              loanNumber: true,
              customer: { select: { id: true, fullName: true, mobile: true, customerCode: true } },
            },
          },
        },
      });

      return sendSuccess(res, installments);
    } catch (err) {
      next(err);
    }
  }

  static async getLoanInstallments(req: Request, res: Response, next: NextFunction) {
    try {
      const installments = await prisma.installment.findMany({
        where: { loanId: req.params.loanId },
        orderBy: { installmentNumber: 'asc' },
      });
      return sendSuccess(res, installments);
    } catch (err) {
      next(err);
    }
  }

  static async getInstallmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const installment = await prisma.installment.findUnique({
        where: { id: req.params.id },
        include: {
          loan: {
            include: {
              customer: { select: { id: true, fullName: true, mobile: true, customerCode: true } },
            },
          },
        },
      });

      if (!installment) {
        throw ApiError.notFound('Installment not found');
      }

      return sendSuccess(res, installment);
    } catch (err) {
      next(err);
    }
  }
}
