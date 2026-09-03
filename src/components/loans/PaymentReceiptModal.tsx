import { useState } from "react";
import { Printer, CheckCircle2, ShieldCheck, Download } from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, fmtDateTime } from "@/lib/format";
import type { Receipt, Payment, Customer, Loan, Emi } from "@/types";
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

  // Compute amortization breakdown for loan to get exact principal/interest split
  const sched = loan ? computeAmortizationSchedule(loan, emis, payments) : null;
  const targetRow = sched && targetEmi ? sched.rows.find((r) => r.emiNo === targetEmi.emiNo) : null;

  // Calculate itemized payment split
  const totalPaid = receipt?.amount ?? 0;
  const isEarlyClosure = Boolean(payment?.isEarlyClosure || loan?.status === "Closed Early");

  let principalPaid = 0;
  let interestPaid = 0;
  let earlyClosureCharge = 0;

  if (isEarlyClosure) {
    earlyClosureCharge = payment?.earlyClosureCharge ?? loan?.earlyClosure?.earlyClosureCharge ?? 0;
    principalPaid = Math.max(0, totalPaid - earlyClosureCharge);
    interestPaid = 0; // Waived on early closure
  } else if (targetRow) {
    const ratio = targetRow.emiAmount > 0 ? totalPaid / targetRow.emiAmount : 1;
    interestPaid = Math.round(targetRow.interestComponent * Math.min(1, ratio));
    principalPaid = Math.max(0, totalPaid - interestPaid);
  } else {
    // Fallback: estimate 80% principal, 20% interest
    interestPaid = Math.round(totalPaid * 0.15);
    principalPaid = totalPaid - interestPaid;
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-0 border-border">
        <DialogHeader className="p-4 border-b border-border/60 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <DialogTitle className="text-sm font-bold">Official Payment Receipt</DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} className="h-8 text-xs cursor-pointer">
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print Receipt
            </Button>
          </div>
        </DialogHeader>

        {receipt && (
          <div className="p-6 space-y-5 text-xs bg-background" id="printable-payment-receipt">
            {/* Business Header & Branding */}
            <div className="text-center border-b border-border/80 pb-4 space-y-1">
              <div className="flex items-center justify-center gap-2">
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

            {/* Receipt Summary Ribbon */}
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
                <span className="text-[9px] text-muted-foreground uppercase font-sans">Date & Time</span>
                <p className="font-semibold text-foreground text-[11px]">{fmtDateTime(receipt.date)}</p>
              </div>
              <div>
                <span className="text-[9px] text-muted-foreground uppercase font-sans">Payment Mode</span>
                <p className="font-bold text-emerald-600 text-xs">{receipt.method}</p>
              </div>
            </div>

            {/* Borrower & Loan Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Left Column: Customer Info */}
              <div className="p-3 rounded-lg border border-border/70 bg-muted/10 space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] border-b border-border/50 pb-1 flex items-center justify-between">
                  <span>Customer Details</span>
                  <span className="font-mono text-primary">{customer?.id}</span>
                </h4>
                <div className="space-y-1 text-muted-foreground">
                  <p><strong className="text-foreground">Name:</strong> {customer?.name ?? "—"}</p>
                  <p><strong className="text-foreground">Guardian:</strong> {customer?.guardianName ?? "—"}</p>
                  <p><strong className="text-foreground">Mobile:</strong> {customer?.mobile ?? "—"}</p>
                  <p><strong className="text-foreground">Address:</strong> {customer ? `${customer.address.house}, ${customer.address.area}, ${customer.address.city}` : "—"}</p>
                </div>
              </div>

              {/* Right Column: Loan Info */}
              <div className="p-3 rounded-lg border border-border/70 bg-muted/10 space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] border-b border-border/50 pb-1 flex items-center justify-between">
                  <span>Loan & Account Details</span>
                  <span className="font-mono text-primary">{loan?.id}</span>
                </h4>
                <div className="space-y-1 text-muted-foreground">
                  <p><strong className="text-foreground">Account No:</strong> {loan?.accountId ?? "ACC-0001"}</p>
                  <p><strong className="text-foreground">Original Principal:</strong> {inr(loan?.principal)}</p>
                  <p><strong className="text-foreground">Interest Structure:</strong> {loan?.interestRate}% ({loan?.interestMethod})</p>
                  <p><strong className="text-foreground">EMI Installment:</strong> #{targetEmi?.emiNo ?? 1} of {loan?.tenure ?? 12} (Due: {fmtDate(targetEmi?.dueDate)})</p>
                </div>
              </div>
            </div>

            {/* Itemized Payment Breakdown Table */}
            <div>
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px] mb-1.5">
                Itemized Financial Allocation Breakdown
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
                      Principal Component Allocation
                      <span className="block text-[10px] text-muted-foreground font-sans">Applied directly to reduce loan principal balance</span>
                    </td>
                    <td className="p-2.5 text-right font-bold text-foreground">{inr(principalPaid)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-sans text-foreground">
                      Interest Component Allocation
                      <span className="block text-[10px] text-muted-foreground font-sans">
                        {isEarlyClosure ? "Waived (₹0 charged on early closure)" : `Scheduled interest component for EMI #${targetEmi?.emiNo ?? 1}`}
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-bold text-foreground">{inr(interestPaid)}</td>
                  </tr>
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
                    <td className="p-3 font-sans text-sm uppercase">TOTAL RECEIVED AMOUNT</td>
                    <td className="p-3 text-right text-base">{inr(totalPaid)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Post-Payment Loan Status Summary */}
            {sched && (
              <div className="p-3.5 rounded-lg border border-border/80 bg-muted/20 space-y-2">
                <h4 className="font-bold text-foreground text-[10px] uppercase tracking-wider">
                  Loan Portfolio Balance Post-Payment
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground font-sans">Total Paid So Far:</span>
                    <p className="font-bold text-emerald-600 mt-0.5">{inr(sched.totalPaid)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-sans">Principal Outstanding:</span>
                    <p className="font-bold text-foreground mt-0.5">{inr(sched.outstandingPrincipal)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-sans">Interest Outstanding:</span>
                    <p className="font-bold text-foreground mt-0.5">{inr(sched.outstandingInterest)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground font-sans">Total Remaining Payable:</span>
                    <p className="font-bold text-primary mt-0.5">{inr(sched.outstandingPrincipal + sched.outstandingInterest)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Declaration & Physical Signatures */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="border-t border-foreground/30 pt-2">
                <p className="font-bold text-foreground">Customer Signature</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{customer?.name}</p>
              </div>
              <div className="border-t border-foreground/30 pt-2">
                <p className="font-bold text-foreground">Authorized Signatory</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{settings.businessName} (Seal & Signature)</p>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="text-center pt-2 border-t border-border/40 text-[9px] text-muted-foreground space-y-0.5">
              <p>{settings.receiptFooter || "Thank you for prompt repayment. Preserve this receipt for future reference."}</p>
              <p className="font-mono">Collector: {payment?.collectedBy || admin.name} • Issued on: {fmtDateTime(receipt.date)}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
