import { Router } from 'express';
import { LoanProductController } from '../controllers/loanProduct.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createLoanProductSchema,
  updateLoanProductSchema,
} from '../validators/loanProduct.validator';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createLoanProductSchema), LoanProductController.createProduct);
router.get('/', LoanProductController.getProducts);
router.get('/:id', LoanProductController.getProductById);
router.put('/:id', validate(updateLoanProductSchema), LoanProductController.updateProduct);
router.delete('/:id', LoanProductController.deleteProduct);

export default router;
