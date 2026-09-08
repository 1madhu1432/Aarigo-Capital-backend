import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard/dashboard.service';
import { sendSuccess } from '../utils/apiResponse';

export class DashboardController {
  static async getSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await DashboardService.getSummary();
      return sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  }
}
