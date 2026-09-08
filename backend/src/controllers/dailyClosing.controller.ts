import { Request, Response, NextFunction } from 'express';
import { DailyClosingService } from '../services/dailyClosing/dailyClosing.service';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class DailyClosingController {
  static async performClosing(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const closing = await DailyClosingService.performClosing(req.body, req.user?.id);
      return sendCreated(res, closing, 'Daily closing completed successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getDailyClosings(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await DailyClosingService.getDailyClosings(req.query as any);
      return sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getDailyClosingById(req: Request, res: Response, next: NextFunction) {
    try {
      const closing = await DailyClosingService.getDailyClosingById(req.params.id);
      return sendSuccess(res, closing);
    } catch (err) {
      next(err);
    }
  }
}
