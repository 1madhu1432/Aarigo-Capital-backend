import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  createCustomerSchema,
  updateCustomerSchema,
  customerQuerySchema,
} from '../validators/customer.validator';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();

// Protect all customer routes
router.use(authMiddleware);

router.post('/', validate(createCustomerSchema), CustomerController.createCustomer);
router.get('/', validate(customerQuerySchema), CustomerController.getCustomers);
router.get('/:id', CustomerController.getCustomerById);
router.put('/:id', validate(updateCustomerSchema), CustomerController.updateCustomer);
router.delete('/:id', CustomerController.deleteCustomer);

router.get('/:id/loans', CustomerController.getCustomerLoans);

// Customer documents
router.get('/:id/documents', CustomerController.getCustomerDocuments);
router.post(
  '/:id/documents',
  uploadMiddleware.single('file'),
  CustomerController.uploadCustomerDocument
);
router.delete('/:id/documents/:documentId', CustomerController.deleteCustomerDocument);

export default router;
