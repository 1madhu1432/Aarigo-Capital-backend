import { prisma } from '../../src/lib/prisma';
import { CustomerService } from '../../src/services/customers/customer.service';
import { LoanService } from '../../src/services/loans/loan.service';
import { PaymentService } from '../../src/services/payments/payment.service';

describe('Real Database Integration Tests (MySQL)', () => {
  let createdCustomerId: string;
  let createdLoanId: string;
  const testMobile = '9999912345';

  beforeAll(async () => {
    // Clean up any previous test residue for this mobile
    const existing = await prisma.customer.findUnique({
      where: { mobile: testMobile },
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
  });

  afterAll(async () => {
    // Cleanup created test records
    if (createdCustomerId) {
      const loans = await prisma.loan.findMany({ where: { customerId: createdCustomerId } });
      for (const loan of loans) {
        await prisma.collection.deleteMany({ where: { loanId: loan.id } });
        await prisma.visit.deleteMany({ where: { loanId: loan.id } });
        await prisma.receipt.deleteMany({ where: { payment: { loanId: loan.id } } });
        await prisma.payment.deleteMany({ where: { loanId: loan.id } });
        await prisma.installment.deleteMany({ where: { loanId: loan.id } });
      }
      await prisma.loan.deleteMany({ where: { customerId: createdCustomerId } });
      await prisma.customer.delete({ where: { id: createdCustomerId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it('should persist a new customer into MySQL and generate unique customerCode', async () => {
    const customer = await CustomerService.createCustomer({
      fullName: 'Integration Test Customer',
      mobile: testMobile,
      gender: 'MALE',
      address: '123 Test Street, Financial District',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      occupation: 'Retail Merchant',
      monthlyIncome: 45000,
    });

    expect(customer).toBeDefined();
    expect(customer.id).toBeDefined();
    expect(customer.customerCode).toMatch(/^CUS-\d+$/);
    expect(customer.fullName).toBe('Integration Test Customer');
    createdCustomerId = customer.id;

    // Verify directly from MySQL via Prisma raw query
    const dbCustomer = await prisma.customer.findUnique({
      where: { id: customer.id },
    });
    expect(dbCustomer).not.toBeNull();
    expect(dbCustomer?.mobile).toBe(testMobile);
  });

  it('should prevent duplicate customer mobile registration with DB constraint check', async () => {
    await expect(
      CustomerService.createCustomer({
        fullName: 'Duplicate Customer',
        mobile: testMobile,
        gender: 'MALE',
        address: '456 Another St',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      })
    ).rejects.toThrow(/already exists/i);
  });

  it('should create a loan and persist all generated installments with correct relations', async () => {
    const loan = await LoanService.createLoan({
      customerId: createdCustomerId,
      principalAmount: 20000,
      interestRate: 12,
      interestType: 'FLAT',
      tenure: 10,
      frequency: 'DAILY',
      startDate: '2026-09-08',
      processingFee: 0,
      purpose: 'Business expansion inventory',
    });

    expect(loan).toBeDefined();
    expect(loan.id).toBeDefined();
    expect(loan.loanNumber).toMatch(/^LN-\d+$/);
    expect(Number(loan.principalAmount)).toBe(20000);
    expect(loan.status).toBe('ACTIVE');
    createdLoanId = loan.id;

    // Verify installments persisted in MySQL
    const installments = await prisma.installment.findMany({
      where: { loanId: loan.id },
      orderBy: { installmentNumber: 'asc' },
    });

    expect(installments.length).toBe(10);
    expect(installments[0].installmentNumber).toBe(1);
    expect(installments[9].installmentNumber).toBe(10);

    // Verify sum of installment principals equals loan principal
    const totalPrincipal = installments.reduce((acc, inst) => acc + Number(inst.principalAmount), 0);
    expect(Math.round(totalPrincipal)).toBe(20000);
  });

  it('should persist a partial payment, update installment balances, and generate a receipt', async () => {
    const paymentResult = await PaymentService.recordPayment({
      loanId: createdLoanId,
      amount: 1000,
      paymentMethod: 'CASH',
      paymentDate: '2026-09-08',
      isEarlyClosure: false,
      notes: 'First installment partial payment test',
    });

    expect(paymentResult).toBeDefined();
    expect(paymentResult.payment).toBeDefined();
    expect(Number(paymentResult.payment.amount)).toBe(1000);
    expect(paymentResult.receipt).toBeDefined();
    expect(paymentResult.receipt.receiptNumber).toMatch(/^RCP-\d{4}-\d+$/);

    // Verify payment record in MySQL
    const dbPayment = await prisma.payment.findUnique({
      where: { id: paymentResult.payment.id },
    });
    expect(dbPayment).not.toBeNull();
    expect(Number(dbPayment?.amount)).toBe(1000);

    // Verify first installment in MySQL has received allocation
    const firstInst = await prisma.installment.findFirst({
      where: { loanId: createdLoanId, installmentNumber: 1 },
    });
    expect(firstInst).not.toBeNull();
    expect(Number(firstInst?.paidAmount)).toBeGreaterThan(0);
  });

  it('should update loan outstanding balance in MySQL after payments', async () => {
    const dbLoan = await prisma.loan.findUnique({
      where: { id: createdLoanId },
    });

    expect(dbLoan).not.toBeNull();
    expect(Number(dbLoan?.paidAmount)).toBe(1000);
    expect(Number(dbLoan?.outstandingAmount)).toBe(Number(dbLoan?.totalPayable) - 1000);
  });
});
