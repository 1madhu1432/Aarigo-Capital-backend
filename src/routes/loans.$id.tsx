import { useMemo, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Banknote,
  User,
  CreditCard,
  Calendar,
  BarChart2,
  FileText,
  MapPin,
  CheckCircle2,
  Printer,
  Download,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, fmtDateTime, safe } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EarlyCloseDialog } from "@/components/loans/EarlyCloseDialog";
import { EmiSchedulePrintModal } from "@/components/loans/EmiSchedulePrintModal";
import { computeAmortizationSchedule } from "@/utils/amortization";

export const Route = createFileRoute("/loans/$id")({
  component: LoanDetailPage,
});

function LoanDetailPage() {
  const { id } = useParams({ from: "/loans/$id" });
  const { loans, customers, emis, payments, visits, documents, settings } = useStore();
  const navigate = useNavigate();

  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showEarlyCloseModal, setShowEarlyCloseModal] = useState(false);
  const [showPrintScheduleModal, setShowPrintScheduleModal] = useState(false);

  const loan = loans.find((l) => l.id === id);
  const customer = loan ? customers.find((c) => c.id === loan.customerId) : undefined;
  const loanEmis = useMemo(() => emis.filter((e) => e.loanId === id), [emis, id]);
  const loanPayments = useMemo(() => payments.filter((p) => p.loanId === id), [payments, id]);
  const loanVisits = useMemo(() => visits.filter((v) => v.loanId === id), [visits, id]);

  const isClosedEarly = loan?.status === "Closed Early" || Boolean(loan?.earlyClosure);
  const sched = useMemo(() => (loan ? computeAmortizationSchedule(loan, emis, payments) : null), [loan, emis, payments]);

  const totalPaid = useMemo(() => loanPayments.filter((p) => !p.reversed).reduce((s, p) => s + p.amount, 0), [loanPayments]);
  const outstanding = isClosedEarly ? 0 : loan ? Math.max(0, loan.totalPayable - totalPaid) : 0;
  const paidEmis = loanEmis.filter((e) => e.status === "Paid").length;
  const progress = loanEmis.length > 0 ? Math.round((paidEmis / loanEmis.length) * 100) : 0;
  const canEarlyClose = Boolean(loan && loan.status !== "Closed" && !isClosedEarly && (sched?.outstandingPrincipal ?? 0) > 0);

  const netDisbursed = loan ? Math.max(0, loan.principal - safe(loan.processingFee) - safe(loan.insurance)) : 0;

  if (!loan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-sm text-muted-foreground">Loan not found.</p>
        <Button size="sm" onClick={() => void navigate({ to: "/loans" })} className="cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Loans
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void navigate({ to: "/loans" })}
          className="text-xs h-8 -ml-2 w-fit cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Back to Loans
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {/* Print EMI Schedule (User Req Part B) */}
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-9 cursor-pointer"
            onClick={() => setShowPrintScheduleModal(true)}
          >
            <Printer className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Print EMI Schedule
          </Button>

          {/* Early Close Loan (User Req Part A) */}
          {canEarlyClose && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-9 cursor-pointer border-purple-500/40 text-purple-700 dark:text-purple-400 hover:bg-purple-500/10 font-medium"
              onClick={() => setShowEarlyCloseModal(true)}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
              Early Close Loan
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="text-xs h-9 cursor-pointer"
            onClick={() => setShowAgreementModal(true)}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Sanction Agreement
          </Button>

          {!isClosedEarly && loan.status !== "Closed" && (
            <Button
              size="sm"
              className="text-xs h-9 cursor-pointer"
              onClick={() => void navigate({ to: "/collection" })}
            >
              <Banknote className="h-3.5 w-3.5 mr-1.5" />
              Collect EMI
            </Button>
          )}
        </div>
      </div>

      {/* Loan Header */}
      <Card className="shadow-xs border-border">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-foreground">{loan.id}</span>
                <StatusBadge status={loan.status} size="sm" />
                {isClosedEarly && (
                  <Badge className="text-xs bg-purple-500/15 text-purple-700 border-purple-500/30">
                    Foreclosed
                  </Badge>
                )}
              </div>
              {customer && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: `hsl(${customer.photoHue}, 65%, 45%)` }}
                  >
                    {customer.name.charAt(0)}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{customer.name}</span>
                  <span
                    className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-primary hover:underline"
                    onClick={() => void navigate({ to: "/customers/$id", params: { id: customer.id } })}
                  >
                    {customer.id}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Repayment Progress</p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {isClosedEarly ? "100% Settled" : `${progress}% Complete`}
              </p>
              <Progress value={isClosedEarly ? 100 : progress} className="h-2 mt-1.5 w-32" />
              <p className="text-[10px] text-muted-foreground mt-1">
                {isClosedEarly ? "Loan Foreclosed Early" : `${paidEmis} of ${loanEmis.length} EMIs paid`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Early Closure History Card (User Req A7) */}
      {isClosedEarly && loan.earlyClosure && (
        <Card className="shadow-xs border-purple-500/30 bg-purple-500/5">
          <CardHeader className="p-4 pb-2 border-b border-purple-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                  Early Closure & Foreclosure Record
                </CardTitle>
              </div>
              <Badge className="text-[10px] bg-purple-600 text-white font-bold">
                Settled in Full
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Closure Date</p>
              <p className="font-semibold text-foreground mt-0.5">{fmtDate(loan.earlyClosure.closureDate)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Outstanding Principal</p>
              <p className="font-mono font-bold text-foreground mt-0.5">{inr(loan.earlyClosure.outstandingPrincipal)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Closure Charge ({loan.earlyClosure.earlyClosureChargePercent}%)</p>
              <p className="font-mono font-bold text-purple-700 dark:text-purple-400 mt-0.5">{inr(loan.earlyClosure.earlyClosureCharge)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Future Interest Charged</p>
              <p className="font-mono font-bold text-emerald-600 mt-0.5">₹0</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Final Settlement</p>
              <p className="font-mono font-bold text-sm text-purple-700 dark:text-purple-400 mt-0.5">{inr(loan.earlyClosure.finalClosureAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Payment Mode</p>
              <p className="font-medium text-foreground mt-0.5">{loan.earlyClosure.paymentMethod}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Payment ID</p>
              <p className="font-mono text-muted-foreground mt-0.5">{loan.earlyClosure.paymentId}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase">Receipt ID</p>
              <p className="font-mono font-bold text-foreground mt-0.5">{loan.earlyClosure.receiptId}</p>
            </div>
            {loan.earlyClosure.bankTransactionId && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Bank Tx Ref</p>
                <p className="font-mono text-foreground mt-0.5">{loan.earlyClosure.bankTransactionId}</p>
              </div>
            )}
            <div className="sm:col-span-2">
              <p className="text-[10px] text-muted-foreground uppercase">Settlement Notes</p>
              <p className="text-muted-foreground mt-0.5 truncate">{loan.earlyClosure.notes || "Foreclosed early"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Principal", value: inr(loan.principal), color: "" },
          { label: "Net Disbursed", value: inr(netDisbursed), color: "text-blue-600 dark:text-blue-400" },
          { label: "Processing Fee", value: inr(loan.processingFee), color: "" },
          { label: "Insurance", value: inr(loan.insurance), color: "" },
          { label: "Total Interest", value: inr(loan.totalInterest), color: "" },
          { label: "Total Payable", value: inr(loan.totalPayable), color: "" },
          { label: "Total Paid", value: inr(totalPaid), color: "text-emerald-600" },
          { label: "Outstanding", value: inr(outstanding), color: outstanding > 0 ? "text-foreground font-bold" : "text-emerald-600" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="shadow-xs border-border">
            <CardContent className="p-3">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide truncate">{label}</p>
              <p className={`text-xs font-bold mt-0.5 font-mono ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loan Terms & Disbursement */}
      <Card className="shadow-xs border-border">
        <CardHeader className="p-4 pb-2 border-b border-border/60">
          <CardTitle className="text-xs font-semibold">Terms & Disbursement Details</CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[
            { label: "Interest Rate", value: `${loan.interestRate}% p.a.` },
            { label: "Interest Method", value: loan.interestMethod },
            { label: "Tenure", value: `${loan.tenure} ${loan.frequency === "Monthly" ? "months" : loan.frequency === "Weekly" ? "weeks" : "days"}` },
            { label: "EMI Frequency", value: loan.frequency },
            { label: "Disbursement Method", value: loan.disbursementMethod || "Cash" },
            { label: "Bank Tx / Ref", value: loan.bankTransactionId || "—" },
            { label: "EMI Amount", value: inr(loan.emiAmount) },
            { label: "Start Date", value: fmtDate(loan.startDate) },
            { label: "First EMI Date", value: fmtDate(loan.firstEmiDate) },
            { label: "End Date", value: fmtDate(loan.endDate) },
            { label: "Purpose", value: loan.purpose || "General Purpose" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="font-medium text-foreground mt-0.5">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule" className="text-xs">EMI Schedule ({loanEmis.length})</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Payments ({loanPayments.length})</TabsTrigger>
          <TabsTrigger value="visits" className="text-xs">Visits ({loanVisits.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="m-0 mt-4">
          <Card className="shadow-xs border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    {["No.", "Due Date", "Amount", "Principal Component", "Interest", "Remaining", "Status", "Remarks"].map((h) => (
                      <th key={h} className={`p-3 text-[10px] text-muted-foreground font-medium ${h === "Amount" || h === "Principal Component" || h === "Interest" || h === "Remaining" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(sched?.rows ?? []).map((r) => (
                    <tr key={r.emiId} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-bold">{r.emiNo}</td>
                      <td className="p-3 font-mono">{fmtDate(r.dueDate)}</td>
                      <td className="p-3 text-right font-mono font-bold">{inr(r.emiAmount)}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground">{inr(r.principalComponent)}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground">{inr(r.interestComponent)}</td>
                      <td className="p-3 text-right font-mono font-semibold">{inr(r.remainingAmount)}</td>
                      <td className="p-3"><StatusBadge status={r.status} /></td>
                      <td className="p-3 text-muted-foreground text-[11px] truncate max-w-[150px]">{r.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="m-0 mt-4">
          <Card className="shadow-xs border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    {["Payment ID", "Receipt", "Amount", "Method", "Date", "Collector", "Status"].map((h) => (
                      <th key={h} className={`p-3 text-[10px] text-muted-foreground font-medium ${h === "Amount" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loanPayments.length === 0 ? (
                    <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No payments recorded</td></tr>
                  ) : (
                    loanPayments.map((p) => (
                      <tr key={p.id} className={`hover:bg-muted/30 transition-colors ${p.reversed ? "opacity-60 line-through" : ""}`}>
                        <td className="p-3 font-mono text-[10px]">{p.id}</td>
                        <td className="p-3 font-mono text-[10px]">{p.receiptId}</td>
                        <td className="p-3 text-right font-mono font-semibold text-emerald-600">+{inr(p.amount)}</td>
                        <td className="p-3"><Badge variant="outline" className="text-[9px]">{p.method}</Badge></td>
                        <td className="p-3">{fmtDateTime(p.date)}</td>
                        <td className="p-3 text-muted-foreground">{p.collectedBy}</td>
                        <td className="p-3">
                          {p.reversed ? (
                            <Badge variant="destructive" className="text-[9px]">Reversed ({p.reversalReason})</Badge>
                          ) : (
                            <Badge className="text-[9px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Success</Badge>
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

        <TabsContent value="visits" className="m-0 mt-4">
          <Card className="shadow-xs border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    {["Visit ID", "Date", "Due Amount", "Collected", "Status", "Reason / Notes", "Next Visit"].map((h) => (
                      <th key={h} className={`p-3 text-[10px] text-muted-foreground font-medium ${h === "Due Amount" || h === "Collected" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loanVisits.length === 0 ? (
                    <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No visits recorded</td></tr>
                  ) : (
                    loanVisits.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-[10px]">{v.id}</td>
                        <td className="p-3">{fmtDate(v.date)}</td>
                        <td className="p-3 text-right font-mono">{inr(v.dueAmount)}</td>
                        <td className="p-3 text-right font-mono text-emerald-600">{inr(v.collected)}</td>
                        <td className="p-3"><StatusBadge status={v.status} /></td>
                        <td className="p-3 text-muted-foreground">{v.reason || v.notes || "—"}</td>
                        <td className="p-3 text-muted-foreground">{v.nextVisit ? fmtDate(v.nextVisit) : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ==================================================================== */}
      {/* LOAN AGREEMENT & SANCTION LETTER MODAL (Print-Friendly) */}
      {/* ==================================================================== */}
      <Dialog open={showAgreementModal} onOpenChange={setShowAgreementModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b border-border/60 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold">{settings.businessName}</DialogTitle>
                <p className="text-xs text-muted-foreground">{settings.businessAddress} • Ph: {settings.businessPhone}</p>
              </div>
              <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Official Document</Badge>
            </div>
          </DialogHeader>

          <div id="printable-loan-agreement" className="space-y-4 text-xs py-2">
            <div className="text-center border-b border-border/60 pb-2">
              <h2 className="text-base font-bold uppercase tracking-wider text-foreground">
                Loan Sanction Letter & Contract Agreement
              </h2>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Loan Reference: {loan.id} • Date: {fmtDate(loan.startDate)}</p>
            </div>

            {/* Borrower & Guarantor Information */}
            <div className="grid grid-cols-2 gap-4 p-3 rounded-lg border border-border bg-muted/20">
              <div>
                <h3 className="font-bold text-foreground text-xs uppercase tracking-wide mb-1.5">Borrower Details</h3>
                <p><strong>Name:</strong> {customer?.name}</p>
                <p><strong>Father/Guardian:</strong> {customer?.guardianName || "—"}</p>
                <p><strong>Customer ID:</strong> {customer?.id}</p>
                <p><strong>Mobile:</strong> {customer?.mobile}</p>
                <p><strong>KYC:</strong> {customer?.kycType} - {customer?.kycNumber}</p>
                <p><strong>Address:</strong> {customer?.address.house}, {customer?.address.area}, {customer?.address.city} - {customer?.address.pin}</p>
              </div>
              <div>
                <h3 className="font-bold text-foreground text-xs uppercase tracking-wide mb-1.5">Guarantor Details</h3>
                <p><strong>Name:</strong> {customer?.guarantor.name || "—"}</p>
                <p><strong>Relationship:</strong> {customer?.guarantor.relationship || "—"}</p>
                <p><strong>Mobile:</strong> {customer?.guarantor.mobile || "—"}</p>
                <p><strong>Address:</strong> {customer?.guarantor.address || "—"}</p>
              </div>
            </div>

            {/* Financial Terms Table */}
            <div>
              <h3 className="font-bold text-foreground text-xs uppercase tracking-wide mb-1.5">Loan Sanction Terms</h3>
              <table className="w-full border border-border text-xs">
                <tbody>
                  <tr className="border-b border-border">
                    <td className="p-2 bg-muted/40 font-semibold w-1/4">Sanctioned Amount</td>
                    <td className="p-2 font-mono font-bold w-1/4">{inr(loan.principal)}</td>
                    <td className="p-2 bg-muted/40 font-semibold w-1/4">Net Disbursed</td>
                    <td className="p-2 font-mono font-bold w-1/4 text-emerald-600">{inr(netDisbursed)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2 bg-muted/40 font-semibold">Interest Rate</td>
                    <td className="p-2">{loan.interestRate}% p.a. ({loan.interestMethod})</td>
                    <td className="p-2 bg-muted/40 font-semibold">Total Interest</td>
                    <td className="p-2 font-mono">{inr(loan.totalInterest)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2 bg-muted/40 font-semibold">Processing Fee</td>
                    <td className="p-2 font-mono">{inr(loan.processingFee)}</td>
                    <td className="p-2 bg-muted/40 font-semibold">Loan Insurance</td>
                    <td className="p-2 font-mono">{inr(loan.insurance)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2 bg-muted/40 font-semibold">Repayment Tenure</td>
                    <td className="p-2">{loan.tenure} {loan.frequency === "Monthly" ? "Months" : loan.frequency === "Weekly" ? "Weeks" : "Days"}</td>
                    <td className="p-2 bg-muted/40 font-semibold">EMI Amount</td>
                    <td className="p-2 font-mono font-bold text-primary">{inr(loan.emiAmount)} / {loan.frequency.toLowerCase()}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="p-2 bg-muted/40 font-semibold">Disbursement Mode</td>
                    <td className="p-2">{loan.disbursementMethod || "Cash"}{loan.bankTransactionId ? ` (Ref: ${loan.bankTransactionId})` : ""}</td>
                    <td className="p-2 bg-muted/40 font-semibold">Total Repayable</td>
                    <td className="p-2 font-mono font-bold">{inr(loan.totalPayable)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Declaration Terms */}
            <div className="p-3 rounded-lg border border-border/70 text-[11px] text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Terms & Conditions:</p>
              <p>1. The borrower agrees to repay the EMI amount promptly on or before each due date according to the schedule above.</p>
              <p>2. Failure to pay on the due date may attract late payment charges as per institutional policies.</p>
              <p>3. The guarantor agrees to be jointly and severally liable for the full satisfaction of this loan contract.</p>
            </div>

            {/* Signature Blocks */}
            <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs">
              <div className="border-t border-foreground/40 pt-1.5">
                <p className="font-semibold">Borrower Signature</p>
                <p className="text-[10px] text-muted-foreground">{customer?.name}</p>
              </div>
              <div className="border-t border-foreground/40 pt-1.5">
                <p className="font-semibold">Guarantor Signature</p>
                <p className="text-[10px] text-muted-foreground">{customer?.guarantor.name || "Guarantor"}</p>
              </div>
              <div className="border-t border-foreground/40 pt-1.5">
                <p className="font-semibold">Authorized Signatory</p>
                <p className="text-[10px] text-muted-foreground">{settings.businessName}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-border/60 pt-3 gap-2">
            <Button size="sm" variant="outline" className="text-xs cursor-pointer" onClick={() => setShowAgreementModal(false)}>
              Close
            </Button>
            <Button size="sm" className="text-xs cursor-pointer" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Sanction Agreement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Early Close Loan Dialog (Part A) */}
      <EarlyCloseDialog
        loan={loan}
        customer={customer}
        open={showEarlyCloseModal}
        onOpenChange={setShowEarlyCloseModal}
      />

      {/* Print EMI Schedule Modal (Part B) */}
      <EmiSchedulePrintModal
        loan={loan}
        customer={customer}
        open={showPrintScheduleModal}
        onOpenChange={setShowPrintScheduleModal}
      />
    </div>
  );
}
