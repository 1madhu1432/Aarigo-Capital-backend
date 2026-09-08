import { Request, Response, NextFunction } from 'express';
import { CollectionService } from '../services/collections/collection.service';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class CollectionController {
  static async recordCollection(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await CollectionService.recordCollection(req.body, req.user?.id);
      return sendCreated(res, result, 'Collection recorded successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getCollections(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CollectionService.getCollections(req.query as any);
      return sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getCollectionById(req: Request, res: Response, next: NextFunction) {
    try {
      const collection = await CollectionService.getCollectionById(req.params.id);
      return sendSuccess(res, collection);
    } catch (err) {
      next(err);
    }
  }
}
