import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/summary', DashboardController.getSummary);
router.get('/stats', DashboardController.getSummary);
router.get('/', DashboardController.getSummary);

export default router;
