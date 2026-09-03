import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildAll, buildNotifications, computeSchedule, defaultAdmin, defaultSettings } from "@/data/mock";
import { addMonths, generateEmiDates, padId, safe, todayISO } from "@/lib/format";
import type {
  Account,
  AdminProfile,
  AppNotification,
  CreditLimitChange,
  Customer,
  DisbursementMethod,
  DocumentFile,
  EarlyClosureRecord,
  Emi,
  Loan,
  Payment,
  PaymentMethod,
  PromiseToPay,
  Receipt,
  Settings,
  Visit,
} from "@/types";
import { computeAmortizationSchedule } from "@/utils/amortization";

// ─── localStorage persistence ──────────────────────────────────────────────
const STORAGE_KEY = "loanflow-hub-store-v1";

interface PersistedState {
  customers: Customer[];
  accounts: Account[];
  loans: Loan[];
  emis: Emi[];
  payments: Payment[];
  receipts: Receipt[];
  visits: Visit[];
  limitHistory: CreditLimitChange[];
  documents: DocumentFile[];
  promiseToPay: PromiseToPay[];
  earlyClosures?: EarlyClosureRecord[];
  counters: CounterState;
  admin: AdminProfile;
  settings: Settings;
}

function loadStoredState(): PersistedState | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedState;
    if (!Array.isArray(data?.customers)) return null;
    return data;
  } catch {
    return null;
  }
}

// ─── Counter shape ─────────────────────────────────────────────────────────
interface CounterState {
  customer: number;
  account: number;
  loan: number;
  emi: number;
  payment: number;
  receipt: number;
  visit: number;
  doc: number;
  ptp: number;
  ecl: number;
}

const DEFAULT_COUNTERS: CounterState = {
  customer: 200,
  account: 200,
  loan: 200,
  emi: 5000,
  payment: 2000,
  receipt: 900,
  visit: 900,
  doc: 5000,
  ptp: 0,
  ecl: 100,
};

// ─── Input interfaces (exported for use in route files) ────────────────────
export interface NewCustomerInput {
  name: string;
  guardianName: string;
  mobile: string;
  altMobile: string;
  dob: string;
  gender: Customer["gender"];
  occupation: string;
  monthlyIncome: number;
  address: Customer["address"];
  kycType: Customer["kycType"];
  kycNumber: string;
  nominee: Customer["nominee"];
  guarantor: Customer["guarantor"];
  creditLimit: number;
}

export interface NewLoanInput {
  customerId: string;
  principal: number;
  interestRate: number;
  interestMethod: Loan["interestMethod"];
  processingFee: number;
  insurance: number;
  tenure: number;
  frequency: Loan["frequency"];
  startDate: string;
  firstEmiDate: string;
  purpose: string;
  disbursementMethod: DisbursementMethod;
  bankTransactionId: string;
}

export interface PaymentInput {
  customerId: string;
  loanId: string;
  emiId: string;
  amount: number;
  method: PaymentMethod;
  notes: string;
  /** How to handle any amount exceeding the target EMI remaining:
   *  - "next"    → spill excess into subsequent unpaid EMIs
   *  - "advance" → cap at target EMI remaining, treat excess as advance
   *  - omitted   → treat same as "next" (safe default)
   */
  excessAction?: "next" | "advance";
}

export interface EarlyCloseLoanInput {
  loanId: string;
  chargePercent: number;
  method: PaymentMethod;
  bankTransactionId?: string;
  notes?: string;
}

// ─── Store interface ───────────────────────────────────────────────────────
interface StoreValue {
  today: string;
  loggedIn: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;

  customers: Customer[];
  accounts: Account[];
  loans: Loan[];
  emis: Emi[];
  payments: Payment[];
  receipts: Receipt[];
  visits: Visit[];
  limitHistory: CreditLimitChange[];
  documents: DocumentFile[];
  promiseToPay: PromiseToPay[];
  earlyClosures: EarlyClosureRecord[];
  notifications: AppNotification[];
  admin: AdminProfile;
  settings: Settings;

  addCustomer: (input: NewCustomerInput) => { customer: Customer; account: Account };
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  addLoan: (input: NewLoanInput) => Loan;
  recordPayment: (input: PaymentInput) => { payment: Payment; receipt: Receipt };
  reversePayment: (paymentId: string, reason: string) => void;
  updateCreditLimit: (accountId: string, newLimit: number, reason: string) => void;
  upsertVisit: (visit: Partial<Visit> & { id?: string; customerId: string; loanId: string }) => Visit;
  addDocument: (customerId: string, type: DocumentFile["type"], name: string) => void;
  deleteDocument: (id: string) => void;
  updateAdmin: (patch: Partial<AdminProfile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  markNotificationsRead: () => void;
  closeLoan: (loanId: string) => void;
  earlyCloseLoan: (input: EarlyCloseLoanInput) => { earlyClosure: EarlyClosureRecord; payment: Payment; receipt: Receipt };
  addPromiseToPay: (input: Omit<PromiseToPay, "id" | "createdAt" | "status">) => PromiseToPay;
  updatePromiseToPay: (id: string, patch: Partial<PromiseToPay>) => void;
  resetDemoData: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const today = todayISO();

  // ── Load initial state (localStorage or fresh seed) ──────────────────────
  const stored = loadStoredState();
  const seed = stored ?? buildAll();

  const [loggedIn, setLoggedIn] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>(seed.customers);
  const [accounts, setAccounts] = useState<Account[]>(seed.accounts);
  const [loans, setLoans] = useState<Loan[]>(seed.loans);
  const [emis, setEmis] = useState<Emi[]>(seed.emis);
  const [payments, setPayments] = useState<Payment[]>(seed.payments);
  const [receipts, setReceipts] = useState<Receipt[]>(seed.receipts);
  const [visits, setVisits] = useState<Visit[]>(seed.visits);
  const [limitHistory, setLimitHistory] = useState<CreditLimitChange[]>(seed.limitHistory);
  const [documents, setDocuments] = useState<DocumentFile[]>(seed.documents);
  const [promiseToPay, setPromiseToPay] = useState<PromiseToPay[]>(
    (stored as PersistedState & { promiseToPay?: PromiseToPay[] })?.promiseToPay ?? [],
  );
  const [earlyClosures, setEarlyClosures] = useState<EarlyClosureRecord[]>(
    (stored as PersistedState & { earlyClosures?: EarlyClosureRecord[] })?.earlyClosures ?? [],
  );
  const [admin, setAdmin] = useState<AdminProfile>(stored?.admin ?? defaultAdmin);
  const [settings, setSettings] = useState<Settings>(stored?.settings ?? defaultSettings);
  const [counters, setCounters] = useState<CounterState>(stored?.counters ?? DEFAULT_COUNTERS);

  // ── Notifications (always computed, not persisted) ────────────────────────
  const initialNotifications = useMemo(() => {
    const overdueEmis = seed.emis.filter((e) => e.status === "Overdue").length;
    const dueToday = new Set(seed.emis.filter((e) => e.dueDate === today).map((e) => e.customerId)).size;
    const collectedToday = seed.payments
      .filter((p) => p.date.slice(0, 10) === today)
      .reduce((s, p) => s + p.amount, 0);
    const partial = seed.emis.find((e) => e.status === "Partial");
    const partialCustomer = partial
      ? seed.customers.find((c) => c.id === partial.customerId)?.name.split(" ")[0]
      : undefined;
    return buildNotifications({
      overdueEmis,
      dueToday,
      collectedToday,
      partialCustomer,
      partialAmount: partial ? partial.amount - partial.paid : 0,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);

  // ── Persist to localStorage on every state change ─────────────────────────
  useEffect(() => {
    const data: PersistedState = {
      customers,
      accounts,
      loans,
      emis,
      payments,
      receipts,
      visits,
      limitHistory,
      documents,
      promiseToPay,
      earlyClosures,
      counters,
      admin,
      settings,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage quota errors
    }
  }, [
    customers, accounts, loans, emis, payments, receipts, visits,
    limitHistory, documents, promiseToPay, earlyClosures, counters, admin, settings,
  ]);

  // ── ID helpers ────────────────────────────────────────────────────────────
  const nextId = useCallback((key: keyof CounterState) => {
    let value = 0;
    setCounters((c) => {
      value = c[key] + 1;
      return { ...c, [key]: value };
    });
    return value;
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const addCustomer = useCallback<StoreValue["addCustomer"]>(
    (input) => {
      const n = counters.customer + 1;
      const a = counters.account + 1;
      setCounters((c) => ({ ...c, customer: n, account: a }));
      const customer: Customer = {
        id: padId("CUS", n),
        name: input.name,
        guardianName: input.guardianName,
        mobile: input.mobile,
        altMobile: input.altMobile,
        dob: input.dob,
        gender: input.gender,
        occupation: input.occupation,
        monthlyIncome: safe(input.monthlyIncome),
        address: input.address,
        kycType: input.kycType,
        kycNumber: input.kycNumber,
        nominee: input.nominee,
        guarantor: input.guarantor,
        status: "Active",
        createdAt: today,
        photoHue: (n * 37) % 360,
      };
      const account: Account = {
        id: padId("ACC", a),
        customerId: customer.id,
        creditLimit: Math.max(0, safe(input.creditLimit)),
        status: "Active",
        openedAt: today,
      };
      setCustomers((prev) => [customer, ...prev]);
      setAccounts((prev) => [account, ...prev]);
      return { customer, account };
    },
    [counters.customer, counters.account, today],
  );

  const updateCustomer = useCallback<StoreValue["updateCustomer"]>((id, patch) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);

  const addLoan = useCallback<StoreValue["addLoan"]>(
    (input) => {
      const n = counters.loan + 1;
      setCounters((c) => ({ ...c, loan: n }));
      const account = accounts.find((a) => a.customerId === input.customerId)!;
      const { totalInterest, totalPayable, emiAmount } = computeSchedule({
        principal: input.principal,
        rate: input.interestRate,
        method: input.interestMethod,
        tenure: input.tenure,
        frequency: input.frequency,
      });

      // Correct end date for all frequencies
      const emiDates = generateEmiDates(input.firstEmiDate, input.frequency, input.tenure);
      const endDate = emiDates[emiDates.length - 1] ?? input.firstEmiDate;

      const loan: Loan = {
        id: padId("LN", n),
        customerId: input.customerId,
        accountId: account?.id ?? "",
        principal: input.principal,
        interestRate: input.interestRate,
        interestMethod: input.interestMethod,
        processingFee: safe(input.processingFee),
        insurance: safe(input.insurance),
        tenure: input.tenure,
        frequency: input.frequency,
        emiAmount,
        totalInterest,
        totalPayable,
        startDate: input.startDate,
        firstEmiDate: input.firstEmiDate,
        endDate,
        status: "Active",
        purpose: input.purpose,
        disbursementMethod: input.disbursementMethod,
        bankTransactionId: input.bankTransactionId,
      };

      // Generate schedule using correct date logic for all frequencies
      const schedule: Emi[] = [];
      let e = counters.emi;
      for (let i = 0; i < input.tenure; i++) {
        e += 1;
        const dueDate = emiDates[i]!;
        schedule.push({
          id: padId("EMI", e),
          loanId: loan.id,
          customerId: loan.customerId,
          emiNo: i + 1,
          dueDate,
          amount: emiAmount,
          paid: 0,
          status: dueDate === today ? "Due" : dueDate < today ? "Overdue" : "Upcoming",
        });
      }
      setCounters((c) => ({ ...c, emi: e }));
      setLoans((prev) => [loan, ...prev]);
      setEmis((prev) => [...prev, ...schedule]);
      return loan;
    },
    [accounts, counters.loan, counters.emi, today],
  );

  const recordPayment = useCallback<StoreValue["recordPayment"]>(
    (input) => {
      const pNum = counters.payment + 1;
      const rNum = counters.receipt + 1;

      const paymentId = padId("PAY", pNum);
      const receiptId = `${settings.receiptPrefix}-${String(rNum).padStart(5, "0")}`;
      const nowIso = new Date().toISOString();
      const amount = Math.max(0, safe(input.amount));

      // Look up target EMI before state changes
      const targetEmi = emis.find((e) => e.id === input.emiId);
      const targetRemaining = targetEmi ? targetEmi.amount - targetEmi.paid : 0;

      const payment: Payment = {
        id: paymentId,
        receiptId,
        customerId: input.customerId,
        loanId: input.loanId,
        emiId: input.emiId,
        amount,
        method: input.method,
        date: nowIso,
        notes: input.notes,
        collectedBy: admin.name,
        reversed: false,
        reversalReason: "",
      };
      const receipt: Receipt = {
        id: receiptId,
        paymentId,
        customerId: input.customerId,
        loanId: input.loanId,
        amount,
        method: input.method,
        date: nowIso,
        status: "Issued",
      };

      // ── Apply payment to EMIs ─────────────────────────────────────────────
      setEmis((prev) => {
        const excessAction = input.excessAction ?? "next";

        if (amount <= targetRemaining || excessAction === "advance") {
          // Simple: apply only to target EMI (capped at remaining)
          const apply = Math.min(amount, targetRemaining);
          return prev.map((e) => {
            if (e.id !== input.emiId) return e;
            const paid = e.paid + apply;
            const status: Emi["status"] =
              paid >= e.amount ? "Paid" : paid > 0 ? "Partial" : e.dueDate < today ? "Overdue" : e.dueDate === today ? "Due" : "Upcoming";
            return { ...e, paid, status };
          });
        }

        // "next" — spill excess into subsequent unpaid EMIs
        let remaining = amount;
        const targetIdx = prev.findIndex((e) => e.id === input.emiId);
        const order = prev
          .map((e, i) => ({ e, i }))
          .filter(({ e }) => e.loanId === input.loanId && e.paid < e.amount)
          .sort((a, b) => (a.i === targetIdx ? -1 : b.i === targetIdx ? 1 : a.e.emiNo - b.e.emiNo));
        const updates = new Map<string, Emi>();
        for (const { e } of order) {
          if (remaining <= 0) break;
          const need = e.amount - e.paid;
          const apply = Math.min(need, remaining);
          remaining -= apply;
          const paid = e.paid + apply;
          const status: Emi["status"] =
            paid >= e.amount ? "Paid" : paid > 0 ? "Partial" : e.dueDate < today ? "Overdue" : e.dueDate === today ? "Due" : "Upcoming";
          updates.set(e.id, { ...e, paid, status });
        }
        return prev.map((e) => updates.get(e.id) ?? e);
      });

      setPayments((prev) => [payment, ...prev]);
      setReceipts((prev) => [receipt, ...prev]);

      // ── Auto-create or update visit for today ─────────────────────────────
      setVisits((prev) => {
        const existingIdx = prev.findIndex(
          (v) => v.loanId === input.loanId && v.date === today,
        );
        if (existingIdx >= 0) {
          return prev.map((v, i) => {
            if (i !== existingIdx) return v;
            const newCollected = v.collected + amount;
            return {
              ...v,
              collected: newCollected,
              status: newCollected >= v.dueAmount ? ("Paid" as const) : ("Partially Paid" as const),
              paymentId,
              receiptId,
            };
          });
        }
        // Create new visit
        setCounters((c) => ({ ...c, visit: c.visit + 1 }));
        const newVisit: Visit = {
          id: padId("VIS", counters.visit + 1),
          customerId: input.customerId,
          loanId: input.loanId,
          date: today,
          dueAmount: targetRemaining,
          collected: amount,
          status: amount >= targetRemaining ? "Paid" : "Partially Paid",
          notes: input.notes || "",
          paymentId,
          receiptId,
        };
        return [newVisit, ...prev];
      });

      setCounters((c) => ({ ...c, payment: pNum, receipt: rNum }));
      return { payment, receipt };
    },
    [admin.name, counters.payment, counters.receipt, counters.visit, settings.receiptPrefix, today, emis],
  );

  const reversePayment = useCallback<StoreValue["reversePayment"]>(
    (paymentId, reason) => {
      const payment = payments.find((p) => p.id === paymentId);
      if (!payment || payment.reversed) return;

      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, reversed: true, reversalReason: reason } : p)),
      );
      setReceipts((prev) =>
        prev.map((r) => (r.paymentId === paymentId ? { ...r, status: "Cancelled" } : r)),
      );
      setEmis((prev) =>
        prev.map((e) => {
          if (e.id !== payment.emiId) return e;
          const newPaid = Math.max(0, e.paid - payment.amount);
          const status: Emi["status"] =
            newPaid >= e.amount
              ? "Paid"
              : newPaid > 0
              ? "Partial"
              : e.dueDate < today
              ? "Overdue"
              : e.dueDate === today
              ? "Due"
              : "Upcoming";
          return { ...e, paid: newPaid, status };
        }),
      );
    },
    [payments, today],
  );

  const updateCreditLimit = useCallback<StoreValue["updateCreditLimit"]>(
    (accountId, newLimit, reason) => {
      const limit = Math.max(0, safe(newLimit));
      setAccounts((prev) => {
        const acc = prev.find((a) => a.id === accountId);
        if (acc) {
          setLimitHistory((h) => [
            {
              id: `CLH-${Date.now()}`,
              accountId,
              customerId: acc.customerId,
              oldLimit: acc.creditLimit,
              newLimit: limit,
              reason,
              date: today,
              changedBy: admin.name,
            },
            ...h,
          ]);
        }
        return prev.map((a) => (a.id === accountId ? { ...a, creditLimit: limit } : a));
      });
    },
    [admin.name, today],
  );

  const upsertVisit = useCallback<StoreValue["upsertVisit"]>(
    (input) => {
      let result: Visit | null = null;
      setVisits((prev) => {
        if (input.id && prev.some((v) => v.id === input.id)) {
          const next = prev.map((v) => {
            if (v.id !== input.id) return v;
            const updated: Visit = { ...v, ...input } as Visit;
            result = updated;
            return updated;
          });
          return next;
        }
        const n = counters.visit + 1;
        setCounters((c) => ({ ...c, visit: n }));
        result = {
          id: padId("VIS", n),
          customerId: input.customerId,
          loanId: input.loanId,
          date: input.date ?? today,
          dueAmount: safe(input.dueAmount),
          collected: safe(input.collected),
          status: input.status ?? "Planned",
          reason: input.reason,
          nextVisit: input.nextVisit,
          notes: input.notes ?? "",
        };
        return [result, ...prev];
      });
      return (
        result ?? {
          id: padId("VIS", counters.visit + 1),
          customerId: input.customerId,
          loanId: input.loanId,
          date: today,
          dueAmount: 0,
          collected: 0,
          status: "Planned" as const,
        }
      );
    },
    [counters.visit, today],
  );

  const addDocument = useCallback<StoreValue["addDocument"]>(
    (customerId, type, name) => {
      const n = nextId("doc");
      setDocuments((prev) => [
        {
          id: `DOC-${n}`,
          customerId,
          type,
          name,
          sizeKb: Math.floor(120 + Math.random() * 2000),
          uploadedAt: today,
        },
        ...prev,
      ]);
    },
    [nextId, today],
  );

  const deleteDocument = useCallback<StoreValue["deleteDocument"]>((id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const closeLoan = useCallback<StoreValue["closeLoan"]>((loanId) => {
    setLoans((prev) => prev.map((l) => (l.id === loanId ? { ...l, status: "Closed" } : l)));
  }, []);

  const earlyCloseLoan = useCallback<StoreValue["earlyCloseLoan"]>(
    (input) => {
      const targetLoan = loans.find((l) => l.id === input.loanId);
      if (!targetLoan) throw new Error("Loan not found");

      // Compute precise outstanding principal using amortization schedule
      const sched = computeAmortizationSchedule(targetLoan, emis, payments);
      const outstandingPrincipal = sched.outstandingPrincipal;
      const chargePercent = Math.max(0, safe(input.chargePercent));
      const chargeAmount = Math.round((outstandingPrincipal * chargePercent) / 100);
      const finalClosureAmount = outstandingPrincipal + chargeAmount;

      const pNum = counters.payment + 1;
      const rNum = counters.receipt + 1;
      const eNum = (counters.ecl ?? 100) + 1;

      const paymentId = padId("PAY", pNum);
      const receiptId = `${settings.receiptPrefix}-${String(rNum).padStart(5, "0")}`;
      const eclId = padId("ECL", eNum);
      const nowIso = new Date().toISOString();

      const earlyClosure: EarlyClosureRecord = {
        id: eclId,
        loanId: targetLoan.id,
        customerId: targetLoan.customerId,
        accountId: targetLoan.accountId,
        closureDate: nowIso,
        originalLoanAmount: targetLoan.principal,
        outstandingPrincipal,
        earlyClosureChargePercent: chargePercent,
        earlyClosureCharge: chargeAmount,
        futureInterestCharged: 0,
        finalClosureAmount,
        paymentMethod: input.method,
        bankTransactionId: input.bankTransactionId || "",
        paymentId,
        receiptId,
        notes: input.notes || "Early loan foreclosure settlement",
        status: "Closed Early",
      };

      const payment: Payment = {
        id: paymentId,
        receiptId,
        customerId: targetLoan.customerId,
        loanId: targetLoan.id,
        emiId: "",
        amount: finalClosureAmount,
        method: input.method,
        date: nowIso,
        notes: input.notes || `Early Closure Settlement: Principal ₹${outstandingPrincipal} + Charge ₹${chargeAmount}`,
        collectedBy: admin.name,
        reversed: false,
        reversalReason: "",
        isEarlyClosure: true,
        earlyClosureChargePercent: chargePercent,
        earlyClosureCharge: chargeAmount,
        outstandingPrincipal,
        finalClosureAmount,
        bankTransactionId: input.bankTransactionId || "",
      };

      const receipt: Receipt = {
        id: receiptId,
        paymentId,
        customerId: targetLoan.customerId,
        loanId: targetLoan.id,
        amount: finalClosureAmount,
        method: input.method,
        date: nowIso,
        status: "Issued",
      };

      // 1. Update loan status to 'Closed Early' and attach closure record
      setLoans((prev) =>
        prev.map((l) =>
          l.id === targetLoan.id
            ? { ...l, status: "Closed Early", earlyClosure }
            : l,
        ),
      );

      // 2. Mark all unpaid/future EMIs as Cancelled with note
      // (previously paid EMIs remain unchanged)
      setEmis((prev) =>
        prev.map((e) => {
          if (e.loanId !== targetLoan.id) return e;
          if (e.status === "Paid" || e.paid >= e.amount) return e;
          return {
            ...e,
            status: "Cancelled",
            remarks: "Cancelled - Early Closure",
          };
        }),
      );

      // 3. Append payment and receipt
      setPayments((prev) => [payment, ...prev]);
      setReceipts((prev) => [receipt, ...prev]);
      setEarlyClosures((prev) => [earlyClosure, ...prev]);

      // 4. Update visit history
      setVisits((prev) => {
        const newVisit: Visit = {
          id: padId("VIS", counters.visit + 1),
          customerId: targetLoan.customerId,
          loanId: targetLoan.id,
          date: today,
          dueAmount: outstandingPrincipal,
          collected: finalClosureAmount,
          status: "Paid",
          notes: `Early loan foreclosure settled.`,
          paymentId,
          receiptId,
        };
        return [newVisit, ...prev];
      });

      // 5. Add notification
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: "Loan Closed Early",
          body: `Loan ${targetLoan.id} closed early with final settlement of ₹${finalClosureAmount.toLocaleString("en-IN")}. Future interest waived.`,
          createdAt: nowIso,
          read: false,
          tone: "success",
        },
        ...prev,
      ]);

      setCounters((c) => ({
        ...c,
        payment: pNum,
        receipt: rNum,
        visit: c.visit + 1,
        ecl: eNum,
      }));

      return { earlyClosure, payment, receipt };
    },
    [admin.name, counters.ecl, counters.payment, counters.receipt, counters.visit, emis, loans, payments, settings.receiptPrefix, today],
  );

  const addPromiseToPay = useCallback<StoreValue["addPromiseToPay"]>(
    (input) => {
      const n = counters.ptp + 1;
      setCounters((c) => ({ ...c, ptp: n }));
      const ptp: PromiseToPay = {
        id: padId("PTP", n),
        ...input,
        status: "Pending",
        createdAt: today,
      };
      setPromiseToPay((prev) => [ptp, ...prev]);
      return ptp;
    },
    [counters.ptp, today],
  );

  const updatePromiseToPay = useCallback<StoreValue["updatePromiseToPay"]>((id, patch) => {
    setPromiseToPay((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const resetDemoData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    const fresh = buildAll();
    setCustomers(fresh.customers);
    setAccounts(fresh.accounts);
    setLoans(fresh.loans);
    setEmis(fresh.emis);
    setPayments(fresh.payments);
    setReceipts(fresh.receipts);
    setVisits(fresh.visits);
    setLimitHistory(fresh.limitHistory);
    setDocuments(fresh.documents);
    setPromiseToPay([]);
    setEarlyClosures([]);
    setCounters(DEFAULT_COUNTERS);
    setAdmin(defaultAdmin);
    setSettings(defaultSettings);
  }, []);

  const value: StoreValue = {
    today,
    loggedIn,
    login: (email, password) => {
      const ok = email.trim().toLowerCase() === "admin@loanflow.demo" && password === "123456";
      if (ok) setLoggedIn(true);
      return ok;
    },
    logout: () => setLoggedIn(false),
    customers,
    accounts,
    loans,
    emis,
    payments,
    receipts,
    visits,
    limitHistory,
    documents,
    promiseToPay,
    earlyClosures,
    notifications,
    admin,
    settings,
    addCustomer,
    updateCustomer,
    addLoan,
    recordPayment,
    reversePayment,
    updateCreditLimit,
    upsertVisit,
    addDocument,
    deleteDocument,
    updateAdmin: (patch) => setAdmin((a) => ({ ...a, ...patch })),
    updateSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
    markNotificationsRead: () => setNotifications((n) => n.map((x) => ({ ...x, read: true }))),
    closeLoan,
    earlyCloseLoan,
    addPromiseToPay,
    updatePromiseToPay,
    resetDemoData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside AppStoreProvider");
  return ctx;
}

/** Helper: compute the "current" EMI for a loan in collection priority order:
 *  Partial > Overdue > Due today > Next Upcoming
 */
export function resolveCurrentEmi(loanEmis: import("@/types").Emi[], today: string) {
  const unpaid = loanEmis.filter((e) => e.paid < e.amount).sort((a, b) => a.emiNo - b.emiNo);
  return (
    unpaid.find((e) => e.status === "Partial") ??
    unpaid.find((e) => e.status === "Overdue") ??
    unpaid.find((e) => e.dueDate === today) ??
    unpaid[0] ??
    null
  );
}

/** Compute a collection priority score for sorting today's route. */
export function collectionPriorityScore(emi: import("@/types").Emi, today: string): number {
  let score = 0;
  if (emi.status === "Partial") score += 75;
  if (emi.status === "Overdue") {
    score += 100;
    const days = Math.max(
      0,
      Math.round((new Date(today + "T00:00:00").getTime() - new Date(emi.dueDate + "T00:00:00").getTime()) / 86_400_000),
    );
    score += days * 3;
  }
  if (emi.dueDate === today) score += 50;
  return score;
}
