import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight, Banknote } from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, safe, fmtDate } from "@/lib/format";
import { computeAmortizationSchedule, calculateEarlyClosure } from "@/utils/amortization";
import type { Loan, Customer, PaymentMethod } from "@/types";

interface EarlyCloseDialogProps {
  loan: Loan | null;
  customer?: Customer | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EarlyCloseDialog({
  loan,
  customer,
  open,
  onOpenChange,
  onSuccess,
}: EarlyCloseDialogProps) {
  const { emis, payments, earlyCloseLoan } = useStore();

  const [chargePercentStr, setChargePercentStr] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [bankTxId, setBankTxId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [confirmStep, setConfirmStep] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Calculate live financial schedule
  const sched = useMemo(() => {
    if (!loan) return null;
    return computeAmortizationSchedule(loan, emis, payments);
  }, [loan, emis, payments]);

  const parsedPercent = useMemo(() => {
    const p = parseFloat(chargePercentStr);
    if (isNaN(p) || p < 0) return 0;
    return p;
  }, [chargePercentStr]);

  const closureCalc = useMemo(() => {
    const outstandingP = sched ? sched.outstandingPrincipal : 0;
    return calculateEarlyClosure(outstandingP, parsedPercent);
  }, [sched, parsedPercent]);

  if (!loan || !sched) return null;

  const handleChargeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setErrorMsg("");
    if (val === "") {
      setChargePercentStr("");
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num)) return;
    if (num < 0) {
      setErrorMsg("Early closure charge cannot be negative.");
      return;
    }
    if (num > 100) {
      setErrorMsg("Early closure charge percentage cannot exceed 100%.");
      return;
    }
    setChargePercentStr(val);
  };

  const handleProceedToConfirm = () => {
    if (closureCalc.outstandingPrincipal <= 0) {
      toast.error("This loan has no outstanding principal balance to close early.");
      return;
    }
    if (paymentMethod === "Bank" && !bankTxId.trim()) {
      setErrorMsg("Bank Transaction ID / UTR reference is required for Bank Transfer.");
      return;
    }
    setErrorMsg("");
    setConfirmStep(true);
  };

  const handleFinalConfirm = () => {
    if (paymentMethod === "Bank" && !bankTxId.trim()) {
      setErrorMsg("Bank Transaction ID is required for Bank Transfer.");
      return;
    }

    try {
      const result = earlyCloseLoan({
        loanId: loan.id,
        chargePercent: closureCalc.chargePercent,
        method: paymentMethod,
        bankTransactionId: bankTxId.trim(),
        notes: notes.trim() || `Early foreclosure closure at ${closureCalc.chargePercent}% charge`,
      });

      toast.success(`Loan ${loan.id} closed early successfully!`, {
        description: `Final settlement of ${inr(result.payment.amount)} collected. Receipt ${result.receipt.id} generated.`,
      });

      setConfirmStep(false);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to close loan early.";
      toast.error(msg);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setConfirmStep(false);
          setErrorMsg("");
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-700 dark:text-purple-400">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  {confirmStep ? "Confirm Early Loan Foreclosure" : "Early Close Loan"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {loan.id} • {customer?.name ?? "Customer"}
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 border-purple-500/30">
              Foreclosure Settlement
            </Badge>
          </div>
        </DialogHeader>

        {!confirmStep ? (
          /* STEP 1: Calculation & Parameter Input */
          <div className="space-y-4 py-2 text-xs">
            {/* Critical Policy Banner */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-semibold text-xs">Principal-Only Foreclosure Policy</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Early closure is calculated <strong>strictly on Outstanding Principal</strong>. Future/unearned interest is <strong>waived (₹0 charged)</strong>.
                </p>
              </div>
            </div>

            {/* Separate Itemized Financial Breakdown (User Req A2) */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Itemized Financial Statement
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Original Loan Amount</p>
                  <p className="font-mono font-bold text-sm text-foreground mt-0.5">{inr(loan.principal)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Interest Rate & Method</p>
                  <p className="font-semibold text-xs text-foreground mt-0.5">
                    {loan.interestRate}% p.a. • {loan.interestMethod}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">EMI Amount</p>
                  <p className="font-mono font-bold text-sm text-primary mt-0.5">{inr(loan.emiAmount)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Total Scheduled Interest</p>
                  <p className="font-mono font-medium text-xs text-foreground mt-0.5">{inr(loan.totalInterest)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Paid Amount So Far</p>
                  <p className="font-mono font-bold text-xs text-emerald-600 mt-0.5">{inr(sched.totalPaid)}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold uppercase">Outstanding Principal</p>
                  <p className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {inr(closureCalc.outstandingPrincipal)}
                  </p>
                </div>
              </div>
            </div>

            {/* Early Closure Charge Input (User Req A3) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
              <div className="space-y-1.5">
                <Label htmlFor="chargePercent" className="text-xs font-semibold text-foreground">
                  Early Closure Charge (%)
                </Label>
                <div className="relative">
                  <Input
                    id="chargePercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={chargePercentStr}
                    onChange={handleChargeChange}
                    placeholder="0"
                    className="font-mono font-bold text-sm h-9 pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs font-bold text-muted-foreground pointer-events-none">
                    %
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">Default is 0%. Enter numeric percentage (e.g., 0, 1, 2, 3, 5).</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Early Closure Charge Amount</Label>
                <div className="h-9 px-3 rounded-md bg-muted/60 border border-border flex items-center font-mono font-bold text-sm text-purple-700 dark:text-purple-400">
                  {inr(closureCalc.chargeAmount)}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {inr(closureCalc.outstandingPrincipal)} × {closureCalc.chargePercent}% ÷ 100
                </p>
              </div>
            </div>

            {/* Future Interest Charged Explicit Verification (User Req A1/A2) */}
            <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">Future / Unearned Interest Charged</p>
                <p className="text-[10px] text-muted-foreground">Waived per consumer fair-lending foreclosure rules</p>
              </div>
              <span className="font-mono font-bold text-sm text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                ₹0
              </span>
            </div>

            {/* Final Settlement Total */}
            <div className="p-4 rounded-xl bg-purple-600 text-white shadow-md flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-semibold text-purple-200">
                  Final Early Closure Amount
                </p>
                <p className="text-xs text-purple-100 mt-0.5">
                  Outstanding Principal ({inr(closureCalc.outstandingPrincipal)}) + Charge ({inr(closureCalc.chargeAmount)})
                </p>
              </div>
              <p className="font-mono text-xl sm:text-2xl font-black tracking-tight">
                {inr(closureCalc.finalClosureAmount)}
              </p>
            </div>

            {/* Payment Mode Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="payMethod" className="text-xs font-semibold">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                  <SelectTrigger id="payMethod" className="h-9 text-xs">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Bank">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "Bank" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="bankTx" className="text-xs font-semibold text-foreground">
                    Bank Transaction ID / UTR <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="bankTx"
                    value={bankTxId}
                    onChange={(e) => setBankTxId(e.target.value)}
                    placeholder="e.g. UTR123456789"
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="closureNotes" className="text-xs font-semibold">Settlement Notes (Optional)</Label>
                  <Input
                    id="closureNotes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Customer foreclosed by cash"
                    className="h-9 text-xs"
                  />
                </div>
              )}
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-destructive bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
                {errorMsg}
              </p>
            )}
          </div>
        ) : (
          /* STEP 2: Confirmation Screen (User Req A4) */
          <div className="space-y-4 py-2 text-xs">
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 font-mono">
              <div className="text-center pb-2 border-b border-border">
                <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                  ------------------------------------------
                </p>
                <p className="font-bold text-sm tracking-wider text-foreground">
                  EARLY LOAN CLOSURE CONFIRMATION
                </p>
                <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground">
                  ------------------------------------------
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-muted-foreground">Loan ID</span>
                <span className="font-bold text-right text-foreground">{loan.id}</span>

                <span className="text-muted-foreground">Customer Name</span>
                <span className="font-bold text-right text-foreground">{customer?.name ?? "—"}</span>

                <span className="text-muted-foreground">Outstanding Principal</span>
                <span className="font-bold text-right text-foreground">{inr(closureCalc.outstandingPrincipal)}</span>

                <span className="text-muted-foreground">Future Interest Charged</span>
                <span className="font-bold text-right text-emerald-600">₹0</span>

                <span className="text-muted-foreground">Early Closure Charge %</span>
                <span className="font-bold text-right text-foreground">{closureCalc.chargePercent}%</span>

                <span className="text-muted-foreground">Closure Charge</span>
                <span className="font-bold text-right text-purple-600">{inr(closureCalc.chargeAmount)}</span>
              </div>

              <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-black text-foreground">
                <span>FINAL CLOSURE AMOUNT</span>
                <span className="text-purple-700 dark:text-purple-400 font-mono text-base">
                  {inr(closureCalc.finalClosureAmount)}
                </span>
              </div>

              <div className="pt-2 border-t border-border/60 text-[11px] grid grid-cols-2 gap-1 font-sans">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-semibold text-right">{paymentMethod}</span>
                {paymentMethod === "Bank" && (
                  <>
                    <span className="text-muted-foreground">Bank Tx Ref:</span>
                    <span className="font-mono text-right">{bankTxId}</span>
                  </>
                )}
              </div>
            </div>

            {/* Explicit mandatory notice from A4 */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-semibold">Important Confirmation Note:</p>
                <p className="text-[11px] mt-0.5">
                  "Future/unearned interest is not included in the early closure amount."
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Upon confirmation, loan status will change to <strong>Closed Early</strong>, outstanding balance will become <strong>₹0</strong>, and future scheduled EMIs will become <strong>Cancelled</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-border/60 pt-3 gap-2">
          {!confirmStep ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs cursor-pointer"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
                onClick={handleProceedToConfirm}
              >
                Review Closure Details
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs cursor-pointer"
                onClick={() => setConfirmStep(false)}
              >
                Back to Edit
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs bg-purple-600 hover:bg-purple-700 text-white cursor-pointer font-bold"
                onClick={handleFinalConfirm}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Confirm Early Closure ({inr(closureCalc.finalClosureAmount)})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
