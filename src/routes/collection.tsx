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
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, fmtDateTime, todayISO } from "@/lib/format";
import type { PaymentMethod, Receipt } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/collection")({
  component: CollectionPage,
});

function CollectionPage() {
  const { customers, loans, emis, recordPayment, today, payments } = useStore();
  const navigate = useNavigate();

  // Step state: 1=search, 2=customer, 3=payment, 4=confirm, 5=success
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

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.mobile.includes(q)
    ).slice(0, 8);
  }, [customers, searchQuery]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const customerLoans = loans.filter((l) => l.customerId === selectedCustomerId && l.status !== "Closed");
  const activeLoan = customerLoans.find((l) => l.id === selectedLoanId) ?? customerLoans[0];

  const loanEmis = useMemo(() => {
    if (!activeLoan) return [];
    return emis.filter((e) => e.loanId === activeLoan.id && e.paid < e.amount)
      .sort((a, b) => a.emiNo - b.emiNo);
  }, [activeLoan, emis]);

  const targetEmi = loanEmis.find((e) => e.id === selectedEmiId) ?? loanEmis[0];
  const targetRemaining = targetEmi ? targetEmi.amount - targetEmi.paid : 0;

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
    });

    setLastReceipt(res.receipt);
    setShowConfirm(false);
    setStep(5);
    setIsSubmitting(false);
  }, [selectedCustomer, activeLoan, targetEmi, payAmount, payMethod, payNotes, recordPayment]);

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

  const todayPayments = payments.filter((p) => p.date.slice(0, 10) === today);
  const totalToday = todayPayments.reduce((s, p) => s + p.amount, 0);
  const cashToday = todayPayments.filter((p) => p.method === "Cash").reduce((s, p) => s + p.amount, 0);
  const upiToday = todayPayments.filter((p) => p.method === "UPI").reduce((s, p) => s + p.amount, 0);
  const bankToday = todayPayments.filter((p) => p.method === "Bank").reduce((s, p) => s + p.amount, 0);

  const dueTodayEmis = emis.filter((e) => e.dueDate === today && e.paid < e.amount);
  const totalDue = dueTodayEmis.reduce((s, e) => s + (e.amount - e.paid), 0);
  const pendingCount = dueTodayEmis.length - todayPayments.length;
  const collectionPct = totalDue > 0 ? Math.min(100, Math.round((totalToday / totalDue) * 100)) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Field Collection</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Mobile-first door-to-door EMI collection with instant receipt generation
          </p>
        </div>
      </div>

      <Tabs defaultValue="collect" className="space-y-4">
        <TabsList className="grid grid-cols-3 max-w-sm">
          <TabsTrigger value="collect" className="text-xs">Collect EMI</TabsTrigger>
          <TabsTrigger value="today" className="text-xs">Log ({todayPayments.length})</TabsTrigger>
          <TabsTrigger value="closing" className="text-xs">Daily Closing</TabsTrigger>
        </TabsList>

        {/* === COLLECT EMI TAB === */}
        <TabsContent value="collect" className="m-0 space-y-4">

          {/* STEP 1: SEARCH */}
          {step === 1 && (
            <Card className="shadow-xs border-border">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm font-semibold">Search Customer</CardTitle>
                <CardDescription className="text-xs">Search by Customer ID, Name, or Mobile</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="customer-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="CUS-000125, Ravi Kumar, 9876543210..."
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
                      const hasDue = emis.some(
                        (e) => e.customerId === c.id && (e.dueDate === today || e.status === "Overdue") && e.paid < e.amount
                      );
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
                            {hasDue && <Badge className="text-[9px] bg-amber-500/15 text-amber-600 border-amber-500/30">EMI Due</Badge>}
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
                    description={`No results for "${searchQuery}"`}
                    className="py-8"
                  />
                )}

                {!searchQuery && (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    Type a customer name, ID, or mobile number to begin
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

              {/* Customer Card */}
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

              {/* Loan Selector & EMI Details */}
              {customerLoans.length === 0 ? (
                <EmptyState icon={Banknote} title="No active loans" description="This customer has no active loans." />
              ) : (
                <div className="space-y-3">
                  {customerLoans.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {customerLoans.map((l) => (
                        <Button
                          key={l.id}
                          size="sm"
                          variant={l.id === (activeLoan?.id) ? "default" : "outline"}
                          className="text-xs h-8 cursor-pointer"
                          onClick={() => setSelectedLoanId(l.id)}
                        >
                          {l.id}
                        </Button>
                      ))}
                    </div>
                  )}

                  {activeLoan && (
                    <Card className="shadow-xs border-border">
                      <CardContent className="p-4 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-foreground">{activeLoan.id}</span>
                          <StatusBadge status={activeLoan.status} />
                        </div>
                        {targetEmi ? (
                          <div className="space-y-1.5 mt-2 p-3 rounded-lg bg-muted/40 border border-border/60">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">EMI #{targetEmi.emiNo} ({targetEmi.id})</span>
                              <span className="font-mono font-bold text-foreground">{inr(targetEmi.amount)}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-muted-foreground">Due Date:</span>
                              <span className={targetEmi.status === "Overdue" ? "font-semibold text-destructive" : "font-semibold"}>
                                {fmtDate(targetEmi.dueDate)}
                              </span>
                            </div>
                            {targetEmi.paid > 0 && (
                              <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">Already Paid:</span>
                                <span className="font-semibold text-emerald-600">{inr(targetEmi.paid)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold border-t border-border/50 pt-1.5">
                              <span>Remaining:</span>
                              <span className="font-mono font-bold text-primary">{inr(targetRemaining)}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center py-3">All EMIs for this loan are paid.</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {targetEmi && (
                    <Button
                      className="w-full h-12 text-sm font-semibold cursor-pointer"
                      onClick={() => setStep(3)}
                    >
                      <Banknote className="h-5 w-5 mr-2" />
                      Collect Payment
                    </Button>
                  )}
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
                      <CardDescription className="text-xs font-mono">{selectedCustomer.id} • {activeLoan.id} • EMI #{targetEmi.emiNo}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">EMI Amount</div>
                      <div className="text-base font-bold font-mono text-foreground">{inr(targetEmi.amount)}</div>
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
                          Full Amount ({inr(targetRemaining)})
                        </button>
                      )}
                    </div>
                    <Input
                      id="collect-amount"
                      type="number"
                      min="1"
                      max={targetRemaining}
                      step="1"
                      placeholder="Enter amount received..."
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="h-12 text-lg font-mono"
                    />
                    {isValidAmount && (
                      <div className={`flex items-center gap-1.5 text-[11px] mt-1 ${isOverpayment ? "text-destructive" : willPartial ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}>
                        {isOverpayment ? (
                          <><AlertTriangle className="h-3.5 w-3.5" /> Overpayment — amount exceeds EMI remaining ({inr(targetRemaining)})</>
                        ) : willPartial ? (
                          <><Info className="h-3.5 w-3.5" /> Partial — Remaining after this: {inr(targetRemaining - parsedAmount)}</>
                        ) : (
                          <><CheckCircle2 className="h-3.5 w-3.5" /> Full EMI cleared</>
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
                      placeholder="e.g. Collected at home, paid via QR..."
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0">
                  <Button
                    className="w-full h-12 text-base font-semibold cursor-pointer"
                    disabled={!isValidAmount || isOverpayment}
                    onClick={() => setShowConfirm(true)}
                  >
                    <Banknote className="h-5 w-5 mr-2" />
                    Collect {isValidAmount ? inr(parsedAmount) : "Payment"}
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
                      <div className="text-xs text-muted-foreground">Receipt issued and stored</div>
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
                    View / Print Receipt
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

        {/* === TODAY'S LOG TAB === */}
        <TabsContent value="today" className="m-0">
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
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

        {/* === DAILY CLOSING TAB === */}
        <TabsContent value="closing" className="m-0 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Expected", value: inr(totalDue) },
              { label: "Collected", value: inr(totalToday), color: "text-emerald-600" },
              { label: "Pending", value: inr(Math.max(0, totalDue - totalToday)), color: totalDue - totalToday > 0 ? "text-amber-600" : "" },
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
          <Card className="shadow-xs border-border max-w-md">
            <CardHeader className="p-4 pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold">Payment Method Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs">
              {[
                { method: "Cash", amount: cashToday },
                { method: "UPI", amount: upiToday },
                { method: "Bank Transfer", amount: bankToday },
              ].map(({ method, amount }) => (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{method}</Badge>
                    <span className="text-muted-foreground">{todayPayments.filter((p) => p.method === (method === "Bank Transfer" ? "Bank" : method)).length} transactions</span>
                  </div>
                  <span className="font-mono font-bold">{inr(amount)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border/60 pt-3 font-bold">
                <span>Total</span>
                <span className="font-mono text-emerald-600">{inr(totalToday)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
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
                { label: "Amount", value: inr(parsedAmount || 0), bold: true, className: "text-emerald-600" },
                { label: "Method", value: payMethod },
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
              {isSubmitting ? "Processing..." : "Confirm & Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
