import { Router } from 'express';
import authRoutes from './auth.routes';
import customerRoutes from './customer.routes';
import loanProductRoutes from './loanProduct.routes';
import loanRoutes from './loan.routes';
import installmentRoutes from './installment.routes';
import paymentRoutes from './payment.routes';
import collectionRoutes from './collection.routes';
import receiptRoutes from './receipt.routes';
import visitRoutes from './visit.routes';
import routeRoutes from './route.routes';
import reportRoutes from './report.routes';
import dashboardRoutes from './dashboard.routes';
import dailyClosingRoutes from './dailyClosing.routes';
import auditLogRoutes from './auditLog.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/loan-products', loanProductRoutes);
router.use('/loans', loanRoutes);
router.use('/installments', installmentRoutes);
router.use('/payments', paymentRoutes);
router.use('/collections', collectionRoutes);
router.use('/collection', collectionRoutes);
router.use('/receipts', receiptRoutes);
router.use('/visits', visitRoutes);
router.use('/routes', routeRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/daily-closing', dailyClosingRoutes);
router.use('/audit-logs', auditLogRoutes);

export default router;
