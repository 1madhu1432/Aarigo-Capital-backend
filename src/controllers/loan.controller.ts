import { Request, Response, NextFunction } from 'express';
import { LoanService } from '../services/loans/loan.service';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class LoanController {
  static async createLoan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const loan = await LoanService.createLoan(req.body, req.user?.id);
      return sendCreated(res, loan, 'Loan created and amortization schedule generated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getLoans(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await LoanService.getLoans(req.query as any);
      return sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getLoanById(req: Request, res: Response, next: NextFunction) {
    try {
      const loan = await LoanService.getLoanById(req.params.id);
      return sendSuccess(res, loan);
    } catch (err) {
      next(err);
    }
  }

  static async getLoanSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await LoanService.getLoanSummary(req.params.id);
      return sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  }

  static async updateLoan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const updated = await LoanService.updateLoan(req.params.id, req.body, req.user?.id);
      return sendSuccess(res, updated, 'Loan updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getEarlyClosureQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const quote = await LoanService.earlyClosureQuote(req.params.id, req.body);
      return sendSuccess(res, quote);
    } catch (err) {
      next(err);
    }
  }
}
