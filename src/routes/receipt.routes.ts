import { Router } from 'express';
import { ReceiptController } from '../controllers/receipt.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', ReceiptController.getReceipts);
router.get('/:id', ReceiptController.getReceiptById);
router.get('/:id/download', ReceiptController.downloadReceiptPdf);

export default router;
