import { useState, useMemo } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import {
  Phone,
  MessageSquare,
  MapPin,
  Banknote,
  PlusCircle,
  ArrowLeft,
  User,
  CreditCard,
  FileText,
  Eye,
  CalendarCheck,
  BarChart2,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Calendar,
  Layers,
  History,
  TrendingDown,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, fmtDateTime, safe, todayISO } from "@/lib/format";
import { EarlyCloseDialog } from "@/components/loans/EarlyCloseDialog";
import { EmiSchedulePrintModal } from "@/components/loans/EmiSchedulePrintModal";
import { CustomerPhotoUpload } from "@/components/customers/CustomerPhotoUpload";
import { DocumentManager } from "@/components/customers/DocumentManager";
import { BankDetailsForm } from "@/components/customers/BankDetailsForm";
import { DisbursementForm } from "@/components/loans/DisbursementForm";
import type { Loan } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/customers/$id")({
  component: CustomerProfilePage,
});

function CustomerProfilePage() {
  const { id } = useParams({ from: "/customers/$id" });
  const {
    customers,
    accounts,
    loans,
    emis,
    payments,
    visits,
    documents,
    limitHistory,
    promiseToPay,
    settings,
  } = useStore();
  const navigate = useNavigate();
  const today = todayISO();

  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [selectedPrintLoan, setSelectedPrintLoan] = useState<Loan | null>(null);
  const [selectedEarlyCloseLoan, setSelectedEarlyCloseLoan] = useState<Loan | null>(null);

  const customer = customers.find((c) => c.id === id);
  const account = accounts.find((a) => a.customerId === id);
  const customerLoans = useMemo(() => loans.filter((l) => l.customerId === id), [loans, id]);
  const activeLoans = useMemo(() => customerLoans.filter((l) => l.status === "Active"), [customerLoans]);
  const customerEmis = useMemo(() => emis.filter((e) => e.customerId === id), [emis, id]);
  const customerPayments = useMemo(() => payments.filter((p) => p.customerId === id), [payments, id]);
  const customerVisits = useMemo(() => visits.filter((v) => v.customerId === id), [visits, id]);
  const customerDocs = useMemo(() => documents.filter((d) => d.customerId === id), [documents, id]);
  const customerPtp = useMemo(() => promiseToPay.filter((ptp) => ptp.customerId === id), [promiseToPay, id]);

  const usedLimit = useMemo(() => {
    return activeLoans.reduce((sum, l) => {
      const lEmis = emis.filter((e) => e.loanId === l.id);
      const remaining = lEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0);
      return sum + remaining;
    }, 0);
  }, [activeLoans, emis]);

  const creditLimit = account?.creditLimit ?? 0;
  const availableLimit = Math.max(0, creditLimit - usedLimit);
  const usedPct = creditLimit > 0 ? Math.min(100, Math.round((usedLimit / creditLimit) * 100)) : 0;

  const overdueEmis = customerEmis.filter((e) => e.status === "Overdue");
  const overdueAmount = overdueEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0);

  // ── Unified Chronological Timeline Events ────────────────────────────────
  const timelineEvents = useMemo(() => {
    const events: Array<{
      id: string;
      date: string;
      type: "loan" | "payment" | "visit" | "ptp";
      title: string;
      desc: string;
      amount?: number | undefined;
      status?: string | undefined;
    }> = [];

    // Loans
    customerLoans.forEach((l) => {
      events.push({
        id: `evt-loan-${l.id}`,
        date: l.startDate,
        type: "loan",
        title: `Loan Disbursed: ${l.id}`,
        desc: `${l.frequency} EMI of ${inr(l.emiAmount)} • Tenure: ${l.tenure} installments`,
        amount: l.principal,
        status: l.status,
      });

      if (l.status === "Closed Early" || l.earlyClosure) {
        events.push({
          id: `evt-early-close-${l.id}`,
          date: (l.earlyClosure?.closureDate || l.startDate).slice(0, 10),
          type: "payment",
          title: `Loan Closed Early: ${l.id}`,
          desc: `Foreclosed with settlement of ${inr(l.earlyClosure?.finalClosureAmount ?? 0)}. Charge: ${inr(l.earlyClosure?.earlyClosureCharge ?? 0)} (${l.earlyClosure?.earlyClosureChargePercent ?? 0}%). Future interest waived (₹0).`,
          amount: l.earlyClosure?.finalClosureAmount,
          status: "Closed Early",
        });
      }
    });

    // Payments
    customerPayments.forEach((p) => {
      events.push({
        id: `evt-pay-${p.id}`,
        date: p.date.slice(0, 10),
        type: "payment",
        title: p.reversed ? `Payment Reversed: ${p.receiptId}` : `EMI Repayment Received: ${p.receiptId}`,
        desc: `${p.method} • Collected by ${p.collectedBy}${p.notes ? ` • "${p.notes}"` : ""}`,
        amount: p.amount,
        status: p.reversed ? "Reversed" : "Completed",
      });
    });

    // Visits
    customerVisits.forEach((v) => {
      events.push({
        id: `evt-vis-${v.id}`,
        date: v.date,
        type: "visit",
        title: `Doorstep Field Visit: ${v.id}`,
        desc: v.status === "Paid" ? `Collected ${inr(v.collected)}` : `Reason: ${v.reason || "Not Paid"}${v.nextVisit ? ` • Next visit: ${fmtDate(v.nextVisit)}` : ""}`,
        amount: v.collected > 0 ? v.collected : undefined,
        status: v.status,
      });
    });

    // PTPs
    customerPtp.forEach((ptp) => {
      events.push({
        id: `evt-ptp-${ptp.id}`,
        date: ptp.createdAt,
        type: "ptp",
        title: `Promise-to-Pay Registered (${ptp.status})`,
        desc: `Promised ${inr(ptp.promiseAmount)} on ${fmtDate(ptp.promiseDate)}${ptp.notes ? ` • "${ptp.notes}"` : ""}`,
        amount: ptp.promiseAmount,
        status: ptp.status,
      });
    });

    // Sort descending by date
    return events.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  }, [customerLoans, customerPayments, customerVisits, customerPtp]);

  // ── Customer Ledger Statement Entries ─────────────────────────────────────
  const ledgerEntries = useMemo(() => {
    type LedgerRow = {
      date: string;
      ref: string;
      desc: string;
      debit: number; // loan disbursed
      credit: number; // payment received
      balance: number;
    };

    const rows: LedgerRow[] = [];
    let runningBalance = 0;

    // Collect all transactions in chronological order
    const raw: Array<{
      date: string;
      ref: string;
      desc: string;
      debit: number;
      credit: number;
    }> = [];

    customerLoans.forEach((l) => {
      raw.push({
        date: l.startDate,
        ref: l.id,
        desc: `Loan Sanctioned & Disbursed (${l.tenure} ${l.frequency} EMIs)`,
        debit: l.totalPayable,
        credit: 0,
      });
    });

    customerPayments.forEach((p) => {
      if (!p.reversed) {
        raw.push({
          date: p.date.slice(0, 10),
          ref: p.receiptId,
          desc: `EMI Repayment via ${p.method} (${p.loanId})`,
          debit: 0,
          credit: p.amount,
        });
      }
    });

    raw.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

    raw.forEach((item) => {
      runningBalance += item.debit - item.credit;
      rows.push({
        ...item,
        balance: Math.max(0, runningBalance),
      });
    });

    return rows;
  }, [customerLoans, customerPayments]);

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-sm text-muted-foreground">Customer not found.</p>
        <Button size="sm" onClick={() => void navigate({ to: "/customers" })} className="cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back + Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void navigate({ to: "/customers" })}
          className="text-xs h-8 -ml-2 cursor-pointer w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Customers
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={() => setShowApplicationModal(true)}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Application Form
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={() => setShowStatementModal(true)}
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print Statement
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={() => window.open(`tel:${customer.mobile}`, "_self")}
          >
            <Phone className="h-3.5 w-3.5 mr-1.5" />
            Call
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={() => window.open(`https://wa.me/91${customer.mobile}`, "_blank")}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            WhatsApp
          </Button>
          <Button
            size="sm"
            className="text-xs h-8 cursor-pointer"
            onClick={() => void navigate({ to: "/collection" })}
          >
            <Banknote className="h-3.5 w-3.5 mr-1.5" />
            Collect EMI
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={() => void navigate({ to: "/loans/new" })}
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            New Loan
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="shadow-xs border-border">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {customer.photo ? (
              <img
                src={customer.photo}
                alt={customer.name}
                className="h-16 w-16 shrink-0 rounded-full object-cover border-2 border-primary/30 shadow-sm"
              />
            ) : (
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white shadow-sm"
                style={{ backgroundColor: `hsl(${customer.photoHue}, 65%, 45%)` }}
              >
                {customer.name.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-lg font-bold text-foreground truncate">{customer.name}</h1>
                <StatusBadge status={customer.status} size="sm" />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                <span className="font-mono font-medium text-foreground">{customer.id}</span>
                {account && <span className="font-mono">{account.id}</span>}
                <span>{customer.mobile}</span>
                <span>{customer.occupation}</span>
                <span>Monthly Inc: {inr(customer.monthlyIncome)}</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>
                  {customer.address.house}, {customer.address.area}, {customer.address.city},{" "}
                  {customer.address.district} — {customer.address.pin}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Credit Limit</p>
            <p className="text-base font-bold text-foreground mt-0.5">{inr(creditLimit)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Used Limit</p>
            <p className="text-base font-bold text-foreground mt-0.5">{inr(usedLimit)}</p>
            <Progress value={usedPct} className="h-1 mt-1.5" />
          </CardContent>
        </Card>
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Available</p>
            <p className="text-base font-bold text-emerald-600 mt-0.5">{inr(availableLimit)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Outstanding</p>
            <p className="text-base font-bold text-foreground mt-0.5">{inr(usedLimit)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Overdue Due</p>
            <p className={`text-base font-bold mt-0.5 ${overdueAmount > 0 ? "text-destructive" : "text-foreground"}`}>
              {inr(overdueAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max gap-0">
            {[
              { value: "timeline", label: `Timeline (${timelineEvents.length})` },
              { value: "statement", label: "Statement / Ledger" },
              { value: "ptp", label: `Promise-to-Pay (${customerPtp.length})` },
              { value: "loans", label: `Loans (${customerLoans.length})` },
              { value: "emi", label: `EMI (${customerEmis.length})` },
              { value: "payments", label: `Payments (${customerPayments.length})` },
              { value: "visits", label: `Visits (${customerVisits.length})` },
              { value: "bank", label: "Bank Details" },
              { value: "personal", label: "Profile & KYC" },
              { value: "docs", label: `Docs (${customerDocs.length})` },
            ].map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs whitespace-nowrap">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* TAB 1: TIMELINE */}
        <TabsContent value="timeline" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Customer Payment & Activity Timeline
              </CardTitle>
              <CardDescription className="text-xs">
                Unified audit trail of loans disbursed, door-to-door visits, collections, and promise-to-pay commits
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              {timelineEvents.length === 0 ? (
                <EmptyState icon={History} title="No activity recorded" className="py-8" />
              ) : (
                <div className="relative border-l-2 border-border/80 ml-3 space-y-6 py-2">
                  {timelineEvents.map((evt) => {
                    const isLoan = evt.type === "loan";
                    const isPay = evt.type === "payment";
                    const isVisit = evt.type === "visit";
                    const isPtp = evt.type === "ptp";

                    return (
                      <div key={evt.id} className="relative pl-6 text-xs">
                        {/* Timeline dot icon */}
                        <div
                          className={`absolute -left-2.5 top-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[10px] text-white shadow-xs ${
                            isLoan
                              ? "bg-blue-600"
                              : isPay
                              ? "bg-emerald-600"
                              : isVisit
                              ? "bg-amber-600"
                              : "bg-purple-600"
                          }`}
                        >
                          {isLoan ? "L" : isPay ? "₹" : isVisit ? "V" : "P"}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>{evt.title}</span>
                            {evt.status && (
                              <Badge variant="outline" className="text-[9px]">
                                {evt.status}
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">{fmtDate(evt.date)}</span>
                        </div>

                        <p className="text-muted-foreground text-[11px] mt-0.5">{evt.desc}</p>
                        {evt.amount && (
                          <p
                            className={`font-mono font-bold mt-1 ${
                              isPay ? "text-emerald-600" : isLoan ? "text-blue-600 dark:text-blue-400" : "text-foreground"
                            }`}
                          >
                            {isPay ? `+${inr(evt.amount)}` : isLoan ? `Disbursed: ${inr(evt.amount)}` : inr(evt.amount)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: STATEMENT / LEDGER */}
        <TabsContent value="statement" className="m-0 space-y-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-semibold">Account Statement & Repayment Ledger</CardTitle>
                <CardDescription className="text-xs">Chronological debit (disbursals) and credit (collections) register</CardDescription>
              </div>
              <Button size="sm" variant="outline" className="text-xs h-8 cursor-pointer" onClick={() => setShowStatementModal(true)}>
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Print Statement
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Date</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Ref / Doc</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Description</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Debit (Charges)</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Credit (Paid)</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {ledgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-muted-foreground">
                        No transactions recorded for this account.
                      </td>
                    </tr>
                  ) : (
                    ledgerEntries.map((row, idx) => (
                      <tr key={idx} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 whitespace-nowrap">{fmtDate(row.date)}</td>
                        <td className="p-3 font-mono text-[10px] text-muted-foreground">{row.ref}</td>
                        <td className="p-3">{row.desc}</td>
                        <td className="p-3 text-right font-mono text-destructive">
                          {row.debit > 0 ? inr(row.debit) : "—"}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-600 font-semibold">
                          {row.credit > 0 ? inr(row.credit) : "—"}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">{inr(row.balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 3: PROMISE-TO-PAY (PTP) */}
        <TabsContent value="ptp" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">Promise-to-Pay (PTP) Register</CardTitle>
              <CardDescription className="text-xs">Track commitments given by borrower during doorstep field visits</CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">PTP ID</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Created Date</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Promise Due Date</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Promised Amount</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerPtp.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-muted-foreground">
                        No Promise-to-Pay recorded for this customer.
                      </td>
                    </tr>
                  ) : (
                    customerPtp.map((ptp) => (
                      <tr key={ptp.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-[10px]">{ptp.id}</td>
                        <td className="p-3">{fmtDate(ptp.createdAt)}</td>
                        <td className="p-3 font-medium">{fmtDate(ptp.promiseDate)}</td>
                        <td className="p-3 text-right font-mono font-semibold">{inr(ptp.promiseAmount)}</td>
                        <td className="p-3">
                          <Badge
                            className={`text-[9px] ${
                              ptp.status === "Kept"
                                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                                : ptp.status === "Broken"
                                ? "bg-destructive/15 text-destructive border-destructive/30"
                                : "bg-amber-500/15 text-amber-600 border-amber-500/30"
                            }`}
                          >
                            {ptp.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">{ptp.notes || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 4: LOANS */}
        <TabsContent value="loans" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">Loan Contracts</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    {["Loan ID", "Principal", "EMI", "Frequency", "Tenure", "Start Date", "Status", "Early Closure Info", "Actions"].map((h) => (
                      <th key={h} className="text-left p-3 text-[10px] text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerLoans.map((l) => {
                    const isClosedEarly = l.status === "Closed Early" || Boolean(l.earlyClosure);
                    const lEmis = emis.filter((e) => e.loanId === l.id);
                    const lPaid = payments.filter((p) => p.loanId === l.id && !p.reversed).reduce((s, p) => s + p.amount, 0);
                    const rem = isClosedEarly ? 0 : Math.max(0, l.totalPayable - lPaid);
                    const canEarlyClose = l.status !== "Closed" && !isClosedEarly && rem > 0;

                    return (
                      <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-xs font-medium">{l.id}</td>
                        <td className="p-3 font-mono">{inr(l.principal)}</td>
                        <td className="p-3 font-mono">{inr(l.emiAmount)}</td>
                        <td className="p-3">{l.frequency}</td>
                        <td className="p-3">{l.tenure}</td>
                        <td className="p-3">{fmtDate(l.startDate)}</td>
                        <td className="p-3">
                          <StatusBadge status={l.status} />
                        </td>
                        <td className="p-3">
                          {isClosedEarly && l.earlyClosure ? (
                            <div className="text-[10px] space-y-0.5 font-mono text-purple-700 dark:text-purple-400 bg-purple-500/10 p-1.5 rounded border border-purple-500/20">
                              <p className="font-bold">Closed Early: {fmtDate(l.earlyClosure.closureDate)}</p>
                              <p>Settlement: {inr(l.earlyClosure.finalClosureAmount)} (Charge: {inr(l.earlyClosure.earlyClosureCharge)})</p>
                              <p className="text-muted-foreground text-[9px]">Receipt: {l.earlyClosure.receiptId} • Pay: {l.earlyClosure.paymentId}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[11px] h-7 px-2 cursor-pointer"
                              title="Print EMI Schedule"
                              onClick={() => setSelectedPrintLoan(l)}
                            >
                              <Printer className="h-3 w-3 mr-1 text-primary" />
                              Print
                            </Button>

                            {canEarlyClose && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[11px] h-7 px-2 border-purple-500/30 text-purple-700 dark:text-purple-400 hover:bg-purple-500/10 cursor-pointer"
                                title="Early Close Loan"
                                onClick={() => setSelectedEarlyCloseLoan(l)}
                              >
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Close Early
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-2 cursor-pointer"
                              onClick={() => void navigate({ to: "/loans/$id", params: { id: l.id } })}
                            >
                              View →
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 5: EMI SCHEDULE */}
        <TabsContent value="emi" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">All EMI Installments</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    {["EMI ID", "Loan", "#", "Due Date", "Amount", "Paid", "Remaining", "Status"].map((h) => (
                      <th key={h} className={`p-3 text-[10px] text-muted-foreground font-medium ${h === "Amount" || h === "Paid" || h === "Remaining" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerEmis.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-[10px] text-muted-foreground">{e.id}</td>
                      <td className="p-3 font-mono text-[10px]">{e.loanId}</td>
                      <td className="p-3">{e.emiNo}</td>
                      <td className="p-3">{fmtDate(e.dueDate)}</td>
                      <td className="p-3 text-right font-mono">{inr(e.amount)}</td>
                      <td className="p-3 text-right font-mono text-emerald-600">{inr(e.paid)}</td>
                      <td className="p-3 text-right font-mono">{inr(Math.max(0, e.amount - e.paid))}</td>
                      <td className="p-3"><StatusBadge status={e.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 6: PAYMENTS */}
        <TabsContent value="payments" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">Repayment History</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Receipt</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Loan</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Amount</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Method</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Date</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Collector</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerPayments.length === 0 ? (
                    <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No payments recorded</td></tr>
                  ) : (
                    customerPayments.map((p) => (
                      <tr key={p.id} className={`hover:bg-muted/30 transition-colors ${p.reversed ? "opacity-60 line-through" : ""}`}>
                        <td className="p-3 font-mono text-[10px]">{p.receiptId}</td>
                        <td className="p-3 font-mono text-[10px]">{p.loanId}</td>
                        <td className="p-3 text-right font-mono font-semibold text-emerald-600">+{inr(p.amount)}</td>
                        <td className="p-3"><Badge variant="outline" className="text-[9px]">{p.method}</Badge></td>
                        <td className="p-3">{fmtDateTime(p.date)}</td>
                        <td className="p-3 text-muted-foreground">{p.collectedBy}</td>
                        <td className="p-3">
                          {p.reversed ? (
                            <Badge variant="destructive" className="text-[9px]">Reversed</Badge>
                          ) : (
                            <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Valid</Badge>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB 7: VISITS */}
        <TabsContent value="visits" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">Field Visits History</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Visit ID</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Date</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Due</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Collected</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Reason / Remarks</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Next Visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerVisits.length === 0 ? (
                    <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No visits recorded</td></tr>
                  ) : (
                    customerVisits.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-[10px]">{v.id}</td>
                        <td className="p-3">{fmtDate(v.date)}</td>
                        <td className="p-3 text-right font-mono">{inr(v.dueAmount)}</td>
                        <td className="p-3 text-right font-mono text-emerald-600">{inr(v.collected)}</td>
                        <td className="p-3"><StatusBadge status={v.status} /></td>
                        <td className="p-3 text-muted-foreground max-w-xs truncate">{v.reason || v.notes || "—"}</td>
                        <td className="p-3 text-muted-foreground">{v.nextVisit ? fmtDate(v.nextVisit) : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* TAB: BANK DETAILS */}
        <TabsContent value="bank" className="m-0">
          <BankDetailsForm customerId={customer.id} />
        </TabsContent>

        {/* TAB 8: PROFILE & KYC */}
        <TabsContent value="personal" className="m-0 space-y-4">
          <CustomerPhotoUpload customer={customer} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 pb-2 border-b border-border/60">
                <CardTitle className="text-xs font-semibold">Personal & KYC Details</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5 text-xs">
                {[
                  { label: "Father / Guardian", value: customer.guardianName },
                  { label: "Date of Birth", value: fmtDate(customer.dob) },
                  { label: "Gender", value: customer.gender },
                  { label: "Occupation", value: customer.occupation },
                  { label: "Monthly Income", value: inr(customer.monthlyIncome) },
                  { label: "KYC Document", value: `${customer.kycType} (${customer.kycNumber})` },
                  { label: "Primary Mobile", value: customer.mobile },
                  { label: "Alternate Mobile", value: customer.altMobile || "—" },
                  { label: "Registration Date", value: fmtDate(customer.createdAt) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 pb-2 border-b border-border/60">
                <CardTitle className="text-xs font-semibold">Nominee & Guarantor</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wide mb-1.5">Nominee</h4>
                  <div className="space-y-1 text-muted-foreground">
                    <p><strong>Name:</strong> {customer.nominee.name || "—"}</p>
                    <p><strong>Relationship:</strong> {customer.nominee.relationship || "—"}</p>
                    <p><strong>Mobile:</strong> {customer.nominee.mobile || "—"}</p>
                    <p><strong>Address:</strong> {customer.nominee.address || "—"}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-border/60">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wide mb-1.5">Guarantor</h4>
                  <div className="space-y-1 text-muted-foreground">
                    <p><strong>Name:</strong> {customer.guarantor.name || "—"}</p>
                    <p><strong>Relationship:</strong> {customer.guarantor.relationship || "—"}</p>
                    <p><strong>Mobile:</strong> {customer.guarantor.mobile || "—"}</p>
                    <p><strong>Address:</strong> {customer.guarantor.address || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 9: DOCS */}
        <TabsContent value="docs" className="m-0">
          <DocumentManager customerId={customer.id} />
        </TabsContent>
      </Tabs>

      {/* ==================================================================== */}
      {/* CUSTOMER APPLICATION FORM MODAL (Print-Friendly) */}
      {/* ==================================================================== */}
      <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold">{settings.businessName}</DialogTitle>
                <p className="text-xs text-muted-foreground">{settings.businessAddress} • Ph: {settings.businessPhone}</p>
              </div>
              <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Customer File</Badge>
            </div>
          </DialogHeader>

          <div id="printable-customer-app" className="space-y-4 text-xs py-2">
            <div className="text-center border-b border-border/60 pb-2">
              <h2 className="text-base font-bold uppercase tracking-wider text-foreground">
                Customer Enrollment & Account Application
              </h2>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                Customer Ref: {customer.id} • Account: {account?.id || "ACC-NEW"} • Date: {fmtDate(customer.createdAt)}
              </p>
            </div>

            {/* KYC & Identity Table */}
            <div>
              <h3 className="font-bold text-foreground text-xs uppercase tracking-wide mb-1.5">1. Primary Borrower Details</h3>
              <table className="w-full border border-border text-xs">
                <tbody>
                  <tr className="border-b border-border">
                    <td className="p-2 bg-muted/40 font-semibold w-1/4">Full Name</td>
                    <td className="p-2 w-1/4 font-medium">{customer.name}</td>
                    <td className="p-2 bg-muted/40 font-semibold w-1/4">Father / Guardian</td>
                    <td className="p-2 w-1/4">{customer.guardianName}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2 bg-muted/40 font-semibold">Mobile Number</td>
                    <td className="p-2 font-mono">{customer.mobile}</td>
                    <td className="p-2 bg-muted/40 font-semibold">Alternate Mobile</td>
                    <td className="p-2 font-mono">{customer.altMobile || "—"}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2 bg-muted/40 font-semibold">Date of Birth</td>
                    <td className="p-2">{fmtDate(customer.dob)}</td>
                    <td className="p-2 bg-muted/40 font-semibold">Gender</td>
                    <td className="p-2">{customer.gender}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2 bg-muted/40 font-semibold">Occupation</td>
                    <td className="p-2">{customer.occupation}</td>
                    <td className="p-2 bg-muted/40 font-semibold">Monthly Income</td>
                    <td className="p-2 font-mono font-semibold">{inr(customer.monthlyIncome)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2 bg-muted/40 font-semibold">KYC Proof Type</td>
                    <td className="p-2">{customer.kycType}</td>
                    <td className="p-2 bg-muted/40 font-semibold">KYC Document No.</td>
                    <td className="p-2 font-mono font-bold">{customer.kycNumber}</td>
                  </tr>
                  <tr>
                    <td className="p-2 bg-muted/40 font-semibold">Residential Address</td>
                    <td colSpan={3} className="p-2">
                      {customer.address.house}, {customer.address.area}, {customer.address.city}, {customer.address.district} — {customer.address.pin}
                      {customer.address.landmark ? ` (Landmark: ${customer.address.landmark})` : ""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Nominee & Guarantor */}
            <div>
              <h3 className="font-bold text-foreground text-xs uppercase tracking-wide mb-1.5">2. Nominee & Guarantor Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 border border-border rounded-md bg-muted/20 space-y-1">
                  <p className="font-bold text-foreground">Nominee Details</p>
                  <p><strong>Name:</strong> {customer.nominee.name || "—"}</p>
                  <p><strong>Relationship:</strong> {customer.nominee.relationship || "—"}</p>
                  <p><strong>Mobile:</strong> {customer.nominee.mobile || "—"}</p>
                  <p><strong>Address:</strong> {customer.nominee.address || "—"}</p>
                </div>
                <div className="p-2.5 border border-border rounded-md bg-muted/20 space-y-1">
                  <p className="font-bold text-foreground">Guarantor Details</p>
                  <p><strong>Name:</strong> {customer.guarantor.name || "—"}</p>
                  <p><strong>Relationship:</strong> {customer.guarantor.relationship || "—"}</p>
                  <p><strong>Mobile:</strong> {customer.guarantor.mobile || "—"}</p>
                  <p><strong>Address:</strong> {customer.guarantor.address || "—"}</p>
                </div>
              </div>
            </div>

            {/* Account Parameters */}
            <div>
              <h3 className="font-bold text-foreground text-xs uppercase tracking-wide mb-1.5">3. Institutional Sanction Limit</h3>
              <div className="p-3 border border-border rounded-md bg-muted/10 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-foreground">Approved Borrower Credit Limit</p>
                  <p className="text-[11px] text-muted-foreground">Account: {account?.id || "ACC-001"} • Opened: {fmtDate(account?.openedAt)}</p>
                </div>
                <span className="font-mono text-base font-bold text-emerald-600">{inr(creditLimit)}</span>
              </div>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
              <div className="border-t border-foreground/40 pt-1.5">
                <p className="font-semibold">Borrower Signature</p>
                <p className="text-[10px] text-muted-foreground">{customer.name}</p>
              </div>
              <div className="border-t border-foreground/40 pt-1.5">
                <p className="font-semibold">Guarantor Signature</p>
                <p className="text-[10px] text-muted-foreground">{customer.guarantor.name || "Guarantor"}</p>
              </div>
              <div className="border-t border-foreground/40 pt-1.5">
                <p className="font-semibold">Branch Officer</p>
                <p className="text-[10px] text-muted-foreground">{settings.businessName}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 pt-3 gap-2">
            <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setShowApplicationModal(false)}>
              Close
            </Button>
            <Button size="sm" className="text-xs cursor-pointer" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Application File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* CUSTOMER ACCOUNT STATEMENT MODAL (Print-Friendly) */}
      {/* ==================================================================== */}
      <Dialog open={showStatementModal} onOpenChange={setShowStatementModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold">{settings.businessName}</DialogTitle>
                <p className="text-xs text-muted-foreground">{settings.businessAddress} • Ph: {settings.businessPhone}</p>
              </div>
              <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Official Statement</Badge>
            </div>
          </DialogHeader>

          <div id="printable-statement" className="space-y-4 text-xs py-2">
            <div className="text-center border-b border-border/60 pb-2">
              <h2 className="text-base font-bold uppercase tracking-wider text-foreground">
                Statement of Loan Account
              </h2>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                Customer: {customer.name} ({customer.id}) • Statement Date: {fmtDate(today)}
              </p>
            </div>

            {/* Account Status Summary */}
            <div className="grid grid-cols-4 gap-2 text-center p-3 rounded-lg border border-border bg-muted/20">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Credit Limit</p>
                <p className="font-mono font-bold text-xs mt-0.5">{inr(creditLimit)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Total Active Loans</p>
                <p className="font-mono font-bold text-xs mt-0.5">{activeLoans.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Total Outstanding</p>
                <p className="font-mono font-bold text-xs mt-0.5">{inr(usedLimit)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Overdue Balance</p>
                <p className={`font-mono font-bold text-xs mt-0.5 ${overdueAmount > 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {inr(overdueAmount)}
                </p>
              </div>
            </div>

            {/* Transaction Ledger Table */}
            <table className="w-full border border-border text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Ref</th>
                  <th className="p-2 text-left">Description</th>
                  <th className="p-2 text-right">Debit (₹)</th>
                  <th className="p-2 text-right">Credit (₹)</th>
                  <th className="p-2 text-right">Balance Due (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ledgerEntries.map((row, i) => (
                  <tr key={i}>
                    <td className="p-2 whitespace-nowrap">{fmtDate(row.date)}</td>
                    <td className="p-2 font-mono text-[10px]">{row.ref}</td>
                    <td className="p-2">{row.desc}</td>
                    <td className="p-2 text-right font-mono text-destructive">{row.debit > 0 ? inr(row.debit) : "—"}</td>
                    <td className="p-2 text-right font-mono text-emerald-600">{row.credit > 0 ? inr(row.credit) : "—"}</td>
                    <td className="p-2 text-right font-mono font-bold">{inr(row.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-6 border-t border-border/60 flex justify-between items-center text-[11px] text-muted-foreground">
              <span>Computer generated statement. Does not require physical seal.</span>
              <span>Generated on {fmtDateTime(new Date().toISOString())}</span>
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 pt-3 gap-2">
            <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setShowStatementModal(false)}>
              Close
            </Button>
            <Button size="sm" className="text-xs cursor-pointer" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Official Statement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Early Close Loan Dialog */}
      <EarlyCloseDialog
        loan={selectedEarlyCloseLoan}
        customer={customer}
        open={Boolean(selectedEarlyCloseLoan)}
        onOpenChange={(open) => {
          if (!open) setSelectedEarlyCloseLoan(null);
        }}
      />

      {/* Print EMI Schedule Modal */}
      <EmiSchedulePrintModal
        loan={selectedPrintLoan}
        customer={customer}
        open={Boolean(selectedPrintLoan)}
        onOpenChange={(open) => {
          if (!open) setSelectedPrintLoan(null);
        }}
      />
    </div>
  );
}
