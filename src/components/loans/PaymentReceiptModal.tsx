import { Printer, ShieldCheck, TrendingDown, TrendingUp, IndianRupee } from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, fmtDateTime } from "@/lib/format";
import { computeAmortizationSchedule } from "@/utils/amortization";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PaymentReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptId: string | null;
}

export function PaymentReceiptModal({ open, onOpenChange, receiptId }: PaymentReceiptModalProps) {
  const { receipts, payments, customers, loans, emis, settings, admin } = useStore();

  if (!receiptId) return null;

  const receipt = receipts.find((r) => r.id === receiptId);
  const payment = receipt ? payments.find((p) => p.id === receipt.paymentId) : null;
  const customer = receipt ? customers.find((c) => c.id === receipt.customerId) : null;
  const loan = receipt ? loans.find((l) => l.id === receipt.loanId) : null;
  const targetEmi = payment ? emis.find((e) => e.id === payment.emiId) : null;

  if (!receipt || !loan) return null;

  // Full amortization schedule for this loan
  const sched = computeAmortizationSchedule(loan, emis, payments);
  const targetRow = targetEmi ? sched.rows.find((r) => r.emiNo === targetEmi.emiNo) : null;

  // Calculate itemized payment split
  const totalPaid = receipt.amount;
  const isEarlyClosure = Boolean(payment?.isEarlyClosure || loan.status === "Closed Early");

  const lateFeePaid = payment?.lateFeePaid ?? receipt.lateFeePaid ?? 0;
  const emiOnlyPaid = Math.max(0, totalPaid - lateFeePaid);

  let principalPaid = 0;
  let interestPaid = 0;
  let earlyClosureCharge = 0;

  if (isEarlyClosure) {
    earlyClosureCharge = payment?.earlyClosureCharge ?? loan.earlyClosure?.earlyClosureCharge ?? 0;
    principalPaid = Math.max(0, totalPaid - earlyClosureCharge);
    interestPaid = 0; // Waived on early closure
  } else if (targetRow) {
    const ratio = targetRow.emiAmount > 0 ? emiOnlyPaid / targetRow.emiAmount : 1;
    interestPaid = Math.round(targetRow.interestComponent * Math.min(1, ratio));
    principalPaid = Math.max(0, emiOnlyPaid - interestPaid);
  } else {
    interestPaid = Math.round(emiOnlyPaid * 0.15);
    principalPaid = emiOnlyPaid - interestPaid;
  }

  // All loan payments for this loan (non-reversed), sorted by date
  const loanPayments = payments
    .filter((p) => p.loanId === loan.id && !p.reversed)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Cumulative loan stats
  const collectedTotal = sched.totalPaid;
  const principalCollectedTotal = sched.totalPrincipalPaid;
  const interestCollectedTotal = sched.totalInterestPaid;
  const outstandingPrincipal = sched.outstandingPrincipal;
  const outstandingInterest = sched.outstandingInterest;
  const paidEmiCount = sched.rows.filter((r) => r.status === "Paid" || r.status === "Partial").length;
  const collectionPct = loan.totalPayable > 0
    ? Math.min(100, Math.round((collectedTotal / loan.totalPayable) * 100))
    : 0;

  const handlePrint = () => window.print();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[94vh] overflow-y-auto p-0 border-border">
        <DialogHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <DialogTitle className="text-sm font-bold">Official Payment Receipt</DialogTitle>
          </div>
          <Button size="sm" onClick={handlePrint} className="h-8 text-xs cursor-pointer">
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print Receipt
          </Button>
        </DialogHeader>

        <div className="p-5 space-y-5 text-xs bg-background" id="printable-payment-receipt">

          {/* ── Business Header ─────────────────────────────────────── */}
          <div className="text-center border-b border-border/80 pb-4 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" />
              <span className="font-black text-xl tracking-tight text-primary uppercase">
                {settings.businessName || "LOANFLOW HUB"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground font-medium">
              {settings.businessAddress} • Phone: {settings.businessPhone}
            </p>
            <Badge variant="outline" className="text-[10px] font-mono mt-1 border-primary/30 text-primary">
              {isEarlyClosure ? "EARLY CLOSURE SETTLEMENT RECEIPT" : "OFFICIAL EMI PAYMENT RECEIPT"}
            </Badge>
          </div>

          {/* ── Receipt Summary Ribbon ───────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/40 border border-border/70 text-center font-mono">
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-sans">Receipt No</span>
              <p className="font-bold text-foreground text-xs">{receipt.id}</p>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-sans">Payment Ref</span>
              <p className="font-bold text-foreground text-xs">{receipt.paymentId}</p>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-sans">Date &amp; Time</span>
              <p className="font-semibold text-foreground text-[11px]">{fmtDateTime(receipt.date)}</p>
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-sans">Payment Mode</span>
              <p className="font-bold text-emerald-600 text-xs">{receipt.method}</p>
            </div>
          </div>

          {/* ── Borrower & Loan Info ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer */}
            <div className="p-3 rounded-lg border border-border/70 bg-muted/10 space-y-2">
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] border-b border-border/50 pb-1 flex items-center justify-between">
                <span>Customer Details</span>
                <span className="font-mono text-primary">{customer?.id}</span>
              </h4>
              <div className="space-y-1 text-muted-foreground">
                <p><strong className="text-foreground">Name:</strong> {customer?.name ?? "—"}</p>
                <p><strong className="text-foreground">Guardian:</strong> {customer?.guardianName ?? "—"}</p>
                <p><strong className="text-foreground">Mobile:</strong> {customer?.mobile ?? "—"}</p>
                <p><strong className="text-foreground">Address:</strong>{" "}
                  {customer ? `${customer.address.house}, ${customer.address.area}, ${customer.address.city}` : "—"}
                </p>
              </div>
            </div>

            {/* Loan */}
            <div className="p-3 rounded-lg border border-border/70 bg-muted/10 space-y-2">
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] border-b border-border/50 pb-1 flex items-center justify-between">
                <span>Loan &amp; Account Details</span>
                <span className="font-mono text-primary">{loan.id}</span>
              </h4>
              <div className="space-y-1 text-muted-foreground">
                <p><strong className="text-foreground">Account No:</strong> {loan.accountId ?? "ACC-0001"}</p>
                <p><strong className="text-foreground">Sanctioned Principal:</strong> {inr(loan.principal)}</p>
                <p><strong className="text-foreground">Interest:</strong> {loan.interestRate}% p.a. ({loan.interestMethod})</p>
                <p>
                  <strong className="text-foreground">EMI Installment:</strong>{" "}
                  #{targetEmi?.emiNo ?? 1} of {loan.tenure} (Due: {fmtDate(targetEmi?.dueDate)})
                </p>
                <p><strong className="text-foreground">EMI Amount:</strong> {inr(loan.emiAmount)} ({loan.frequency})</p>
              </div>
            </div>
          </div>

          {/* ── Loan Financial Dashboard ─────────────────────────────── */}
          <div>
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] mb-2">
              Loan Financial Summary
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: "Principal Disbursed", value: inr(loan.principal), color: "text-foreground", icon: "💰" },
                { label: "Total Interest Charged", value: inr(loan.totalInterest), color: "text-amber-600", icon: "📈" },
                { label: "Total Payable Amount", value: inr(loan.totalPayable), color: "text-foreground", icon: "📋" },
                { label: "Total Collected (All EMIs)", value: inr(collectedTotal), color: "text-emerald-600", icon: "✅" },
                { label: "Principal Collected", value: inr(principalCollectedTotal), color: "text-emerald-700", icon: "🏦" },
                { label: "Interest Collected", value: inr(interestCollectedTotal), color: "text-blue-600", icon: "💹" },
                { label: "Outstanding Principal", value: inr(outstandingPrincipal), color: outstandingPrincipal > 0 ? "text-red-600" : "text-emerald-600", icon: "⚡" },
                { label: "Outstanding Interest", value: inr(outstandingInterest), color: outstandingInterest > 0 ? "text-amber-600" : "text-emerald-600", icon: "📌" },
                { label: "EMIs Cleared / Total", value: `${paidEmiCount} / ${loan.tenure}`, color: "text-foreground", icon: "🗓️" },
              ].map(({ label, value, color, icon }) => (
                <div key={label} className="p-2.5 rounded-lg border border-border/70 bg-muted/10 space-y-0.5">
                  <p className="text-[9px] uppercase text-muted-foreground font-semibold flex items-center gap-1">
                    <span>{icon}</span>{label}
                  </p>
                  <p className={`font-mono font-bold text-sm ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Collection Progress Bar */}
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Collection Progress</span>
                <span className="font-semibold">{collectionPct}% collected</span>
              </div>
              <div className="h-2 rounded-full bg-muted/60 border border-border/50 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${collectionPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{inr(collectedTotal)} collected</span>
                <span>{inr(loan.totalPayable - collectedTotal)} remaining</span>
              </div>
            </div>
          </div>

          {/* ── This Payment — Itemized Breakdown ───────────────────── */}
          <div>
            <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] mb-1.5">
              This Payment — Itemized Financial Allocation
            </h4>
            <table className="w-full border border-border rounded-md text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-[10px] text-muted-foreground uppercase font-semibold">
                  <th className="p-2.5 text-left">Description / Particulars</th>
                  <th className="p-2.5 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono">
                <tr>
                  <td className="p-2.5 font-sans text-foreground">
                    Principal Component Allocated
                    <span className="block text-[10px] text-muted-foreground font-sans">Applied directly to reduce loan principal balance</span>
                  </td>
                  <td className="p-2.5 text-right font-bold text-foreground">{inr(principalPaid)}</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-sans text-foreground">
                    Interest Component Allocated
                    <span className="block text-[10px] text-muted-foreground font-sans">
                      {isEarlyClosure
                        ? "Waived (₹0 charged on early closure)"
                        : `Scheduled interest component for EMI #${targetEmi?.emiNo ?? 1}`}
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-bold text-foreground">{inr(interestPaid)}</td>
                </tr>
                {lateFeePaid > 0 && (
                  <tr>
                    <td className="p-2.5 font-sans text-destructive font-semibold">
                      Late Payment Penalty / Charges
                      <span className="block text-[10px] text-muted-foreground font-sans">Overdue delay charges collected</span>
                    </td>
                    <td className="p-2.5 text-right font-bold text-destructive font-mono">{inr(lateFeePaid)}</td>
                  </tr>
                )}
                {earlyClosureCharge > 0 && (
                  <tr>
                    <td className="p-2.5 font-sans text-purple-700 dark:text-purple-400 font-semibold">
                      Early Closure / Foreclosure Charge
                      <span className="block text-[10px] text-muted-foreground font-sans">Applicable early settlement fee</span>
                    </td>
                    <td className="p-2.5 text-right font-bold text-purple-700 dark:text-purple-400">{inr(earlyClosureCharge)}</td>
                  </tr>
                )}
                {payment?.bankTransactionId && (
                  <tr className="bg-muted/20">
                    <td className="p-2 font-sans text-muted-foreground">Bank Transaction ID / UTR Reference</td>
                    <td className="p-2 text-right text-foreground font-mono font-semibold">{payment.bankTransactionId}</td>
                  </tr>
                )}
                <tr className="bg-emerald-500/10 border-t-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-bold">
                  <td className="p-3 font-sans text-sm uppercase">TOTAL RECEIVED — THIS PAYMENT</td>
                  <td className="p-3 text-right text-base">{inr(totalPaid)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Full Payment History Table ───────────────────────────── */}
          {loanPayments.length > 0 && (
            <div>
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] mb-1.5 flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" />
                Complete Payment History for {loan.id}
              </h4>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-xs min-w-[480px]">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-[10px] text-muted-foreground uppercase font-semibold">
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Receipt</th>
                      <th className="p-2 text-left">EMI</th>
                      <th className="p-2 text-left">Date</th>
                      <th className="p-2 text-right">Principal</th>
                      <th className="p-2 text-right">Interest</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-center">Method</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono">
                    {loanPayments.map((p, idx) => {
                      const pEmi = emis.find((e) => e.id === p.emiId);
                      const pRow = pEmi ? sched.rows.find((r) => r.emiNo === pEmi.emiNo) : null;
                      let pComp = 0;
                      let iComp = 0;
                      if (pRow) {
                        const ratio = pRow.emiAmount > 0 ? p.amount / pRow.emiAmount : 1;
                        iComp = Math.round(pRow.interestComponent * Math.min(1, ratio));
                        pComp = Math.max(0, p.amount - iComp);
                      }
                      const isThis = p.receiptId === receiptId;
                      return (
                        <tr
                          key={p.id}
                          className={isThis ? "bg-emerald-500/10 font-bold" : "hover:bg-muted/20"}
                        >
                          <td className="p-2 text-muted-foreground">{idx + 1}</td>
                          <td className="p-2 text-[10px] font-mono text-foreground">
                            {p.receiptId ?? "—"}
                            {isThis && <Badge className="ml-1 text-[8px] h-4 bg-emerald-500/20 text-emerald-700 border-emerald-500/30">THIS</Badge>}
                          </td>
                          <td className="p-2 text-muted-foreground">#{pEmi?.emiNo ?? "—"}</td>
                          <td className="p-2 text-muted-foreground font-sans">{fmtDate(p.date)}</td>
                          <td className="p-2 text-right text-foreground">{inr(pComp)}</td>
                          <td className="p-2 text-right text-amber-600">{inr(iComp)}</td>
                          <td className="p-2 text-right text-emerald-600 font-bold">{inr(p.amount)}</td>
                          <td className="p-2 text-center">
                            <Badge variant="outline" className="text-[9px]">{p.method}</Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Totals row */}
                    <tr className="bg-muted/50 border-t-2 border-border font-bold text-[11px]">
                      <td colSpan={4} className="p-2 font-sans">TOTAL</td>
                      <td className="p-2 text-right text-foreground">{inr(principalCollectedTotal)}</td>
                      <td className="p-2 text-right text-amber-600">{inr(interestCollectedTotal)}</td>
                      <td className="p-2 text-right text-emerald-600">{inr(collectedTotal)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Post-Payment Loan Balance ────────────────────────────── */}
          <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-2">
            <h4 className="font-bold text-foreground text-[10px] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              Outstanding Loan Balance After This Payment
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-muted-foreground font-sans">Total Paid So Far:</span>
                <p className="font-bold text-emerald-600 mt-0.5">{inr(collectedTotal)}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-sans">Principal Outstanding:</span>
                <p className="font-bold text-foreground mt-0.5">{inr(outstandingPrincipal)}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-sans">Interest Outstanding:</span>
                <p className="font-bold text-foreground mt-0.5">{inr(outstandingInterest)}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground font-sans">Total Remaining:</span>
                <p className="font-bold text-primary mt-0.5">{inr(outstandingPrincipal + outstandingInterest)}</p>
              </div>
            </div>
          </div>

          {/* ── Signatures ──────────────────────────────────────────── */}
          <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="border-t border-foreground/30 pt-2">
              <p className="font-bold text-foreground">Customer Signature</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{customer?.name}</p>
            </div>
            <div className="border-t border-foreground/30 pt-2">
              <p className="font-bold text-foreground">Authorized Signatory</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{settings.businessName} (Seal &amp; Signature)</p>
            </div>
          </div>

          {/* ── Footer ──────────────────────────────────────────────── */}
          <div className="text-center pt-2 border-t border-border/40 text-[9px] text-muted-foreground space-y-0.5">
            <p>{settings.receiptFooter || "Thank you for prompt repayment. Preserve this receipt for future reference."}</p>
            <p className="font-mono">
              Collector: {payment?.collectedBy || admin.name} • Issued on: {fmtDateTime(receipt.date)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
