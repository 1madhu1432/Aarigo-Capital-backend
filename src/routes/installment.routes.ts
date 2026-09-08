import { Router } from 'express';
import { InstallmentController } from '../controllers/installment.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/:id', InstallmentController.getInstallmentById);

export default router;
