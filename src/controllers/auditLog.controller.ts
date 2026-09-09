import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from '../services/auditLog/auditLog.service';
import { sendSuccess } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class AuditLogController {
  static async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const entityType = req.query.entityType as string | undefined;
      const userId = req.query.userId as string | undefined;

      const result = await AuditLogService.getAuditLogs({ page, limit, entityType, userId });
      return sendSuccess(res, result.items, 'Audit logs fetched successfully', 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async createAuditLog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const log = await AuditLogService.createAuditLog({
        ...req.body,
        userId: userId || req.body.userId,
        ipAddress: req.body.ipAddress || ipAddress,
      });
      return sendSuccess(res, log, 'Audit log recorded', 201);
    } catch (err) {
      next(err);
    }
  }
}
