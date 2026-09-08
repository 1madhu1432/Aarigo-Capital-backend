import {
  calculateFlatInterest,
  calculateReducingEMI,
  generateDueDates,
  computeLoanSchedule,
  computeEarlyClosure,
  computeLateFee,
} from '../../src/domain/loan/loanCalculation';
import { allocatePayment } from '../../src/domain/payment/paymentAllocation';

describe('LoanCalculation Domain Tests', () => {
  describe('Flat Interest Calculation', () => {
    it('should compute flat interest correctly for 12 months at 12% on 10,000', () => {
      const result = calculateFlatInterest(10000, 12, 12, 'MONTHLY');
      // 10000 * 0.12 * 1 year = 1200 interest, total 11200, EMI = 933.33 -> 933
      expect(result.totalInterest).toBe(1200);
      expect(result.totalPayable).toBe(11200);
      expect(result.emiAmount).toBe(933);
    });

    it('should compute daily flat interest correctly', () => {
      // 100 days at 18% on 50,000
      const result = calculateFlatInterest(50000, 18, 100, 'DAILY');
      expect(result.totalInterest).toBeGreaterThan(0);
      expect(result.totalPayable).toBe(50000 + result.totalInterest);
      expect(result.emiAmount).toBeGreaterThan(0);
    });
  });

  describe('Reducing Balance Calculation', () => {
    it('should compute standard reducing balance EMI', () => {
      // 100,000 at 12% for 12 months -> EMI ~8885
      const emi = calculateReducingEMI(100000, 12, 12, 'MONTHLY');
      expect(emi).toBe(8885);
    });
  });

  describe('Loan Schedule Generation', () => {
    it('should generate exact number of installments and absorb rounding', () => {
      const result = computeLoanSchedule({
        principal: 10000,
        annualRate: 12,
        interestType: 'FLAT',
        tenure: 12,
        frequency: 'MONTHLY',
        startDate: '2026-01-01',
      });

      expect(result.schedule.length).toBe(12);
      const sumPrincipal = result.schedule.reduce((s, i) => s + i.principalAmount, 0);
      const sumInterest = result.schedule.reduce((s, i) => s + i.interestAmount, 0);
      const sumTotal = result.schedule.reduce((s, i) => s + i.totalAmount, 0);

      expect(Math.round(sumPrincipal)).toBe(10000);
      expect(Math.round(sumInterest)).toBe(result.totalInterest);
      expect(Math.round(sumTotal)).toBe(result.totalPayable);
    });
  });

  describe('Late Fee Calculation', () => {
    it('should return 0 if overdue days are within grace period', () => {
      const fee = computeLateFee(2, 3, 20);
      expect(fee).toBe(0);
    });

    it('should charge per-day fee for days exceeding grace period', () => {
      // 5 days overdue with 3 days grace = 2 chargeable days * 20 = 40
      const fee = computeLateFee(5, 3, 20);
      expect(fee).toBe(40);
    });
  });

  describe('Payment Allocation Service', () => {
    it('should allocate exact payment to the first installment', () => {
      const installments = [
        {
          id: 'inst-1',
          installmentNumber: 1,
          dueDate: '2026-02-01',
          principalAmount: 800,
          interestAmount: 200,
          totalAmount: 1000,
          paidAmount: 0,
          outstandingAmount: 1000,
          status: 'PENDING' as const,
        },
        {
          id: 'inst-2',
          installmentNumber: 2,
          dueDate: '2026-03-01',
          principalAmount: 800,
          interestAmount: 200,
          totalAmount: 1000,
          paidAmount: 0,
          outstandingAmount: 1000,
          status: 'PENDING' as const,
        },
      ];

      const result = allocatePayment(installments, 1000, '2026-02-01');
      expect(result.allocations.length).toBe(1);
      expect(result.allocations[0].newStatus).toBe('PAID');
      expect(result.allocations[0].newPaidAmount).toBe(1000);
      expect(result.allocations[0].newOutstandingAmount).toBe(0);
      expect(result.remainingExcess).toBe(0);
    });

    it('should handle partial payment correctly', () => {
      const installments = [
        {
          id: 'inst-1',
          installmentNumber: 1,
          dueDate: '2026-02-01',
          principalAmount: 800,
          interestAmount: 200,
          totalAmount: 1000,
          paidAmount: 0,
          outstandingAmount: 1000,
          status: 'PENDING' as const,
        },
      ];

      const result = allocatePayment(installments, 400, '2026-02-01');
      expect(result.allocations.length).toBe(1);
      expect(result.allocations[0].newStatus).toBe('PARTIAL');
      expect(result.allocations[0].newPaidAmount).toBe(400);
      expect(result.allocations[0].newOutstandingAmount).toBe(600);
    });

    it('should cascade excess payment to next installments', () => {
      const installments = [
        {
          id: 'inst-1',
          installmentNumber: 1,
          dueDate: '2026-02-01',
          principalAmount: 800,
          interestAmount: 200,
          totalAmount: 1000,
          paidAmount: 0,
          outstandingAmount: 1000,
          status: 'PENDING' as const,
        },
        {
          id: 'inst-2',
          installmentNumber: 2,
          dueDate: '2026-03-01',
          principalAmount: 800,
          interestAmount: 200,
          totalAmount: 1000,
          paidAmount: 0,
          outstandingAmount: 1000,
          status: 'PENDING' as const,
        },
      ];

      const result = allocatePayment(installments, 1500, '2026-02-01');
      expect(result.allocations.length).toBe(2);
      expect(result.allocations[0].newStatus).toBe('PAID');
      expect(result.allocations[0].newPaidAmount).toBe(1000);
      expect(result.allocations[1].newStatus).toBe('PARTIAL');
      expect(result.allocations[1].newPaidAmount).toBe(500);
      expect(result.allocations[1].newOutstandingAmount).toBe(500);
    });
  });
});
