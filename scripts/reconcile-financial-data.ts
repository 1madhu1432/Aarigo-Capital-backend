/**
 * AARIGO CAPITAL — FINANCIAL RECONCILIATION SCRIPT
 * Audits 100% of loans in the database to verify mathematical consistency:
 * - SUM(installment.principal) === loan.principal
 * - SUM(installment.interest) === loan.totalInterest
 * - SUM(installment.total) === loan.totalPayable
 * - SUM(payments.amount) === loan.paidAmount
 * - loan.outstandingAmount === max(0, totalPayable - paidAmount)
 * - loan.overdueAmount === SUM(overdue installments)
 */

import { prisma } from '../backend/src/lib/prisma';

function todayIST(): string {
  const d = new Date();
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  return ist.toISOString().slice(0, 10);
}

async function runReconciliation() {
  console.log('============================================================');
  console.log('AARIGO CAPITAL — FINANCIAL RECONCILIATION AUDIT');
  console.log(`Execution Timestamp: ${new Date().toISOString()}`);
  console.log(`Reference Date (IST): ${todayIST()}`);
  console.log('============================================================\n');

  let totalLoans = 0;
  let totalDiscrepancies = 0;

  try {
    const loans = await prisma.loan.findMany({
      include: {
        installments: { orderBy: { installmentNumber: 'asc' } },
        payments: { where: { isReversed: false } },
      },
    });

    totalLoans = loans.length;
    console.log(`Auditing ${totalLoans} loan records in database...\n`);

    if (totalLoans === 0) {
      console.log('⚠️ No loan records found in database to reconcile.');
      console.log('RESULT: 0 loans audited, 0 discrepancies.\n');
      process.exit(0);
    }

    const today = todayIST();

    for (const loan of loans) {
      console.log(`--- Loan ${loan.loanNumber} (ID: ${loan.id}) ---`);

      // 1. Installment sums
      const sumInstPrincipal = loan.installments.reduce(
        (acc, i) => acc + Number(i.principalAmount),
        0
      );
      const sumInstInterest = loan.installments.reduce(
        (acc, i) => acc + Number(i.interestAmount),
        0
      );
      const sumInstTotal = loan.installments.reduce(
        (acc, i) => acc + Number(i.totalAmount),
        0
      );

      // 2. Payments sum
      const sumPayments = loan.payments.reduce((acc, p) => acc + Number(p.amount), 0);

      // 3. Expected outstanding
      const expectedOutstanding = Math.max(0, Number(loan.totalPayable) - sumPayments);

      // 4. Expected overdue
      const expectedOverdue = loan.installments
        .filter((i) => i.dueDate < today && i.status !== 'PAID')
        .reduce((acc, i) => acc + Number(i.outstandingAmount), 0);

      // Comparisons
      const diffPrincipal = Math.abs(sumInstPrincipal - Number(loan.principalAmount));
      const diffInterest = Math.abs(sumInstInterest - Number(loan.totalInterest));
      const diffTotal = Math.abs(sumInstTotal - Number(loan.totalPayable));
      const diffPaid = Math.abs(sumPayments - Number(loan.paidAmount));
      const diffOutstanding = Math.abs(expectedOutstanding - Number(loan.outstandingAmount));
      const diffOverdue = Math.abs(expectedOverdue - Number(loan.overdueAmount));

      const passPrincipal = diffPrincipal <= 1; // within rounding
      const passInterest = diffInterest <= 1;
      const passTotal = diffTotal <= 1;
      const passPaid = diffPaid <= 0.01;
      const passOutstanding = diffOutstanding <= 1;
      const passOverdue = diffOverdue <= 1;

      console.log(`  Principal:    ${passPrincipal ? 'PASS' : 'FAIL'} (Expected: ${loan.principalAmount}, Sum: ${sumInstPrincipal})`);
      console.log(`  Interest:     ${passInterest ? 'PASS' : 'FAIL'} (Expected: ${loan.totalInterest}, Sum: ${sumInstInterest})`);
      console.log(`  Total Payable:${passTotal ? 'PASS' : 'FAIL'} (Expected: ${loan.totalPayable}, Sum: ${sumInstTotal})`);
      console.log(`  Payments:     ${passPaid ? 'PASS' : 'FAIL'} (Recorded: ${loan.paidAmount}, Sum: ${sumPayments})`);
      console.log(`  Outstanding:  ${passOutstanding ? 'PASS' : 'FAIL'} (Recorded: ${loan.outstandingAmount}, Calc: ${expectedOutstanding})`);
      console.log(`  Overdue:      ${passOverdue ? 'PASS' : 'FAIL'} (Recorded: ${loan.overdueAmount}, Calc: ${expectedOverdue})\n`);

      if (!passPrincipal || !passInterest || !passTotal || !passPaid || !passOutstanding || !passOverdue) {
        totalDiscrepancies++;
      }
    }

    console.log('============================================================');
    if (totalDiscrepancies === 0) {
      console.log('✅ FINANCIAL RECONCILIATION RESULT: PASS');
      console.log(`All ${totalLoans} loans passed 100% mathematical reconciliation.`);
      console.log('============================================================\n');
      process.exit(0);
    } else {
      console.error(`❌ FINANCIAL RECONCILIATION RESULT: FAIL`);
      console.error(`${totalDiscrepancies} out of ${totalLoans} loans showed discrepancies.`);
      console.log('============================================================\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during financial reconciliation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runReconciliation();
