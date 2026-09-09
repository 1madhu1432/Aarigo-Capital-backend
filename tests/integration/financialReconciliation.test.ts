import { prisma } from '../../src/lib/prisma';
import { CustomerService } from '../../src/services/customers/customer.service';
import { LoanService } from '../../src/services/loans/loan.service';
import { PaymentService } from '../../src/services/payments/payment.service';
import { computeLoanSchedule } from '../../src/domain/loan/loanCalculation';
import { allocatePayment } from '../../src/domain/payment/paymentAllocation';

describe('Financial Reconciliation Tests (Mathematical & Live Database Verification)', () => {
  let customerId: string;
  const reconMobile = '9999954321';

  beforeAll(async () => {
    // Cleanup any previous residue
    const existing = await prisma.customer.findUnique({
      where: { mobile: reconMobile },
      include: { loans: { include: { installments: true, payments: true } } },
    });

    if (existing) {
      for (const loan of existing.loans) {
        await prisma.collection.deleteMany({ where: { loanId: loan.id } });
        await prisma.visit.deleteMany({ where: { loanId: loan.id } });
        await prisma.receipt.deleteMany({ where: { payment: { loanId: loan.id } } });
        await prisma.payment.deleteMany({ where: { loanId: loan.id } });
        await prisma.installment.deleteMany({ where: { loanId: loan.id } });
      }
      await prisma.loan.deleteMany({ where: { customerId: existing.id } });
      await prisma.customer.delete({ where: { id: existing.id } });
    }

    const cust = await CustomerService.createCustomer({
      fullName: 'Financial Reconciliation Test Customer',
      mobile: reconMobile,
      gender: 'FEMALE',
      address: '456 Reserve Bank Avenue',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
    });
    customerId = cust.id;
  });

  afterAll(async () => {
    if (customerId) {
      const loans = await prisma.loan.findMany({ where: { customerId } });
      for (const loan of loans) {
        await prisma.collection.deleteMany({ where: { loanId: loan.id } });
        await prisma.visit.deleteMany({ where: { loanId: loan.id } });
        await prisma.receipt.deleteMany({ where: { payment: { loanId: loan.id } } });
        await prisma.payment.deleteMany({ where: { loanId: loan.id } });
        await prisma.installment.deleteMany({ where: { loanId: loan.id } });
      }
      await prisma.loan.deleteMany({ where: { customerId } });
      await prisma.customer.delete({ where: { id: customerId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe('1. Flat Interest Calculation Reconciliation', () => {
    it('should reconcile Flat Interest: Principal ₹100,000, 12% p.a., 12 months Monthly', () => {
      // Flat interest = 100,000 * 0.12 * 1 = 12,000
      // Total amount = 112,000
      // EMI = 112,000 / 12 = 9,333.33
      const schedule = computeLoanSchedule({
        principal: 100000,
        interestRate: 12,
        interestType: 'FLAT',
        tenure: 12,
        frequency: 'MONTHLY',
        startDate: '2026-09-08',
      });

      expect(schedule.totalPayable - schedule.totalInterest).toBe(100000);
      expect(schedule.totalInterest).toBe(12000);
      expect(schedule.totalPayable).toBe(112000);
      expect(schedule.installments.length).toBe(12);

      // Verify exact sum of all installment amounts equals total amount (absorbing rounding)
      const sumInstallments = schedule.installments.reduce((sum, inst) => sum + inst.totalAmount, 0);
      expect(Math.round(sumInstallments * 100) / 100).toBe(112000);
    });

    it('should reconcile Flat Interest: Daily frequency (₹30,000, 18% p.a., 30 days)', () => {
      // Interest = 30,000 * 0.18 * (30 / 365) = 443.835...
      const schedule = computeLoanSchedule({
        principal: 30000,
        interestRate: 18,
        interestType: 'FLAT',
        tenure: 30,
        frequency: 'DAILY',
        startDate: '2026-09-08',
      });

      expect(schedule.installments.length).toBe(30);
      const sumPrincipal = schedule.installments.reduce((sum, inst) => sum + inst.principalAmount, 0);
      expect(Math.round(sumPrincipal)).toBe(30000);
      expect(schedule.totalPayable).toBeGreaterThan(30000);
    });
  });

  describe('2. Reducing Balance Calculation Reconciliation', () => {
    it('should reconcile Reducing Balance: Principal ₹50,000, 15% p.a., 6 months Monthly', () => {
      const schedule = computeLoanSchedule({
        principal: 50000,
        interestRate: 15,
        interestType: 'REDUCING',
        tenure: 6,
        frequency: 'MONTHLY',
        startDate: '2026-09-08',
      });

      expect(schedule.installments.length).toBe(6);
      expect(schedule.totalPayable - schedule.totalInterest).toBe(50000);

      // In reducing balance, interest decreases each month as principal amortizes
      const interestInst1 = schedule.installments[0].interestAmount;
      const interestInst6 = schedule.installments[5].interestAmount;
      expect(interestInst1).toBeGreaterThan(interestInst6);
    });
  });

  describe('3. Multi-Frequency Schedule Reconciliation (Daily, Weekly, Monthly)', () => {
    it('should correctly reconcile Weekly schedule (10 weeks)', () => {
      const schedule = computeLoanSchedule({
        principal: 20000,
        interestRate: 14,
        interestType: 'FLAT',
        tenure: 10,
        frequency: 'WEEKLY',
        startDate: '2026-09-08',
      });

      expect(schedule.installments.length).toBe(10);
      const sumPrincipal = schedule.installments.reduce((sum, inst) => sum + inst.principalAmount, 0);
      expect(Math.round(sumPrincipal)).toBe(20000);
    });
  });

  describe('4. Payment Allocation Waterfall (Overdue, Current, Advance)', () => {
    it('should allocate partial payment strictly to active installment', () => {
      const mockInstallments = [
        {
          id: 'inst-1',
          installmentNumber: 1,
          dueDate: '2026-09-08',
          principalAmount: 1000,
          interestAmount: 200,
          totalAmount: 1200,
          paidAmount: 0,
          principalPaid: 0,
          interestPaid: 0,
          lateFee: 0,
          lateFeePaid: 0,
          status: 'PENDING' as const,
        },
      ];

      // Payment of ₹150
      const allocation1 = allocatePayment(150, mockInstallments, '2026-09-08');
      expect(allocation1.allocations[0].allocatedAmount).toBe(150);
      expect(allocation1.allocations[0].isFullyPaid).toBe(false);
      expect(allocation1.excess).toBe(0);

      // Payment of ₹500
      const allocation2 = allocatePayment(500, mockInstallments, '2026-09-08');
      expect(allocation2.allocations[0].allocatedAmount).toBe(500);
      expect(allocation2.allocations[0].isFullyPaid).toBe(false);

      // Full payment of ₹1200
      const allocationFull = allocatePayment(1200, mockInstallments, '2026-09-08');
      expect(allocationFull.allocations[0].allocatedAmount).toBe(1200);
      expect(allocationFull.allocations[0].isFullyPaid).toBe(true);
    });

    it('should cascade excess payments to subsequent installments as Advance', () => {
      const mockInstallments = [
        {
          id: 'inst-1',
          installmentNumber: 1,
          dueDate: '2026-09-08',
          principalAmount: 1000,
          interestAmount: 200,
          totalAmount: 1200,
          paidAmount: 0,
          principalPaid: 0,
          interestPaid: 0,
          lateFee: 0,
          lateFeePaid: 0,
          status: 'PENDING' as const,
        },
        {
          id: 'inst-2',
          installmentNumber: 2,
          dueDate: '2026-09-15',
          principalAmount: 1000,
          interestAmount: 200,
          totalAmount: 1200,
          paidAmount: 0,
          principalPaid: 0,
          interestPaid: 0,
          lateFee: 0,
          lateFeePaid: 0,
          status: 'PENDING' as const,
        },
      ];

      // Payment of ₹2000 (covers inst 1 ₹1200 + inst 2 ₹800)
      const allocation = allocatePayment(2000, mockInstallments, '2026-09-08');
      expect(allocation.allocations[0].isFullyPaid).toBe(true);
      expect(allocation.allocations[0].allocatedAmount).toBe(1200);
      expect(allocation.allocations[1].isFullyPaid).toBe(false);
      expect(allocation.allocations[1].allocatedAmount).toBe(800);
      expect(allocation.excess).toBe(0);
    });
  });

  describe('5. Live End-to-End Financial Reconciliation in MySQL', () => {
    it('should create loan in MySQL and reconcile full payment cycle to zero balance', async () => {
      // 1. Create a 3-day microloan
      const loan = await LoanService.createLoan({
        customerId,
        principalAmount: 3000,
        interestRate: 10,
        interestType: 'FLAT',
        tenure: 3,
        frequency: 'DAILY',
        startDate: '2026-09-08',
        processingFee: 0,
      });

      const totalAmount = Number(loan.totalPayable);
      expect(totalAmount).toBeGreaterThan(3000);

      // 2. Pay first installment partially
      const installmentsBefore = await prisma.installment.findMany({
        where: { loanId: loan.id },
        orderBy: { installmentNumber: 'asc' },
      });
      const emi = Number(installmentsBefore[0].totalAmount);

      const pay1 = await PaymentService.recordPayment({
        loanId: loan.id,
        amount: Math.floor(emi / 2),
        paymentMethod: 'UPI',
        paymentDate: '2026-09-08',
        isEarlyClosure: false,
      });
      expect(pay1.payment.id).toBeDefined();

      // 3. Pay remaining balance in full
      const loanAfterPay1 = await prisma.loan.findUnique({ where: { id: loan.id } });
      const outstanding = Number(loanAfterPay1?.outstandingAmount);

      const pay2 = await PaymentService.recordPayment({
        loanId: loan.id,
        amount: outstanding,
        paymentMethod: 'BANK_TRANSFER',
        paymentDate: '2026-09-09',
        isEarlyClosure: false,
      });
      expect(pay2.payment.id).toBeDefined();

      // 4. Verify loan is fully closed and outstanding is exactly 0
      const finalLoan = await prisma.loan.findUnique({ where: { id: loan.id } });
      expect(Number(finalLoan?.outstandingAmount)).toBe(0);
      expect(Number(finalLoan?.paidAmount)).toBe(totalAmount);
      expect(finalLoan?.status).toBe('CLOSED');
    });
  });
});
