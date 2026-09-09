import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';

export class InstallmentController {
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
