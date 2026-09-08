import { Request, Response, NextFunction } from 'express';
import { RouteService } from '../services/routes/route.service';
import { sendSuccess, sendCreated } from '../utils/apiResponse';

export class RouteController {
  static async createRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const route = await RouteService.createRoute(req.body);
      return sendCreated(res, route, 'Route stop scheduled successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getRoutes(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await RouteService.getRoutes(req.query as any);
      return sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getRouteById(req: Request, res: Response, next: NextFunction) {
    try {
      const route = await RouteService.getRouteById(req.params.id);
      return sendSuccess(res, route);
    } catch (err) {
      next(err);
    }
  }

  static async updateRoute(req: Request, res: Response, next: NextFunction) {
    try {
      const route = await RouteService.updateRoute(req.params.id, req.body);
      return sendSuccess(res, route, 'Route stop updated successfully');
    } catch (err) {
      next(err);
    }
  }
}
