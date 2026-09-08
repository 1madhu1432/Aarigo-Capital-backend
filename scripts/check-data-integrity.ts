/**
 * AARIGO CAPITAL — DATABASE INTEGRITY AUDIT SCRIPT
 * Checks for:
 * - Duplicate customer codes
 * - Duplicate loan numbers
 * - Duplicate payment numbers
 * - Duplicate receipt numbers
 * - Orphan installments, payments, collections
 * - Negative balances across all financial tables
 * - Invalid enum statuses
 * - Missing required relationships
 * Exit code: 0 = PASS, 1 = FAIL
 */

import { prisma } from '../backend/src/lib/prisma';

async function runIntegrityCheck() {
  console.log('============================================================');
  console.log('AARIGO CAPITAL — DATABASE INTEGRITY & CONSTRAINT AUDIT');
  console.log(`Execution Timestamp: ${new Date().toISOString()}`);
  console.log('============================================================\n');

  let failureCount = 0;

  function reportCheck(name: string, passed: boolean, details?: string) {
    if (passed) {
      console.log(`[PASS] ${name}`);
    } else {
      console.error(`[FAIL] ${name} — ${details}`);
      failureCount++;
    }
  }

  try {
    // 1. Check for duplicate customer codes
    const customerCodes = await prisma.customer.groupBy({
      by: ['customerCode'],
      _count: { customerCode: true },
      having: { customerCode: { _count: { gt: 1 } } },
    });
    reportCheck('Unique Customer Codes', customerCodes.length === 0, `Found ${customerCodes.length} duplicate codes`);

    // 2. Check for duplicate loan numbers
    const loanNumbers = await prisma.loan.groupBy({
      by: ['loanNumber'],
      _count: { loanNumber: true },
      having: { loanNumber: { _count: { gt: 1 } } },
    });
    reportCheck('Unique Loan Numbers', loanNumbers.length === 0, `Found ${loanNumbers.length} duplicate loan numbers`);

    // 3. Check for duplicate payment numbers
    const paymentNumbers = await prisma.payment.groupBy({
      by: ['paymentNumber'],
      _count: { paymentNumber: true },
      having: { paymentNumber: { _count: { gt: 1 } } },
    });
    reportCheck('Unique Payment Numbers', paymentNumbers.length === 0, `Found ${paymentNumbers.length} duplicate payment numbers`);

    // 4. Check for duplicate receipt numbers
    const receiptNumbers = await prisma.receipt.groupBy({
      by: ['receiptNumber'],
      _count: { receiptNumber: true },
      having: { receiptNumber: { _count: { gt: 1 } } },
    });
    reportCheck('Unique Receipt Numbers', receiptNumbers.length === 0, `Found ${receiptNumbers.length} duplicate receipt numbers`);

    // 5. Check for orphan installments
    const orphanInstallments: any[] = await prisma.$queryRaw`
      SELECT id FROM installments WHERE loanId NOT IN (SELECT id FROM loans)
    `;
    reportCheck('Zero Orphan Installments', orphanInstallments.length === 0, `Found ${orphanInstallments.length} orphan installments`);

    // 6. Check for orphan payments
    const orphanPayments: any[] = await prisma.$queryRaw`
      SELECT id FROM payments WHERE loanId NOT IN (SELECT id FROM loans) OR customerId NOT IN (SELECT id FROM customers)
    `;
    reportCheck('Zero Orphan Payments', orphanPayments.length === 0, `Found ${orphanPayments.length} orphan payments`);

    // 7. Check for orphan collections
    const orphanCollections: any[] = await prisma.$queryRaw`
      SELECT id FROM collections WHERE loanId NOT IN (SELECT id FROM loans) OR customerId NOT IN (SELECT id FROM customers)
    `;
    reportCheck('Zero Orphan Collections', orphanCollections.length === 0, `Found ${orphanCollections.length} orphan collections`);

    // 8. Check for negative balances in loans
    const negativeLoans = await prisma.loan.findMany({
      where: {
        OR: [
          { principalAmount: { lt: 0 } },
          { paidAmount: { lt: 0 } },
          { outstandingAmount: { lt: 0 } },
          { overdueAmount: { lt: 0 } },
        ],
      },
      select: { id: true, loanNumber: true },
    });
    reportCheck('Zero Negative Balances in Loans', negativeLoans.length === 0, `Found ${negativeLoans.length} loans with negative balances`);

    // 9. Check for negative balances in installments
    const negativeInstallments = await prisma.installment.findMany({
      where: {
        OR: [
          { principalAmount: { lt: 0 } },
          { interestAmount: { lt: 0 } },
          { totalAmount: { lt: 0 } },
          { paidAmount: { lt: 0 } },
          { outstandingAmount: { lt: 0 } },
        ],
      },
      select: { id: true },
    });
    reportCheck('Zero Negative Balances in Installments', negativeInstallments.length === 0, `Found ${negativeInstallments.length} installments with negative balances`);

    // 10. Check for negative payment amounts
    const negativePayments = await prisma.payment.findMany({
      where: { amount: { lte: 0 } },
      select: { id: true },
    });
    reportCheck('Zero Non-Positive Payments', negativePayments.length === 0, `Found ${negativePayments.length} non-positive payments`);

    // 11. Check valid Loan statuses
    const invalidLoanStatuses: any[] = await prisma.$queryRaw`
      SELECT id, status FROM loans WHERE status NOT IN ('PENDING', 'ACTIVE', 'OVERDUE', 'CLOSED', 'CANCELLED')
    `;
    reportCheck('Valid Loan Status Enums', invalidLoanStatuses.length === 0, `Found ${invalidLoanStatuses.length} loans with invalid status`);

    // 12. Check valid Installment statuses
    const invalidInstallmentStatuses: any[] = await prisma.$queryRaw`
      SELECT id, status FROM installments WHERE status NOT IN ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE')
    `;
    reportCheck('Valid Installment Status Enums', invalidInstallmentStatuses.length === 0, `Found ${invalidInstallmentStatuses.length} installments with invalid status`);

    console.log('\n============================================================');
    if (failureCount === 0) {
      console.log('✅ DATABASE INTEGRITY AUDIT RESULT: PASS');
      console.log('All 12 data integrity and relational constraint checks passed.');
      console.log('============================================================\n');
      process.exit(0);
    } else {
      console.error(`❌ DATABASE INTEGRITY AUDIT RESULT: FAIL (${failureCount} failures)`);
      console.log('============================================================\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during database integrity audit:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runIntegrityCheck();
