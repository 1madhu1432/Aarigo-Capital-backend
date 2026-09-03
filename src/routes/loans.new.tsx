import { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Search, CheckCircle2, AlertTriangle, CreditCard } from "lucide-react";
import { useStore } from "@/store/app-store";
import type { NewLoanInput } from "@/store/app-store";
import { inr, fmtDate, todayISO, addMonths, safe } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";

export const Route = createFileRoute("/loans/new")({
  component: NewLoanPage,
});

function computeEmi(principal: number, rate: number, tenure: number, method: "Flat" | "Reducing Balance"): {
  emiAmount: number;
  totalInterest: number;
  totalPayable: number;
} {
  if (principal <= 0 || tenure <= 0 || rate < 0) return { emiAmount: 0, totalInterest: 0, totalPayable: principal };
  if (method === "Flat") {
    const totalInterest = (principal * rate * tenure) / (100 * 12);
    const totalPayable = principal + totalInterest;
    const emiAmount = totalPayable / tenure;
    return { emiAmount, totalInterest, totalPayable };
  } else {
    const r = rate / 100 / 12;
    if (r === 0) return { emiAmount: principal / tenure, totalInterest: 0, totalPayable: principal };
    const emiAmount = (principal * r * Math.pow(1 + r, tenure)) / (Math.pow(1 + r, tenure) - 1);
    const totalPayable = emiAmount * tenure;
    const totalInterest = totalPayable - principal;
    return { emiAmount, totalInterest, totalPayable };
  }
}

function NewLoanPage() {
  const { customers, accounts, loans, emis, payments, addLoan } = useStore();
  const navigate = useNavigate();
  const today = todayISO();

  const [step, setStep] = useState(1);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [overrideCredit, setOverrideCredit] = useState(false);
  const [newLoanId, setNewLoanId] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<NewLoanInput, "customerId">>({
    principal: 0,
    interestRate: 12,
    interestMethod: "Flat",
    processingFee: 0,
    insurance: 0,
    tenure: 12,
    frequency: "Monthly",
    startDate: today,
    firstEmiDate: addMonths(today, 1),
    purpose: "",
    disbursementMethod: "Cash",
    bankTransactionId: "",
  });

  interface LoanFormErrors {
    principal?: string;
    tenure?: string;
    interestRate?: string;
    startDate?: string;
    firstEmiDate?: string;
  }

  const [errors, setErrors] = useState<LoanFormErrors>({});

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    if (!q) return customers.slice(0, 8);
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.mobile.includes(q) ||
        c.address.city.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.customerId === selectedCustomerId),
    [accounts, selectedCustomerId]
  );

  const creditLimit = selectedAccount?.creditLimit ?? 0;
  const usedLimit = useMemo(() => {
    if (!selectedCustomerId) return 0;
    const activeLoans = loans.filter((l) => l.customerId === selectedCustomerId && l.status !== "Closed");
    return activeLoans.reduce((sum, l) => {
      const lEmis = emis.filter((e) => e.loanId === l.id);
      return sum + lEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0);
    }, 0);
  }, [selectedCustomerId, loans, emis]);
  const availableLimit = Math.max(0, creditLimit - usedLimit);

  const calc = useMemo(() =>
    computeEmi(safe(form.principal), safe(form.interestRate), safe(form.tenure), form.interestMethod),
    [form.principal, form.interestRate, form.tenure, form.interestMethod]
  );

  const exceedsCredit = form.principal > availableLimit && creditLimit > 0;

  const validateStep2 = () => {
    const e: LoanFormErrors = {};
    if (!form.principal || form.principal <= 0) e.principal = "Loan amount must be greater than 0";
    if (!form.tenure || form.tenure <= 0) e.tenure = "Tenure must be greater than 0";
    if (form.interestRate < 0) e.interestRate = "Interest rate cannot be negative";
    if (!form.startDate) e.startDate = "Start date is required";
    if (!form.firstEmiDate) e.firstEmiDate = "First EMI date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    const loan = addLoan({ ...form, customerId: selectedCustomerId });
    setNewLoanId(loan.id);
    setStep(5);
  };

  const setField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => void navigate({ to: "/loans" })}
        className="text-xs h-8 -ml-2 cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5 mr-1" />
        Back to Loans
      </Button>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">New Loan</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Create a new loan contract for an existing customer</p>
      </div>

      {/* Step Progress */}
      {step < 5 && (
        <div className="space-y-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Customer</span>
            <span>Loan Details</span>
            <span>Review</span>
            <span>Confirm</span>
          </div>
        </div>
      )}

      {/* Step 1: Select Customer */}
      {step === 1 && (
        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="text-sm font-semibold">Step 1: Select Customer</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, CUS-ID or mobile..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="divide-y divide-border/60 border border-border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              {filteredCustomers.map((c) => {
                const acc = accounts.find((a) => a.customerId === c.id);
                const isSelected = c.id === selectedCustomerId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`w-full flex items-center justify-between p-3 text-left text-xs transition-colors cursor-pointer ${isSelected ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/40"}`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: `hsl(${c.photoHue}, 65%, 45%)` }}
                      >
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{c.id} • {c.mobile}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-muted-foreground">Available Credit</div>
                      <div className="font-mono font-semibold text-foreground">{inr(Math.max(0, (acc?.creditLimit ?? 0)))}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedCustomer && selectedAccount && (
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Limit:</span>
                  <span className="font-mono font-semibold">{inr(creditLimit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Used Limit:</span>
                  <span className="font-mono">{inr(usedLimit)}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-1.5">
                  <span className="font-semibold">Available:</span>
                  <span className={`font-mono font-bold ${availableLimit > 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {inr(availableLimit)}
                  </span>
                </div>
              </div>
            )}
            <Button
              className="w-full text-xs h-9 cursor-pointer"
              disabled={!selectedCustomerId}
              onClick={() => setStep(2)}
            >
              Continue with {selectedCustomer?.name ?? "Customer"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Loan Details */}
      {step === 2 && (
        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="text-sm font-semibold">Step 2: Loan Details</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <Label className="text-xs">Loan Amount (₹) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.principal || ""}
                  onChange={(e) => setField("principal", parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 50000"
                  className="mt-1 h-9 text-xs font-mono"
                />
                {errors.principal && <p className="text-destructive text-[10px] mt-0.5">{errors.principal}</p>}
                {exceedsCredit && !overrideCredit && (
                  <div className="mt-1.5 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-[10px] text-destructive flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div>
                      Loan amount {inr(form.principal)} exceeds available credit {inr(availableLimit)}.
                      {" "}
                      <button
                        type="button"
                        className="underline font-semibold cursor-pointer"
                        onClick={() => setOverrideCredit(true)}
                      >
                        Override as admin
                      </button>
                    </div>
                  </div>
                )}
                {exceedsCredit && overrideCredit && (
                  <div className="mt-1.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-700 dark:text-amber-400">
                    ⚠ Admin override active — this loan exceeds available credit.
                  </div>
                )}
              </div>
              <div>
                <Label className="text-xs">Interest Rate (% per annum) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.interestRate}
                  onChange={(e) => setField("interestRate", parseFloat(e.target.value) || 0)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Interest Method</Label>
                <Select value={form.interestMethod} onValueChange={(v) => setField("interestMethod", v as "Flat" | "Reducing Balance")}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Flat" className="text-xs">Flat Rate</SelectItem>
                    <SelectItem value="Reducing Balance" className="text-xs">Reducing Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tenure *</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.tenure}
                  onChange={(e) => setField("tenure", parseInt(e.target.value) || 0)}
                  className="mt-1 h-9 text-xs"
                />
                {errors.tenure && <p className="text-destructive text-[10px] mt-0.5">{errors.tenure}</p>}
              </div>
              <div>
                <Label className="text-xs">EMI Frequency</Label>
                <Select value={form.frequency} onValueChange={(v) => setField("frequency", v as "Monthly" | "Weekly" | "Daily")}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly" className="text-xs">Monthly</SelectItem>
                    <SelectItem value="Weekly" className="text-xs">Weekly</SelectItem>
                    <SelectItem value="Daily" className="text-xs">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Processing Fee (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.processingFee || ""}
                  onChange={(e) => setField("processingFee", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Loan Insurance (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.insurance || ""}
                  onChange={(e) => setField("insurance", parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Disbursement Method</Label>
                <Select
                  value={form.disbursementMethod}
                  onValueChange={(v) => setField("disbursementMethod", v as "Cash" | "Bank Transfer")}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash" className="text-xs">Cash</SelectItem>
                    <SelectItem value="Bank Transfer" className="text-xs">Bank Transfer (NEFT/IMPS)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.disbursementMethod === "Bank Transfer" && (
                <div>
                  <Label className="text-xs">Bank Transaction ID / Ref</Label>
                  <Input
                    value={form.bankTransactionId}
                    onChange={(e) => setField("bankTransactionId", e.target.value)}
                    placeholder="e.g. UTR123456789"
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </div>
              )}
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setField("startDate", e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">First EMI Date</Label>
                <Input
                  type="date"
                  value={form.firstEmiDate}
                  onChange={(e) => setField("firstEmiDate", e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Purpose / Notes</Label>
                <Input
                  value={form.purpose}
                  onChange={(e) => setField("purpose", e.target.value)}
                  placeholder="e.g. Business expansion, Medical emergency..."
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            {/* Live Summary */}
            {form.principal > 0 && (
              <div className="p-3.5 rounded-lg bg-muted/40 border border-border text-xs space-y-1.5">
                <p className="font-semibold text-foreground text-[11px] mb-2">Live Calculation</p>
                {[
                  { label: "Principal (Sanctioned)", value: inr(form.principal) },
                  { label: "Processing Fee Deducted", value: `- ${inr(form.processingFee)}` },
                  { label: "Insurance Deducted", value: `- ${inr(form.insurance)}` },
                  {
                    label: "Net Disbursed Amount",
                    value: inr(Math.max(0, form.principal - safe(form.processingFee) - safe(form.insurance))),
                  },
                  { label: "Total Interest", value: inr(calc.totalInterest) },
                  { label: "Total Payable", value: inr(calc.totalPayable + safe(form.processingFee)) },
                  { label: "Estimated EMI", value: inr(calc.emiAmount) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="font-mono font-semibold text-foreground">{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setStep(1)}>Back</Button>
              <Button
                size="sm"
                className="text-xs flex-1 cursor-pointer"
                disabled={exceedsCredit && !overrideCredit}
                onClick={() => { if (validateStep2()) setStep(3); }}
              >
                Review Loan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="text-sm font-semibold">Step 3: Review Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            <div className="rounded-lg border border-border p-3.5 space-y-2">
              <p className="font-semibold text-foreground mb-2">Customer</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{selectedCustomer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono">{selectedCustomer?.id}</span>
              </div>
            </div>
            <div className="rounded-lg border border-border p-3.5 space-y-2">
              <p className="font-semibold text-foreground mb-2">Loan Terms & Disbursement</p>
              {[
                { label: "Principal (Sanctioned)", value: inr(form.principal) },
                { label: "Net Disbursed to Borrower", value: inr(Math.max(0, form.principal - safe(form.processingFee) - safe(form.insurance))) },
                { label: "Disbursement Method", value: form.disbursementMethod },
                ...(form.bankTransactionId ? [{ label: "Bank Tx / Ref", value: form.bankTransactionId }] : []),
                { label: "Interest Rate", value: `${form.interestRate}% p.a. (${form.interestMethod})` },
                { label: "Tenure", value: `${form.tenure} ${form.frequency === "Monthly" ? "months" : form.frequency === "Weekly" ? "weeks" : "days"}` },
                { label: "EMI Frequency", value: form.frequency },
                { label: "Processing Fee", value: inr(form.processingFee) },
                { label: "Loan Insurance", value: inr(form.insurance) },
                { label: "Total Interest", value: inr(calc.totalInterest) },
                { label: "Total Payable", value: inr(calc.totalPayable + safe(form.processingFee)) },
                { label: "Estimated EMI", value: inr(calc.emiAmount) },
                { label: "Start Date", value: fmtDate(form.startDate) },
                { label: "First EMI Date", value: fmtDate(form.firstEmiDate) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}:</span>
                  <span className="font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>
            {form.purpose && (
              <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
                Purpose: {form.purpose}
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setStep(2)}>Back</Button>
              <Button size="sm" className="text-xs flex-1 cursor-pointer" onClick={() => setStep(4)}>Confirm</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 pb-2 border-b border-border/60">
            <CardTitle className="text-sm font-semibold">Step 4: Final Confirmation</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] space-y-1">
              <p className="font-semibold">Please confirm before proceeding:</p>
              <p>• Sanctioned Loan: <strong>{inr(form.principal)}</strong></p>
              <p>• Net Disbursed: <strong>{inr(Math.max(0, form.principal - safe(form.processingFee) - safe(form.insurance)))}</strong> via <strong>{form.disbursementMethod}</strong>{form.bankTransactionId ? ` (Ref: ${form.bankTransactionId})` : ""}</p>
              <p>• Borrower: <strong>{selectedCustomer?.name}</strong></p>
              <p>• EMI of <strong>{inr(calc.emiAmount)}</strong> due <strong>{form.frequency.toLowerCase()}</strong> starting <strong>{fmtDate(form.firstEmiDate)}</strong></p>
              <p>• {form.tenure} EMIs totaling <strong>{inr(calc.totalPayable + safe(form.processingFee))}</strong></p>
              <p>• This creates the loan contract and generates the EMI schedule immediately.</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setStep(3)}>Back</Button>
              <Button size="sm" className="text-xs flex-1 cursor-pointer bg-primary" onClick={handleSubmit}>
                Create Loan & Generate EMI Schedule
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Success */}
      {step === 5 && (
        <Card className="shadow-xs border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground">Loan Created Successfully!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Loan ID: <span className="font-mono font-bold text-foreground">{newLoanId}</span>
              </p>
              <p className="text-xs text-muted-foreground">EMI schedule of {form.tenure} installments has been generated.</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <Button
                size="sm"
                className="text-xs cursor-pointer"
                onClick={() => newLoanId && void navigate({ to: "/loans/$id", params: { id: newLoanId } })}
              >
                View Loan
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs cursor-pointer"
                onClick={() => void navigate({ to: "/collection" })}
              >
                Collect EMI
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs cursor-pointer"
                onClick={() => void navigate({ to: "/loans" })}
              >
                Loan List
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
