import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildAll, buildNotifications, computeSchedule, defaultAdmin, defaultSettings } from "@/data/mock";
import { addMonths, padId, safe, todayISO } from "@/lib/format";
import type {
  Account,
  AdminProfile,
  AppNotification,
  CreditLimitChange,
  Customer,
  DocumentFile,
  Emi,
  Loan,
  Payment,
  PaymentMethod,
  Receipt,
  Settings,
  Visit,
} from "@/types";

const seed = buildAll();

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
  tenure: number;
  frequency: Loan["frequency"];
  startDate: string;
  firstEmiDate: string;
  purpose: string;
}

export interface PaymentInput {
  customerId: string;
  loanId: string;
  emiId: string;
  amount: number;
  method: PaymentMethod;
  notes: string;
}

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
  notifications: AppNotification[];
  admin: AdminProfile;
  settings: Settings;

  addCustomer: (input: NewCustomerInput) => { customer: Customer; account: Account };
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  addLoan: (input: NewLoanInput) => Loan;
  recordPayment: (input: PaymentInput) => { payment: Payment; receipt: Receipt };
  updateCreditLimit: (accountId: string, newLimit: number, reason: string) => void;
  upsertVisit: (visit: Partial<Visit> & { id?: string; customerId: string; loanId: string }) => Visit;
  addDocument: (customerId: string, type: DocumentFile["type"], name: string) => void;
  deleteDocument: (id: string) => void;
  updateAdmin: (patch: Partial<AdminProfile>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  markNotificationsRead: () => void;
  closeLoan: (loanId: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const today = todayISO();
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
  const [admin, setAdmin] = useState<AdminProfile>(defaultAdmin);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const [counters, setCounters] = useState({
    customer: 200,
    account: 200,
    loan: 200,
    emi: 5000,
    payment: 2000,
    receipt: 900,
    visit: 900,
    doc: 5000,
  });

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
  }, [today]);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);

  const nextId = useCallback((key: keyof typeof counters) => {
    let value = 0;
    setCounters((c) => {
      value = c[key] + 1;
      return { ...c, [key]: value };
    });
    return value;
  }, []);

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
      const loan: Loan = {
        id: padId("LN", n),
        customerId: input.customerId,
        accountId: account?.id ?? "",
        principal: input.principal,
        interestRate: input.interestRate,
        interestMethod: input.interestMethod,
        processingFee: safe(input.processingFee),
        tenure: input.tenure,
        frequency: input.frequency,
        emiAmount,
        totalInterest,
        totalPayable,
        startDate: input.startDate,
        firstEmiDate: input.firstEmiDate,
        endDate:
          input.frequency === "Monthly"
            ? addMonths(input.firstEmiDate, input.tenure - 1)
            : input.firstEmiDate,
        status: "Active",
        purpose: input.purpose,
      };
      const schedule: Emi[] = [];
      let e = counters.emi;
      for (let i = 1; i <= input.tenure; i++) {
        e += 1;
        const dueDate =
          input.frequency === "Monthly"
            ? addMonths(input.firstEmiDate, i - 1)
            : addMonths(input.firstEmiDate, 0);
        schedule.push({
          id: padId("EMI", e),
          loanId: loan.id,
          customerId: loan.customerId,
          emiNo: i,
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
      const p = counters.payment + 1;
      const r = counters.receipt + 1;
      setCounters((c) => ({ ...c, payment: p, receipt: r }));
      const paymentId = padId("PAY", p);
      const receiptId = `${settings.receiptPrefix}-${String(r).padStart(5, "0")}`;
      const nowIso = new Date().toISOString();
      const amount = Math.max(0, safe(input.amount));

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

      // apply amount to the target EMI, overflow spills to the next unpaid EMIs
      setEmis((prev) => {
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
      setVisits((prev) =>
        prev.map((v) =>
          v.date === today && v.loanId === input.loanId
            ? {
                ...v,
                collected: v.collected + amount,
                status: v.collected + amount >= v.dueAmount ? "Paid" : "Partially Paid",
              }
            : v,
        ),
      );
      return { payment, receipt };
    },
    [admin.name, counters.payment, counters.receipt, settings.receiptPrefix, today],
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
          status: "Planned",
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
    notifications,
    admin,
    settings,
    addCustomer,
    updateCustomer,
    addLoan,
    recordPayment,
    updateCreditLimit,
    upsertVisit,
    addDocument,
    deleteDocument,
    updateAdmin: (patch) => setAdmin((a) => ({ ...a, ...patch })),
    updateSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
    markNotificationsRead: () => setNotifications((n) => n.map((x) => ({ ...x, read: true }))),
    closeLoan,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}


export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside AppStoreProvider");
  return ctx;
}
