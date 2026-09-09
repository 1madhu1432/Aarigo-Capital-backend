export interface InstallmentAllocationInput {
  id?: string;
  installmentId?: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount?: number;
  interestAmount?: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount?: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

export interface AllocationResult {
  installmentId: string;
  allocatedAmount: number;
  newPaidAmount: number;
  newOutstandingAmount: number;
  newStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  isFullyPaid: boolean;
}

export interface PaymentAllocationResult {
  allocations: AllocationResult[];
  totalAllocated: number;
  excess: number;
  remainingExcess: number;
}

/**
 * Allocate a payment amount across unpaid installments in order.
 * Accepts either (installments, amount, today) or (amount, installments, today).
 */
export function allocatePayment(
  a: number | InstallmentAllocationInput[],
  b: number | InstallmentAllocationInput[],
  today: string
): PaymentAllocationResult {
  let amount: number;
  let installments: InstallmentAllocationInput[];

  if (typeof a === 'number') {
    amount = a;
    installments = b as InstallmentAllocationInput[];
  } else {
    installments = a;
    amount = b as number;
  }

  // Only allocate to unpaid installments, sorted by installment number
  const unpaid = installments
    .filter((i) => i.paidAmount < i.totalAmount)
    .sort((x, y) => x.installmentNumber - y.installmentNumber);

  let remaining = amount;
  const allocations: AllocationResult[] = [];

  for (const inst of unpaid) {
    if (remaining <= 0) break;

    const outstanding = inst.totalAmount - inst.paidAmount;
    const allocated = Math.min(remaining, outstanding);
    const newPaidAmount = inst.paidAmount + allocated;
    const newOutstandingAmount = Math.max(0, inst.totalAmount - newPaidAmount);
    const isFullyPaid = newOutstandingAmount <= 0.01;

    let newStatus: AllocationResult['newStatus'];
    if (isFullyPaid) {
      newStatus = 'PAID';
    } else if (newPaidAmount > 0) {
      newStatus = 'PARTIAL';
    } else if (inst.dueDate < today) {
      newStatus = 'OVERDUE';
    } else {
      newStatus = inst.status;
    }

    const instId = inst.id || inst.installmentId || `inst-${inst.installmentNumber}`;

    allocations.push({
      installmentId: instId,
      allocatedAmount: allocated,
      newPaidAmount,
      newOutstandingAmount,
      newStatus,
      isFullyPaid,
    });

    remaining -= allocated;
  }

  const excess = Math.max(0, remaining);

  return {
    allocations,
    totalAllocated: amount - remaining,
    excess,
    remainingExcess: excess,
  };
}
