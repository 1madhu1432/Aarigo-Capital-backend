import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLog.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', AuditLogController.getAuditLogs);
router.post('/', AuditLogController.createAuditLog);

export default router;
