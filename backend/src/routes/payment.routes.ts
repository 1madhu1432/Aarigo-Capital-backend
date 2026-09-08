import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { createPaymentSchema, paymentQuerySchema } from '../validators/payment.validator';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createPaymentSchema), PaymentController.recordPayment);
router.get('/', validate(paymentQuerySchema), PaymentController.getPayments);
router.get('/:id', PaymentController.getPaymentById);

export default router;
