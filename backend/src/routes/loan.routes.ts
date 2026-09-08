import { Router } from 'express';
import { LoanController } from '../controllers/loan.controller';
import { InstallmentController } from '../controllers/installment.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createLoanSchema,
  updateLoanSchema,
  loanQuerySchema,
  earlyClosureSchema,
} from '../validators/loan.validator';

const router = Router();

router.use(authMiddleware);

router.post('/', validate(createLoanSchema), LoanController.createLoan);
router.get('/', validate(loanQuerySchema), LoanController.getLoans);
router.get('/:id', LoanController.getLoanById);
router.put('/:id', validate(updateLoanSchema), LoanController.updateLoan);
router.get('/:id/summary', LoanController.getLoanSummary);
router.post('/:id/early-closure-quote', validate(earlyClosureSchema), LoanController.getEarlyClosureQuote);

// Installments for this loan
router.get('/:loanId/installments', InstallmentController.getLoanInstallments);

export default router;
