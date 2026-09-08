import { Request, Response, NextFunction } from 'express';
import { VisitService } from '../services/visits/visit.service';
import { sendSuccess, sendCreated } from '../utils/apiResponse';

export class VisitController {
  static async createVisit(req: Request, res: Response, next: NextFunction) {
    try {
      const visit = await VisitService.createVisit(req.body);
      return sendCreated(res, visit, 'Visit scheduled successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getVisits(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await VisitService.getVisits(req.query as any);
      return sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getVisitById(req: Request, res: Response, next: NextFunction) {
    try {
      const visit = await VisitService.getVisitById(req.params.id);
      return sendSuccess(res, visit);
    } catch (err) {
      next(err);
    }
  }

  static async updateVisit(req: Request, res: Response, next: NextFunction) {
    try {
      const visit = await VisitService.updateVisit(req.params.id, req.body);
      return sendSuccess(res, visit, 'Visit updated successfully');
    } catch (err) {
      next(err);
    }
  }
}
