import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/reports/report.service';
import { sendSuccess } from '../utils/apiResponse';

export class ReportController {
  static async getLoans(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReportService.getLoanReport(req.query as any);
      return sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReportService.getPaymentReport(req.query as any);
      return sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getCollections(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReportService.getCollectionReport(req.query as any);
      return sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getOverdue(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReportService.getOverdueReport(req.query as any);
      return sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getDailyCollections(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReportService.getDailyCollectionSummary(req.query.date as string);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}
