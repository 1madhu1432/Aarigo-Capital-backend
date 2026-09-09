import { Decimal } from '@prisma/client/runtime/library';
import {
  todayIST,
  toISODate,
  parseISODate,
  daysBetween,
  addMonths,
  addWeeks,
  addDays,
  generateDueDates,
  isOverdue,
} from '../../utils/date';

export {
  todayIST,
  toISODate,
  parseISODate,
  daysBetween,
  addMonths,
  addWeeks,
  addDays,
  generateDueDates,
  isOverdue,
};

export type InterestType = 'FLAT' | 'REDUCING';
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface LoanScheduleInput {
  principal: number;
  annualRate?: number;
  interestRate?: number;
  interestType: InterestType;
  tenure: number;
  frequency: Frequency;
  startDate?: string;
  firstDueDate?: string;
}

export interface InstallmentComponent {
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
}

export interface LoanScheduleResult {
  emiAmount: number;
  totalInterest: number;
  totalPayable: number;
  maturityDate: string;
  installments: InstallmentComponent[];
  schedule: InstallmentComponent[];
}

export function periodsPerYear(frequency: Frequency): number {
  if (frequency === 'DAILY') return 365;
  if (frequency === 'WEEKLY') return 52;
  return 12;
}

function r(n: number): number {
  return Math.round(n);
}

export function calculateFlatInterest(
  principal: number,
  annualRate: number,
  tenure: number,
  frequency: Frequency
) {
  const ppy = periodsPerYear(frequency);
  const years = tenure / ppy;
  const totalInterest = r(principal * (annualRate / 100) * years);
  const totalPayable = principal + totalInterest;
  const emiAmount = r(totalPayable / tenure);

  return { totalInterest, totalPayable, emiAmount };
}

export function calculateReducingEMI(
  principal: number,
  annualRate: number,
  tenure: number,
  frequency: Frequency
): number {
  const ppy = periodsPerYear(frequency);
  const periodRate = annualRate / 100 / ppy;
  if (periodRate === 0) return r(principal / tenure);

  const factor = Math.pow(1 + periodRate, tenure);
  return r((principal * periodRate * factor) / (factor - 1));
}

export function computeLoanSchedule(input: LoanScheduleInput): LoanScheduleResult {
  const principal = input.principal;
  const rate = input.annualRate ?? input.interestRate ?? 0;
  const interestType = input.interestType;
  const tenure = input.tenure;
  const frequency = input.frequency;
  const start = input.startDate || todayIST();
  const firstDue = input.firstDueDate || (
    frequency === 'DAILY' ? addDays(start, 1) :
    frequency === 'WEEKLY' ? addWeeks(start, 1) :
    addMonths(start, 1)
  );

  if (principal <= 0 || tenure <= 0) {
    return {
      emiAmount: 0,
      totalInterest: 0,
      totalPayable: principal,
      maturityDate: firstDue,
      installments: [],
      schedule: [],
    };
  }

  const ppy = periodsPerYear(frequency);
  const years = tenure / ppy;
  let emiAmount: number;
  let totalInterest: number;
  let totalPayable: number;

  if (interestType === 'FLAT') {
    totalInterest = r(principal * (rate / 100) * years);
    totalPayable = principal + totalInterest;
    emiAmount = r(totalPayable / tenure);
  } else {
    const periodRate = rate / 100 / ppy;
    if (periodRate === 0) {
      emiAmount = r(principal / tenure);
      totalInterest = 0;
      totalPayable = principal;
    } else {
      const factor = Math.pow(1 + periodRate, tenure);
      emiAmount = r((principal * periodRate * factor) / (factor - 1));
      totalPayable = emiAmount * tenure;
      totalInterest = Math.max(0, totalPayable - principal);
    }
  }

  const dueDates = generateDueDates(firstDue, frequency, tenure);
  const installments: InstallmentComponent[] = [];
  let sumPrincipal = 0;
  let sumInterest = 0;
  let balance = principal;

  for (let i = 0; i < tenure; i++) {
    const isLast = i === tenure - 1;
    const dueDate = dueDates[i] || addDays(firstDue, i);
    let pComp: number;
    let iComp: number;

    if (interestType === 'REDUCING') {
      const periodRate = rate / 100 / ppy;
      if (isLast) {
        pComp = balance;
        iComp = Math.max(0, r(balance * periodRate));
      } else {
        iComp = Math.max(0, r(balance * periodRate));
        pComp = Math.max(0, Math.min(balance, emiAmount - iComp));
        balance = Math.max(0, balance - pComp);
      }
    } else {
      if (isLast) {
        iComp = Math.max(0, totalInterest - sumInterest);
        pComp = Math.max(0, principal - sumPrincipal);
      } else {
        iComp = r(totalInterest / tenure);
        pComp = r(principal / tenure);
      }
    }

    sumPrincipal += pComp;
    sumInterest += iComp;

    installments.push({
      installmentNumber: i + 1,
      dueDate,
      principalAmount: pComp,
      interestAmount: iComp,
      totalAmount: pComp + iComp,
    });
  }

  const maturityDate = installments[installments.length - 1]?.dueDate ?? firstDue;

  return {
    emiAmount,
    totalInterest,
    totalPayable,
    maturityDate,
    installments,
    schedule: installments,
  };
}

export function computeEarlyClosure(
  a: number | LoanScheduleInput,
  b?: number | any[],
  closureDate?: string,
  foreclosureChargePercent?: number,
  waiveLateFee?: boolean
): {
  outstandingPrincipal: number;
  chargeAmount: number;
  futureInterestCharged: 0;
  finalClosureAmount: number;
  foreclosureFee?: number;
  totalPayableNow?: number;
} {
  let principal = 0;
  let pct = 2;

  if (typeof a === 'number') {
    principal = a;
    pct = typeof b === 'number' ? b : 2;
  } else if (Array.isArray(b)) {
    const unpaidInstallments = b.filter((i: any) => i.status !== 'PAID');
    principal = unpaidInstallments.reduce((sum: number, i: any) => sum + (i.principalAmount || 0), 0);
    pct = foreclosureChargePercent ?? 2;
  }

  const p = Math.max(0, r(principal));
  const chargeAmount = r((p * pct) / 100);
  const finalClosureAmount = p + chargeAmount;

  return {
    outstandingPrincipal: p,
    chargeAmount,
    foreclosureFee: chargeAmount,
    futureInterestCharged: 0,
    finalClosureAmount,
    totalPayableNow: finalClosureAmount,
  };
}

export function computeLateFee(
  a: string | number,
  b: string | number,
  c: number,
  d?: number,
  isWaived = false
): number | { daysOverdue: number; chargeableDays: number; lateFeeAmount: number; isWaived: boolean } {
  // Support both computeLateFee(daysOverdue, gracePeriod, feePerDay)
  // and computeLateFee(dueDate, currentDate, gracePeriodDays, lateFeePerDay, isWaived)
  if (typeof a === 'number') {
    const daysOverdue = a;
    const gracePeriod = typeof b === 'number' ? b : 0;
    const feePerDay = c;
    if (daysOverdue <= gracePeriod) return 0;
    return (daysOverdue - gracePeriod) * feePerDay;
  }

  const dueDate = a;
  const currentDate = String(b);
  const gracePeriodDays = c;
  const lateFeePerDay = d ?? 20;

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const t1 = new Date(dueDate + 'T00:00:00.000Z').getTime();
  const t2 = new Date(currentDate + 'T00:00:00.000Z').getTime();
  const daysOverdue = Math.max(0, Math.floor((t2 - t1) / MS_PER_DAY));
  const feePerDay = lateFeePerDay > 0 ? lateFeePerDay : 20;

  if (isWaived || daysOverdue <= gracePeriodDays || feePerDay <= 0) {
    return { daysOverdue, chargeableDays: 0, lateFeeAmount: 0, isWaived: true };
  }

  const chargeableDays = daysOverdue - gracePeriodDays;
  return {
    daysOverdue,
    chargeableDays,
    lateFeeAmount: chargeableDays * feePerDay,
    isWaived: false,
  };
}

export { Decimal };
