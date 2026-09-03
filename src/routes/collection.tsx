import { useState, useMemo, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Banknote,
  Search,
  CheckCircle2,
  Phone,
  MessageSquare,
  MapPin,
  User,
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  Printer,
  ArrowRight,
  Info,
  Calendar,
  Compass,
  FileCheck,
  RotateCcw,
} from "lucide-react";
import { collectionPriorityScore, resolveCurrentEmi, useStore } from "@/store/app-store";
import { inr, fmtDate, fmtDateTime, todayISO, addDays } from "@/lib/format";
import type { PaymentMethod, Receipt, VisitStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/collection")({
  component: CollectionPage,
});

const VISIT_REASONS = [
  "Customer Not Available",
  "Refused to Pay",
  "Promised to Pay Later",
  "Business Loss / Financial Crunch",
  "Medical Emergency",
  "Customer Shifted / Relocated",
  "Dispute on Interest / Balance",
  "Other Reason",
];

function CollectionPage() {
  const {
    customers,
    loans,
    emis,
    recordPayment,
    upsertVisit,
    addPromiseToPay,
    today,
    payments,
    visits,
    settings,
    admin,
  } = useStore();
  const navigate = useNavigate();

  // Step state: 1=search, 2=customer, 3=payment, 5=success
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [selectedEmiId, setSelectedEmiId] = useState<string>("");
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("Cash");
  const [payNotes, setPayNotes] = useState<string>("");
  const [lastReceipt, setLastReceipt] = useState<Receipt | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Overpayment dialog state
  const [showOverpayDialog, setShowOverpayDialog] = useState(false);
  const [excessAction, setExcessAction] = useState<"next" | "advance">("next");

  // No Payment / Visit dialog state
  const [showVisitDialog, setShowVisitDialog] = useState(false);
  const [visitReason, setVisitReason] = useState<string>(VISIT_REASONS[0] ?? "Customer Not Available");
  const [visitNextDate, setVisitNextDate] = useState<string>(addDays(today, 2));
  const [visitNotes, setVisitNotes] = useState<string>("");
  const [includePtp, setIncludePtp] = useState<boolean>(true);
  const [ptpAmount, setPtpAmount] = useState<string>("");

  // Daily Closing confirmation modal
  const [showCloseDayModal, setShowCloseDayModal] = useState(false);
  const [dayClosed, setDayClosed] = useState(false);

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.mobile.includes(q) ||
          c.address.area.toLowerCase().includes(q) ||
          c.address.city.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [customers, searchQuery]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const customerLoans = useMemo(
    () => loans.filter((l) => l.customerId === selectedCustomerId && l.status !== "Closed"),
    [loans, selectedCustomerId],
  );
  const activeLoan = customerLoans.find((l) => l.id === selectedLoanId) ?? customerLoans[0];

  const allLoanEmis = useMemo(() => {
    if (!activeLoan) return [];
    return emis.filter((e) => e.loanId === activeLoan.id).sort((a, b) => a.emiNo - b.emiNo);
  }, [activeLoan, emis]);

  // Target EMI resolution: priority order (Partial > Overdue > Due today > Next)
  const targetEmi = useMemo(() => {
    if (!activeLoan) return null;
    if (selectedEmiId) {
      const found = allLoanEmis.find((e) => e.id === selectedEmiId);
      if (found) return found;
    }
    return resolveCurrentEmi(allLoanEmis, today);
  }, [activeLoan, allLoanEmis, selectedEmiId, today]);

  // Determine previous and next EMI relative to targetEmi
  const prevEmi = useMemo(() => {
    if (!targetEmi) return null;
    return allLoanEmis.find((e) => e.emiNo === targetEmi.emiNo - 1) ?? null;
  }, [allLoanEmis, targetEmi]);

  const nextEmi = useMemo(() => {
    if (!targetEmi) return null;
    return allLoanEmis.find((e) => e.emiNo === targetEmi.emiNo + 1) ?? null;
  }, [allLoanEmis, targetEmi]);

  const targetRemaining = targetEmi ? Math.max(0, targetEmi.amount - targetEmi.paid) : 0;

  const parsedAmount = parseFloat(payAmount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const isOverpayment = isValidAmount && parsedAmount > targetRemaining;
  const willPartial = isValidAmount && parsedAmount < targetRemaining;

  const handleSelectCustomer = useCallback((id: string) => {
    setSelectedCustomerId(id);
    setSelectedLoanId("");
    setSelectedEmiId("");
    setPayAmount("");
    setLastReceipt(null);
    setStep(2);
    setSearchQuery("");
  }, []);

  const handleInitiateCollect = () => {
    if (!isValidAmount) return;
    if (isOverpayment) {
      setShowOverpayDialog(true);
    } else {
      setShowConfirm(true);
    }
  };

  const handleRecordPayment = useCallback(() => {
    if (!selectedCustomer || !activeLoan || !targetEmi) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return;

    setIsSubmitting(true);
    const res = recordPayment({
      customerId: selectedCustomer.id,
      loanId: activeLoan.id,
      emiId: targetEmi.id,
      amount: amt,
      method: payMethod,
      notes: payNotes,
      excessAction,
    });

    setLastReceipt(res.receipt);
    setShowConfirm(false);
    setShowOverpayDialog(false);
    setStep(5);
    setIsSubmitting(false);
  }, [selectedCustomer, activeLoan, targetEmi, payAmount, payMethod, payNotes, excessAction, recordPayment]);

  const handleSaveNoPaymentVisit = useCallback(() => {
    if (!selectedCustomer || !activeLoan) return;
    const dueAmt = targetRemaining;

    // 1. Save doorstep visit
    const visit = upsertVisit({
      customerId: selectedCustomer.id,
      loanId: activeLoan.id,
      date: today,
      dueAmount: dueAmt,
      collected: 0,
      status: "Not Paid" as VisitStatus,
      reason: visitReason,
      nextVisit: visitNextDate,
      notes: visitNotes,
    });

    // 2. If PTP enabled, save promise to pay
    if (includePtp && targetEmi) {
      const pAmt = parseFloat(ptpAmount) || dueAmt;
      addPromiseToPay({
        customerId: selectedCustomer.id,
        loanId: activeLoan.id,
        emiId: targetEmi.id,
        promiseDate: visitNextDate,
        promiseAmount: pAmt,
        notes: visitNotes || `Promise recorded during doorstep visit: ${visitReason}`,
        visitId: visit.id,
      });
    }

    setShowVisitDialog(false);
    setStep(1);
    setSelectedCustomerId("");
  }, [selectedCustomer, activeLoan, targetRemaining, upsertVisit, today, visitReason, visitNextDate, visitNotes, includePtp, targetEmi, ptpAmount, addPromiseToPay]);

  const handleNextCustomer = () => {
    setStep(1);
    setSelectedCustomerId("");
    setSelectedLoanId("");
    setSelectedEmiId("");
    setPayAmount("");
    setPayNotes("");
    setLastReceipt(null);
    setSearchQuery("");
  };

  // ── Metrics for today ─────────────────────────────────────────────────────
  const todayPayments = payments.filter((p) => p.date.slice(0, 10) === today && !p.reversed);
  const totalToday = todayPayments.reduce((s, p) => s + p.amount, 0);
  const cashToday = todayPayments.filter((p) => p.method === "Cash").reduce((s, p) => s + p.amount, 0);
  const upiToday = todayPayments.filter((p) => p.method === "UPI").reduce((s, p) => s + p.amount, 0);
  const bankToday = todayPayments.filter((p) => p.method === "Bank").reduce((s, p) => s + p.amount, 0);

  const dueTodayEmis = emis.filter((e) => (e.dueDate === today || e.status === "Overdue") && e.paid < e.amount);
  const totalDue = dueTodayEmis.reduce((s, e) => s + (e.amount - e.paid), 0);
  const pendingCount = dueTodayEmis.length - todayPayments.length;
  const collectionPct = totalDue > 0 ? Math.min(100, Math.round((totalToday / totalDue) * 100)) : 0;

  // ── Route planner stops ───────────────────────────────────────────────────
  const routeStops = useMemo(() => {
    const stops: Array<{
      customer: (typeof customers)[0];
      loan: (typeof loans)[0];
      emi: (typeof emis)[0];
      priority: number;
    }> = [];

    dueTodayEmis.forEach((emi) => {
      const cust = customers.find((c) => c.id === emi.customerId);
      const loan = loans.find((l) => l.id === emi.loanId);
      if (cust && loan) {
        stops.push({
          customer: cust,
          loan,
          emi,
          priority: collectionPriorityScore(emi, today),
        });
      }
    });

    // Sort descending by collection priority
    return stops.sort((a, b) => b.priority - a.priority);
  }, [dueTodayEmis, customers, loans, today]);

  // Group route stops by Area
  const stopsByArea = useMemo(() => {
    const map = new Map<string, typeof routeStops>();
    routeStops.forEach((stop) => {
      const area = stop.customer.address.area || "General Area";
      if (!map.has(area)) map.set(area, []);
      map.get(area)!.push(stop);
    });
    return Array.from(map.entries());
  }, [routeStops]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Field Collection</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Doorstep EMI collection, route planner, overpayment handling & instant receipts
          </p>
        </div>
      </div>

      <Tabs defaultValue="collect" className="space-y-4">
        <TabsList className="grid grid-cols-4 max-w-lg">
          <TabsTrigger value="collect" className="text-xs">Collect EMI</TabsTrigger>
          <TabsTrigger value="route" className="text-xs">Route ({routeStops.length})</TabsTrigger>
          <TabsTrigger value="today" className="text-xs">Log ({todayPayments.length})</TabsTrigger>
          <TabsTrigger value="closing" className="text-xs">Daily Closing</TabsTrigger>
        </TabsList>

        {/* ==================================================================== */}
        {/* TAB 1: COLLECT EMI */}
        {/* ==================================================================== */}
        <TabsContent value="collect" className="m-0 space-y-4">
          {/* STEP 1: SEARCH */}
          {step === 1 && (
            <Card className="shadow-xs border-border">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-semibold">Search Customer</CardTitle>
                <CardDescription className="text-xs">Search by Name, CUS-ID, Mobile number, or Area</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="customer-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. CUS-000125, Ramesh, 9876543210, Gandhi Nagar..."
                    className="pl-11 h-12 text-sm font-medium"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {searchResults.length > 0 && (
                  <div className="border border-border rounded-lg divide-y divide-border/60 overflow-hidden">
                    {searchResults.map((c) => {
                      const custEmis = emis.filter((e) => e.customerId === c.id && e.paid < e.amount);
                      const hasOverdue = custEmis.some((e) => e.status === "Overdue");
                      const hasPartial = custEmis.some((e) => e.status === "Partial");
                      const hasDueToday = custEmis.some((e) => e.dueDate === today);
                      return (
                        <button
                          key={c.id}
                          onClick={() => handleSelectCustomer(c.id)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                              style={{ backgroundColor: `hsl(${c.photoHue}, 65%, 45%)` }}
                            >
                              {c.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-foreground group-hover:text-primary">{c.name}</div>
                              <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{c.id} • {c.mobile}</div>
                              <div className="text-[10px] text-muted-foreground">{c.address.area}, {c.address.city}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasOverdue && <Badge variant="destructive" className="text-[9px]">Overdue</Badge>}
                            {hasPartial && <Badge className="text-[9px] bg-amber-500/15 text-amber-600 border-amber-500/30">Partial</Badge>}
                            {hasDueToday && !hasOverdue && <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">Due Today</Badge>}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {searchQuery.trim() && searchResults.length === 0 && (
                  <EmptyState
                    icon={User}
                    title="No customers found"
                    description={`No matching records for "${searchQuery}"`}
                    className="py-8"
                  />
                )}

                {!searchQuery && (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    Enter customer details above or pick from the <strong className="text-foreground">Route Planner</strong> tab
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* STEP 2: CUSTOMER DETAILS */}
          {step === 2 && selectedCustomer && (
            <div className="space-y-4">
              <button
                onClick={() => setStep(1)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                ← Back to Search
              </button>

              {/* Customer Profile Card */}
              <Card className="shadow-xs border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold text-white"
                        style={{ backgroundColor: `hsl(${selectedCustomer.photoHue}, 65%, 45%)` }}
                      >
                        {selectedCustomer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{selectedCustomer.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{selectedCustomer.id}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{selectedCustomer.mobile}</div>
                        <div className="text-xs text-muted-foreground">
                          {selectedCustomer.address.house}, {selectedCustomer.address.area},{" "}
                          {selectedCustomer.address.city}
                          {selectedCustomer.address.landmark && ` — Near ${selectedCustomer.address.landmark}`}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={selectedCustomer.status} />
                  </div>

                  {/* Contact Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/60">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 flex-1 cursor-pointer"
                      onClick={() => window.open(`tel:${selectedCustomer.mobile}`, "_self")}
                    >
                      <Phone className="h-3.5 w-3.5 mr-1.5" />
                      Call
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 flex-1 cursor-pointer"
                      onClick={() => window.open(`https://wa.me/91${selectedCustomer.mobile}`, "_blank")}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 flex-1 cursor-pointer"
                      onClick={() => {
                        const addr = [selectedCustomer.address.house, selectedCustomer.address.area, selectedCustomer.address.city].join(", ");
                        window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, "_blank");
                      }}
                    >
                      <MapPin className="h-3.5 w-3.5 mr-1.5" />
                      Navigate
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Loan Selector & Multi-EMI Context Strip */}
              {customerLoans.length === 0 ? (
                <EmptyState icon={Banknote} title="No active loans" description="This customer has no active loans." />
              ) : (
                <div className="space-y-3">
                  {customerLoans.length > 1 && (
                    <div className="flex gap-2 flex-wrap items-center">
                      <span className="text-xs text-muted-foreground">Select Loan:</span>
                      {customerLoans.map((l) => (
                        <Button
                          key={l.id}
                          size="sm"
                          variant={l.id === activeLoan?.id ? "default" : "outline"}
                          className="text-xs h-8 cursor-pointer"
                          onClick={() => {
                            setSelectedLoanId(l.id);
                            setSelectedEmiId("");
                          }}
                        >
                          {l.id} ({l.frequency})
                        </Button>
                      ))}
                    </div>
                  )}

                  {/* Previous / Current / Next EMI Timeline Strip */}
                  <Card className="shadow-xs border-border">
                    <CardHeader className="p-4 pb-2 border-b border-border/60">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-semibold">Installment Context (Loan {activeLoan?.id})</CardTitle>
                        <Badge variant="outline" className="text-[10px]">{activeLoan?.frequency} EMI</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="grid grid-cols-3 gap-2">
                        {/* Previous EMI */}
                        <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-center">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Previous</span>
                          {prevEmi ? (
                            <div className="mt-1">
                              <p className="font-mono font-medium">#{prevEmi.emiNo}</p>
                              <p className="text-[10px] text-muted-foreground">{fmtDate(prevEmi.dueDate)}</p>
                              <StatusBadge status={prevEmi.status} size="sm" className="mt-1" />
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground mt-2">None (First)</p>
                          )}
                        </div>

                        {/* Current Target EMI */}
                        <div className="p-2.5 rounded-lg border-2 border-primary bg-primary/5 text-center">
                          <span className="text-[10px] text-primary uppercase font-bold">Current Due</span>
                          {targetEmi ? (
                            <div className="mt-1">
                              <p className="font-mono font-bold text-foreground">#{targetEmi.emiNo}</p>
                              <p className="text-[10px] text-muted-foreground">{fmtDate(targetEmi.dueDate)}</p>
                              <StatusBadge status={targetEmi.status} size="sm" className="mt-1" />
                              <p className="font-mono font-bold text-primary text-xs mt-1">{inr(targetRemaining)}</p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-emerald-600 font-semibold mt-2">All Cleared</p>
                          )}
                        </div>

                        {/* Next EMI */}
                        <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-center">
                          <span className="text-[10px] text-muted-foreground uppercase font-semibold">Next</span>
                          {nextEmi ? (
                            <div className="mt-1">
                              <p className="font-mono font-medium">#{nextEmi.emiNo}</p>
                              <p className="text-[10px] text-muted-foreground">{fmtDate(nextEmi.dueDate)}</p>
                              <StatusBadge status={nextEmi.status} size="sm" className="mt-1" />
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground mt-2">Final EMI</p>
                          )}
                        </div>
                      </div>

                      {targetEmi && (
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/60 space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">EMI Installment #{targetEmi.emiNo}:</span>
                            <span className="font-mono font-bold">{inr(targetEmi.amount)}</span>
                          </div>
                          {targetEmi.paid > 0 && (
                            <div className="flex justify-between text-emerald-600">
                              <span>Previously Paid:</span>
                              <span className="font-mono font-semibold">-{inr(targetEmi.paid)}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-border/50 pt-1.5 font-bold">
                            <span>Balance Due Today:</span>
                            <span className="font-mono text-primary text-sm">{inr(targetRemaining)}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Dual Actions: Collect vs No Payment */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant="outline"
                      className="h-12 text-xs font-semibold cursor-pointer border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                      onClick={() => {
                        setPtpAmount(String(targetRemaining));
                        setShowVisitDialog(true);
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-1.5" />
                      No Payment / PTP
                    </Button>
                    <Button
                      className="h-12 text-xs font-semibold cursor-pointer"
                      disabled={!targetEmi}
                      onClick={() => {
                        setPayAmount(String(targetRemaining));
                        setStep(3);
                      }}
                    >
                      <Banknote className="h-4 w-4 mr-1.5" />
                      Collect Payment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PAYMENT FORM */}
          {step === 3 && selectedCustomer && activeLoan && targetEmi && (
            <div className="space-y-4">
              <button
                onClick={() => setStep(2)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                ← Back to Customer
              </button>

              <Card className="shadow-xs border-border">
                <CardHeader className="p-4 pb-3 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">{selectedCustomer.name}</CardTitle>
                      <CardDescription className="text-xs font-mono">
                        {selectedCustomer.id} • {activeLoan.id} • EMI #{targetEmi.emiNo}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Due Remaining</div>
                      <div className="text-base font-bold font-mono text-primary">{inr(targetRemaining)}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Amount Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="collect-amount" className="text-xs font-medium">Payment Amount (₹)</Label>
                      {targetRemaining > 0 && (
                        <button
                          type="button"
                          onClick={() => setPayAmount(String(targetRemaining))}
                          className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Exact Due ({inr(targetRemaining)})
                        </button>
                      )}
                    </div>
                    <Input
                      id="collect-amount"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Enter amount received..."
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="h-12 text-lg font-mono font-bold"
                    />

                    {/* Amount validation indicator */}
                    {isValidAmount && (
                      <div
                        className={`flex items-center gap-1.5 text-xs mt-1 p-2 rounded-md ${
                          isOverpayment
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : willPartial
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {isOverpayment ? (
                          <>
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>
                              Overpayment by {inr(parsedAmount - targetRemaining)}. Click Collect to choose how to allocate excess.
                            </span>
                          </>
                        ) : willPartial ? (
                          <>
                            <Info className="h-4 w-4 shrink-0" />
                            <span>
                              Part payment of {inr(parsedAmount)}. Balance remaining: {inr(targetRemaining - parsedAmount)}.
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span>Full EMI amount cleared ({inr(parsedAmount)}).</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Payment Method</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["Cash", "UPI", "Bank"] as PaymentMethod[]).map((m) => (
                        <Button
                          key={m}
                          type="button"
                          variant={payMethod === m ? "default" : "outline"}
                          onClick={() => setPayMethod(m)}
                          className="h-11 text-sm font-medium cursor-pointer"
                        >
                          {m}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor="collect-notes" className="text-xs font-medium">Notes (optional)</Label>
                    <Input
                      id="collect-notes"
                      placeholder="e.g. Collected at doorstep, QR paid, paid by nominee..."
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </CardContent>

                <CardFooter className="p-4 pt-0">
                  <Button
                    className="w-full h-12 text-base font-semibold cursor-pointer"
                    disabled={!isValidAmount}
                    onClick={handleInitiateCollect}
                  >
                    <Banknote className="h-5 w-5 mr-2" />
                    Record {isValidAmount ? inr(parsedAmount) : "Payment"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === 5 && lastReceipt && selectedCustomer && (
            <div className="space-y-4">
              <Card className="shadow-xs border-emerald-500/40 bg-emerald-500/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 text-emerald-600 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-base font-bold">Payment Collected!</div>
                      <div className="text-xs text-muted-foreground">Receipt issued and doorstep visit recorded</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-background border border-border space-y-2.5 text-xs">
                    {[
                      { label: "Receipt Number", value: lastReceipt.id, bold: true, mono: true },
                      { label: "Customer", value: selectedCustomer.name, bold: false, mono: false },
                      { label: "Customer ID", value: selectedCustomer.id, bold: false, mono: true },
                      { label: "Loan ID", value: lastReceipt.loanId, bold: false, mono: true },
                      { label: "Amount Paid", value: inr(lastReceipt.amount), bold: true, mono: true, className: "text-emerald-600 text-sm" },
                      { label: "Method", value: lastReceipt.method, bold: false, mono: false },
                      { label: "Date & Time", value: fmtDateTime(lastReceipt.date), bold: false, mono: false },
                    ].map(({ label, value, bold, mono, className }) => (
                      <div key={label} className="flex justify-between items-center border-b border-border/40 pb-2 last:border-0 last:pb-0">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={`${bold ? "font-bold" : "font-medium"} ${mono ? "font-mono" : ""} text-foreground ${className ?? ""}`}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex flex-col gap-2">
                  <Button
                    className="w-full text-xs h-10 cursor-pointer"
                    onClick={() => void navigate({ to: "/receipts" })}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    View All Receipts
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-xs h-10 cursor-pointer"
                    onClick={handleNextCustomer}
                  >
                    Next Customer →
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 2: ROUTE PLANNER */}
        {/* ==================================================================== */}
        <TabsContent value="route" className="m-0 space-y-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between border-b border-border/60">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Compass className="h-4 w-4 text-primary" />
                  Today's Field Collection Route
                </CardTitle>
                <CardDescription className="text-xs">
                  Prioritized by overdue severity and doorstep proximity
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {routeStops.length} stops
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {routeStops.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No pending collections today!"
                  description="All scheduled EMIs for today are collected."
                  className="py-10"
                />
              ) : (
                stopsByArea.map(([area, stops]) => (
                  <div key={area} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span>{area} ({stops.length})</span>
                    </div>

                    <div className="border border-border rounded-lg divide-y divide-border/60 overflow-hidden">
                      {stops.map(({ customer, loan, emi, priority }) => {
                        const rem = emi.amount - emi.paid;
                        const isOverdue = emi.status === "Overdue";
                        const isPartial = emi.status === "Partial";
                        return (
                          <div key={emi.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start gap-3">
                              <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white mt-0.5"
                                style={{ backgroundColor: `hsl(${customer.photoHue}, 65%, 45%)` }}
                              >
                                {customer.name.charAt(0)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-xs text-foreground">{customer.name}</span>
                                  {isOverdue && <Badge variant="destructive" className="text-[9px]">Overdue</Badge>}
                                  {isPartial && <Badge className="text-[9px] bg-amber-500/15 text-amber-600 border-amber-500/30">Partial</Badge>}
                                  {!isOverdue && !isPartial && <Badge className="text-[9px] bg-primary/10 text-primary border-primary/20">Due Today</Badge>}
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {customer.address.house}, {customer.address.area}
                                  {customer.address.landmark ? ` (Near ${customer.address.landmark})` : ""}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground">
                                  {customer.mobile} • EMI #{emi.emiNo} ({loan.id})
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-border/50">
                              <div className="text-left sm:text-right">
                                <div className="font-mono font-bold text-xs text-foreground">{inr(rem)}</div>
                                <div className="text-[10px] text-muted-foreground">{fmtDate(emi.dueDate)}</div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 cursor-pointer"
                                  title="Call Customer"
                                  onClick={() => window.open(`tel:${customer.mobile}`, "_self")}
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 cursor-pointer"
                                  title="Navigate"
                                  onClick={() => {
                                    const addr = [customer.address.house, customer.address.area, customer.address.city].join(", ");
                                    window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, "_blank");
                                  }}
                                >
                                  <MapPin className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-8 text-xs cursor-pointer px-3"
                                  onClick={() => {
                                    handleSelectCustomer(customer.id);
                                    setSelectedLoanId(loan.id);
                                    setSelectedEmiId(emi.id);
                                  }}
                                >
                                  Collect
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 3: TODAY'S LOG */}
        {/* ==================================================================== */}
        <TabsContent value="today" className="m-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Total Collected", value: inr(totalToday), color: "text-emerald-600" },
              { label: "Due Today", value: inr(totalDue), color: "" },
              { label: "Pending EMIs", value: String(Math.max(0, pendingCount)), color: pendingCount > 0 ? "text-amber-600" : "" },
            ].map(({ label, value, color }) => (
              <Card key={label} className="shadow-xs border-border">
                <CardContent className="p-3.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className={`text-base font-bold mt-0.5 ${color}`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 md:p-5 flex flex-row items-center justify-between border-b border-border/60">
              <div>
                <CardTitle className="text-sm font-semibold">Today's Collections Log</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">{fmtDate(today)}</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold font-mono text-emerald-600">{inr(totalToday)}</div>
                <div className="text-[10px] text-muted-foreground">{collectionPct}% of due</div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {todayPayments.length === 0 ? (
                <EmptyState icon={Banknote} title="No collections today" description="Start collecting by searching a customer." className="py-10" />
              ) : (
                <div className="divide-y divide-border/60">
                  {todayPayments.map((p) => {
                    const c = customers.find((cust) => cust.id === p.customerId);
                    return (
                      <div key={p.id} className="p-4 flex items-center justify-between text-xs hover:bg-muted/30">
                        <div className="flex items-center gap-2.5">
                          {c && (
                            <div
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                              style={{ backgroundColor: `hsl(${c.photoHue}, 65%, 45%)` }}
                            >
                              {c.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-foreground">{c?.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {p.receiptId} • {p.loanId}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-emerald-600">+{inr(p.amount)}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                            <Badge variant="outline" className="text-[9px]">{p.method}</Badge>
                            <span>{fmtDateTime(p.date)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 4: DAILY CLOSING */}
        {/* ==================================================================== */}
        <TabsContent value="closing" className="m-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Target / Expected", value: inr(totalDue) },
              { label: "Total Collected", value: inr(totalToday), color: "text-emerald-600" },
              { label: "Pending Shortfall", value: inr(Math.max(0, totalDue - totalToday)), color: totalDue - totalToday > 0 ? "text-amber-600" : "" },
              { label: "Collection Rate", value: `${collectionPct}%`, color: collectionPct >= 80 ? "text-emerald-600" : "text-amber-600" },
            ].map(({ label, value, color }) => (
              <Card key={label} className="shadow-xs border-border">
                <CardContent className="p-3.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className={`text-sm font-bold mt-0.5 ${color ?? ""}`}>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Payment Method Breakdown */}
            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold">Payment Method Audit</CardTitle>
                <CardDescription className="text-xs">Physical cash vs digital bank transfer</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {[
                  { method: "Cash (Handover Required)", amount: cashToday, count: todayPayments.filter((p) => p.method === "Cash").length },
                  { method: "UPI (Direct to Account)", amount: upiToday, count: todayPayments.filter((p) => p.method === "UPI").length },
                  { method: "Bank Transfer", amount: bankToday, count: todayPayments.filter((p) => p.method === "Bank").length },
                ].map(({ method, amount, count }) => (
                  <div key={method} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div>
                      <div className="font-semibold text-foreground">{method}</div>
                      <div className="text-[10px] text-muted-foreground">{count} transaction{count === 1 ? "" : "s"}</div>
                    </div>
                    <span className="font-mono font-bold text-xs">{inr(amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-border/60 pt-3 font-bold text-sm">
                  <span>Grand Total</span>
                  <span className="font-mono text-emerald-600">{inr(totalToday)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Doorstep Visit Audit */}
            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold">Doorstep Visit Audit</CardTitle>
                <CardDescription className="text-xs">Visits performed vs unvisited customers</CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-xs">
                {(() => {
                  const todayVisits = visits.filter((v) => v.date === today);
                  const paidVisits = todayVisits.filter((v) => v.status === "Paid" || v.status === "Partially Paid").length;
                  const notPaidVisits = todayVisits.filter((v) => v.status === "Not Paid").length;
                  return (
                    <div className="space-y-2.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Scheduled Stops:</span>
                        <span className="font-mono font-semibold">{routeStops.length + todayVisits.length}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600">
                        <span>Collections Recorded:</span>
                        <span className="font-mono font-semibold">{paidVisits}</span>
                      </div>
                      <div className="flex justify-between text-amber-600">
                        <span>Unpaid Visits / PTP Taken:</span>
                        <span className="font-mono font-semibold">{notPaidVisits}</span>
                      </div>
                      <div className="flex justify-between border-t border-border/60 pt-2 font-bold">
                        <span>Pending Unvisited Stops:</span>
                        <span className="font-mono text-destructive">{routeStops.length}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-3 border-t border-border/60 flex flex-col gap-2">
                  {dayClosed ? (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <div>
                        <strong>Day Closed & Audited!</strong>
                        <p className="text-[10px] mt-0.5">Summary locked by {admin.name} on {fmtDate(today)}.</p>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="w-full text-xs h-10 cursor-pointer"
                      onClick={() => setShowCloseDayModal(true)}
                    >
                      <FileCheck className="h-4 w-4 mr-2" />
                      Close & Audit Day
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full text-xs h-9 cursor-pointer"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Daily Closing Sheet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ==================================================================== */}
      {/* DIALOG 1: OVERPAYMENT RESOLUTION (Requirement 3 & 4) */}
      {/* ==================================================================== */}
      <Dialog open={showOverpayDialog} onOpenChange={setShowOverpayDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Overpayment Detected
            </DialogTitle>
            <DialogDescription className="text-xs">
              The entered payment of <strong className="text-foreground">{inr(parsedAmount || 0)}</strong> exceeds the target EMI balance of{" "}
              <strong className="text-foreground">{inr(targetRemaining)}</strong> by{" "}
              <strong className="text-emerald-600">{inr(Math.max(0, (parsedAmount || 0) - targetRemaining))}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="font-semibold text-foreground">Select how you would like to handle the excess amount:</p>

            <div className="space-y-2">
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  excessAction === "next" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  name="excess-action"
                  className="mt-1"
                  checked={excessAction === "next"}
                  onChange={() => setExcessAction("next")}
                />
                <div>
                  <div className="font-semibold text-foreground">1. Apply Excess to Next EMI(s)</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Clear EMI #{targetEmi?.emiNo} ({inr(targetRemaining)}) and spill the excess {inr(Math.max(0, (parsedAmount || 0) - targetRemaining))} into subsequent unpaid EMI(s).
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  excessAction === "advance" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                }`}
              >
                <input
                  type="radio"
                  name="excess-action"
                  className="mt-1"
                  checked={excessAction === "advance"}
                  onChange={() => setExcessAction("advance")}
                />
                <div>
                  <div className="font-semibold text-foreground">2. Keep as Advance Credit</div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Cap current payment at {inr(targetRemaining)} for EMI #{targetEmi?.emiNo}, and hold remainder in customer ledger.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs cursor-pointer"
              onClick={() => {
                setShowOverpayDialog(false);
                setPayAmount(String(targetRemaining));
              }}
            >
              Re-enter Exact Amount ({inr(targetRemaining)})
            </Button>
            <Button
              size="sm"
              className="text-xs cursor-pointer"
              onClick={() => {
                setShowOverpayDialog(false);
                setShowConfirm(true);
              }}
            >
              Continue with Selection →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* DIALOG 2: NO PAYMENT & PROMISE-TO-PAY (Requirement 7 & 8) */}
      {/* ==================================================================== */}
      <Dialog open={showVisitDialog} onOpenChange={setShowVisitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-600" />
              Record Doorstep Visit / No Payment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record why collection could not be completed and schedule next visit or Promise-to-Pay (PTP).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs">Reason for Non-Payment *</Label>
              <Select value={visitReason} onValueChange={setVisitReason}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_REASONS.map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Next Visit Date *</Label>
              <Input
                type="date"
                value={visitNextDate}
                min={today}
                onChange={(e) => setVisitNextDate(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="p-3 rounded-lg border border-border/80 bg-muted/20 space-y-2.5">
              <label className="flex items-center gap-2 font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePtp}
                  onChange={(e) => setIncludePtp(e.target.checked)}
                />
                Record Formal Promise-to-Pay (PTP)
              </label>

              {includePtp && (
                <div className="space-y-2 pt-1">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Promised Amount (₹)</Label>
                    <Input
                      type="number"
                      value={ptpAmount}
                      onChange={(e) => setPtpAmount(e.target.value)}
                      placeholder={String(targetRemaining)}
                      className="mt-1 h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">Doorstep Notes / Remarks</Label>
              <Textarea
                rows={2}
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="e.g. Spoke with borrower spouse; promised full payment on Friday afternoon..."
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setShowVisitDialog(false)}>
              Cancel
            </Button>
            <Button size="sm" className="text-xs cursor-pointer" onClick={handleSaveNoPaymentVisit}>
              Save Visit & Schedule Next
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* DIALOG 3: CONFIRM PAYMENT */}
      {/* ==================================================================== */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Confirm Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs py-2">
            <div className="rounded-lg border border-border p-3.5 space-y-1.5">
              {selectedCustomer && [
                { label: "Customer", value: selectedCustomer.name },
                { label: "Customer ID", value: selectedCustomer.id },
                { label: "Loan ID", value: activeLoan?.id ?? "" },
                { label: "EMI #", value: targetEmi ? `${targetEmi.emiNo} (${targetEmi.id})` : "" },
                { label: "Amount", value: inr(parsedAmount || 0), bold: true, className: "text-emerald-600 font-mono" },
                { label: "Method", value: payMethod },
                ...(isOverpayment ? [{ label: "Allocation", value: excessAction === "next" ? "Spill to next EMI" : "Keep as advance" }] : []),
              ].map(({ label, value, bold, className }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}:</span>
                  <span className={`font-medium text-foreground ${bold ? "font-bold" : ""} ${className ?? ""}`}>{value}</span>
                </div>
              ))}
            </div>
            {willPartial && (
              <p className="text-amber-600 dark:text-amber-400 text-[10px] flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                This is a partial payment. Remaining: {inr(targetRemaining - parsedAmount)}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs cursor-pointer"
              onClick={handleRecordPayment}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : "Confirm & Issue Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================================================================== */}
      {/* DIALOG 4: CLOSE DAY MODAL */}
      {/* ==================================================================== */}
      <Dialog open={showCloseDayModal} onOpenChange={setShowCloseDayModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-emerald-600" />
              Audit & Close Day
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verify total collections collected today before closing the cashier register.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 text-xs py-2">
            <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1.5">
              <div className="flex justify-between">
                <span>Total Cash to Hand Over:</span>
                <span className="font-mono font-bold text-foreground">{inr(cashToday)}</span>
              </div>
              <div className="flex justify-between">
                <span>UPI / Bank Received:</span>
                <span className="font-mono font-bold text-foreground">{inr(upiToday + bankToday)}</span>
              </div>
              <div className="flex justify-between border-t border-border/60 pt-1.5 font-bold">
                <span>Grand Total:</span>
                <span className="font-mono text-emerald-600">{inr(totalToday)}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Closing will timestamp this audit in the local daily closing register.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setShowCloseDayModal(false)}>
              Back
            </Button>
            <Button
              size="sm"
              className="text-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700"
              onClick={() => {
                setDayClosed(true);
                setShowCloseDayModal(false);
              }}
            >
              Confirm & Lock Daily Closing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
