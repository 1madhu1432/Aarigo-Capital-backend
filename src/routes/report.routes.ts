import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/loans', ReportController.getLoans);
router.get('/payments', ReportController.getPayments);
router.get('/collections', ReportController.getCollections);
router.get('/overdue', ReportController.getOverdue);
router.get('/daily-collections', ReportController.getDailyCollections);

export default router;
