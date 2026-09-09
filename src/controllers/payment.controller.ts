import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payments/payment.service';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class PaymentController {
  static async recordPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await PaymentService.recordPayment(req.body, req.user?.id);
      return sendCreated(res, result, 'Payment recorded and installments allocated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await PaymentService.getPayments(req.query as any);
      return sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getPaymentById(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await PaymentService.getPaymentById(req.params.id);
      return sendSuccess(res, payment);
    } catch (err) {
      next(err);
    }
  }
}
