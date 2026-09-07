import { useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Download, FileSpreadsheet, Filter, CheckCircle2, ShieldAlert } from "lucide-react";
import { inr, fmtDate, fmtDateTime, safe } from "@/lib/format";
import { useStore } from "@/store/app-store";
import { computeAmortizationSchedule } from "@/utils/amortization";
import type { Loan, Customer, EmiStatus } from "@/types";
import { toast } from "sonner";

interface EmiSchedulePrintModalProps {
  loan: Loan | null;
  customer?: Customer | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmiSchedulePrintModal({
  loan,
  customer,
  open,
  onOpenChange,
}: EmiSchedulePrintModalProps) {
  const { emis, payments, settings } = useStore();
  const printContainerRef = useRef<HTMLDivElement>(null);

  const [statusFilter, setStatusFilter] = useState<string>("All");

  const sched = useMemo(() => {
    if (!loan) return null;
    return computeAmortizationSchedule(loan, emis, payments);
  }, [loan, emis, payments]);

  const displayedRows = useMemo(() => {
    if (!sched) return [];
    if (statusFilter === "All") return sched.rows;
    return sched.rows.filter((r) => {
      if (statusFilter === "Pending") {
        return r.status === "Due" || r.status === "Upcoming" || r.status === "Overdue" || r.status === "Partial";
      }
      return r.status === statusFilter;
    });
  }, [sched, statusFilter]);

  if (!loan || !sched) return null;

  // Counts for summary
  const paidCount = sched.rows.filter((r) => r.status === "Paid").length;
  const partialCount = sched.rows.filter((r) => r.status === "Partial").length;
  const overdueCount = sched.rows.filter((r) => r.status === "Overdue").length;
  const upcomingCount = sched.rows.filter((r) => r.status === "Upcoming" || r.status === "Due").length;
  const cancelledCount = sched.rows.filter((r) => r.status === "Cancelled").length;

  const totalScheduled = sched.rows.reduce((s, r) => s + r.emiAmount, 0);
  const totalPaid = sched.totalPaid;
  const totalPending = sched.rows.reduce((s, r) => s + (r.status !== "Cancelled" ? r.remainingAmount : 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCsv = () => {
    const headers = [
      "S.NO",
      "EMI ID",
      "Due Date",
      "EMI Amount",
      "Principal Component",
      "Interest Component",
      "Paid Amount",
      "Closing Balance",
      "Status",
      "Payment Date",
      "Payment ID",
      "Receipt ID",
      "Payment Method",
      "Remarks",
    ];

    const rows = sched.rows.map((r) => [
      r.emiNo,
      r.emiId,
      r.dueDate,
      r.emiAmount,
      r.principalComponent,
      r.interestComponent,
      r.paidAmount,
      r.closingBalance,
      r.status,
      r.paymentDetails?.date ? fmtDate(r.paymentDetails.date) : "—",
      r.paymentDetails?.paymentId ?? "—",
      r.paymentDetails?.receiptId ?? "—",
      r.paymentDetails?.method ?? "—",
      r.remarks,
    ]);

    const csvContent = [
      `"${settings.businessName} - EMI REPAYMENT SCHEDULE"`,
      `"Loan ID: ${loan.id}","Customer: ${customer?.name ?? ""}"`,
      "",
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EMI_Schedule_${loan.id}_${loan.customerId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("EMI Schedule CSV downloaded.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Top interactive action toolbar (hidden on print) */}
        <DialogHeader className="p-4 pb-3 border-b border-border/60 bg-muted/30 print:hidden flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Printer className="h-4 w-4 text-primary" />
              EMI Repayment Schedule — Print & Export
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Official A4 document layout with complete amortization and payment verification
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter before print (User Req B16) */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-32">
                  <SelectValue placeholder="Filter rows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All ({sched.rows.length})</SelectItem>
                  <SelectItem value="Paid">Paid ({paidCount})</SelectItem>
                  <SelectItem value="Partial">Partial ({partialCount})</SelectItem>
                  <SelectItem value="Pending">Pending ({upcomingCount + overdueCount})</SelectItem>
                  <SelectItem value="Overdue">Overdue ({overdueCount})</SelectItem>
                  <SelectItem value="Cancelled">Cancelled ({cancelledCount})</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {statusFilter !== "All" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 cursor-pointer"
                onClick={() => setStatusFilter("All")}
              >
                Show All
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 cursor-pointer"
              onClick={handleDownloadCsv}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
              CSV
            </Button>
            <Button
              size="sm"
              className="text-xs h-8 cursor-pointer bg-primary text-primary-foreground font-semibold"
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print / Save PDF
            </Button>
          </div>
        </DialogHeader>

        {/* ========================================================================= */}
        {/* PRINTABLE A4 DOCUMENT BODY                                                */}
        {/* ========================================================================= */}
        <div
          ref={printContainerRef}
          id="printable-emi-schedule"
          className="flex-1 overflow-y-auto p-6 md:p-8 bg-white text-black font-sans text-xs selection:bg-slate-200"
          style={{ minHeight: "100%" }}
        >
          {/* 1. DOCUMENT HEADER (B2) */}
          <div className="border-b-2 border-slate-800 pb-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/logo-icon.jpg"
                  alt="Company Logo"
                  className="h-12 w-12 object-contain rounded-lg border border-slate-300"
                />
                <div>
                  <h1 className="text-xl font-black tracking-wider uppercase text-slate-900">
                    {settings.businessName}
                  </h1>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {settings.businessAddress} • Tel: {settings.businessPhone} • Email: {settings.businessEmail}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded text-xs font-bold uppercase tracking-widest">
                  EMI REPAYMENT SCHEDULE
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  Generated: {fmtDate(new Date().toISOString())}
                </p>
              </div>
            </div>
          </div>

          {/* 2. STRUCTURED TWO-COLUMN INFORMATION SECTION (B2) */}
          <div className="grid grid-cols-2 gap-4 mb-4 border border-slate-300 rounded-lg p-3 bg-slate-50/50">
            {/* LEFT: Loan Details */}
            <div className="space-y-1 pr-3 border-r border-slate-200 text-[11px]">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">Loan Number / ID:</span>
                <span className="font-mono font-bold text-slate-900">{loan.id}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">Loan Principal:</span>
                <span className="font-mono font-bold text-slate-900">{inr(loan.principal)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">Loan Term:</span>
                <span className="font-medium text-slate-900">
                  {loan.tenure} {loan.frequency === "Monthly" ? "Months" : loan.frequency === "Weekly" ? "Weeks" : "Days"}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">EMI Amount:</span>
                <span className="font-mono font-bold text-slate-900">{inr(loan.emiAmount)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">EMI Frequency:</span>
                <span className="font-medium text-slate-900">{loan.frequency}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">Disbursement Date:</span>
                <span className="font-medium text-slate-900">{fmtDate(loan.startDate)}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">Loan Type / Purpose:</span>
                <span className="font-medium text-slate-900">{loan.purpose || "General Purpose"}</span>
              </div>
            </div>

            {/* RIGHT: Customer Details */}
            <div className="space-y-1 pl-1 text-[11px]">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">Customer Name:</span>
                <span className="font-bold text-slate-900">{customer?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">Customer ID:</span>
                <span className="font-mono text-slate-900">{customer?.id ?? "—"}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">Co-Applicant / Guarantor:</span>
                <span className="font-medium text-slate-900">{customer?.guarantor?.name || "—"}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">Father / Guardian:</span>
                <span className="font-medium text-slate-900">{customer?.guardianName || "—"}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">Village / Area:</span>
                <span className="font-medium text-slate-900">
                  {customer?.address?.area || customer?.address?.house || "—"}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">District / State:</span>
                <span className="font-medium text-slate-900">
                  {customer?.address?.district ? `${customer.address.district}, ${customer.address.state}` : "—"}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500 font-medium">Mobile Number:</span>
                <span className="font-mono text-slate-900">{customer?.mobile || "—"}</span>
              </div>
            </div>
          </div>

          {/* 3. FINANCIAL SUMMARY (B3) */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4 text-center">
            <div className="p-2 border border-slate-300 rounded bg-slate-50">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Principal</p>
              <p className="font-mono font-bold text-xs text-slate-900 mt-0.5">{inr(loan.principal)}</p>
            </div>
            <div className="p-2 border border-slate-300 rounded bg-slate-50">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Total Interest</p>
              <p className="font-mono font-bold text-xs text-slate-900 mt-0.5">{inr(loan.totalInterest)}</p>
            </div>
            <div className="p-2 border border-slate-300 rounded bg-slate-50">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Total Payment</p>
              <p className="font-mono font-bold text-xs text-slate-900 mt-0.5">{inr(loan.totalPayable)}</p>
            </div>
            <div className="p-2 border border-slate-300 rounded bg-slate-50">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">EMI Amount</p>
              <p className="font-mono font-bold text-xs text-slate-900 mt-0.5">{inr(loan.emiAmount)}</p>
            </div>
            <div className="p-2 border border-slate-300 rounded bg-slate-50">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Interest Rate</p>
              <p className="font-medium text-xs text-slate-900 mt-0.5">{loan.interestRate}% p.a.</p>
            </div>
            <div className="p-2 border border-slate-300 rounded bg-slate-50">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Method</p>
              <p className="font-medium text-xs text-slate-900 mt-0.5">{loan.interestMethod}</p>
            </div>
            <div className="p-2 border border-slate-300 rounded bg-slate-50">
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Tenure</p>
              <p className="font-medium text-xs text-slate-900 mt-0.5">{loan.tenure} EMIs</p>
            </div>
          </div>

          {/* 4. MAIN EMI REPAYMENT TABLE (B4, B5, B6, B7, B8, B9) */}
          <div className="mb-4">
            <table className="w-full border-collapse border border-slate-400 text-[10px]">
              <thead>
                <tr className="bg-slate-200 text-slate-800 border-b border-slate-400 font-bold uppercase tracking-wider">
                  <th className="border border-slate-400 p-1.5 text-center w-10">S.NO</th>
                  <th className="border border-slate-400 p-1.5 text-center w-20">Due Date</th>
                  <th className="border border-slate-400 p-1.5 text-right w-16">EMI</th>
                  <th className="border border-slate-400 p-1.5 text-right w-20">Principal Paid</th>
                  <th className="border border-slate-400 p-1.5 text-right w-16">Interest</th>
                  <th className="border border-slate-400 p-1.5 text-right w-20">Closing Balance</th>
                  <th className="border border-slate-400 p-1.5 text-center w-24">FO Signature</th>
                  <th className="border border-slate-400 p-1.5 text-left">Remarks & Details</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((r) => {
                  const isPaid = r.status === "Paid";
                  const isCancelled = r.status === "Cancelled";
                  const isPartial = r.status === "Partial";
                  const isOverdue = r.status === "Overdue";

                  return (
                    <tr
                      key={r.emiId}
                      className={`border-b border-slate-300 ${
                        isCancelled
                          ? "bg-slate-100 text-slate-400"
                          : isPaid
                          ? "bg-emerald-50/40"
                          : isOverdue
                          ? "bg-red-50/40"
                          : isPartial
                          ? "bg-amber-50/40"
                          : ""
                      }`}
                      style={{ pageBreakInside: "avoid" }}
                    >
                      {/* S.NO */}
                      <td className="border border-slate-300 p-1.5 text-center font-bold font-mono">
                        {r.emiNo}
                      </td>

                      {/* Due Date */}
                      <td className="border border-slate-300 p-1.5 text-center font-mono">
                        {fmtDate(r.dueDate)}
                      </td>

                      {/* EMI */}
                      <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">
                        {inr(r.emiAmount)}
                      </td>

                      {/* Principal Component / Paid */}
                      <td className="border border-slate-300 p-1.5 text-right font-mono">
                        {isPaid ? (
                          <span className="font-semibold text-emerald-800">{inr(r.principalComponent)}</span>
                        ) : isPartial ? (
                          <span>{inr(r.principalPaid)} / {inr(r.principalComponent)}</span>
                        ) : (
                          <span>{inr(r.principalComponent)}</span>
                        )}
                      </td>

                      {/* Interest Component */}
                      <td className="border border-slate-300 p-1.5 text-right font-mono">
                        {inr(r.interestComponent)}
                      </td>

                      {/* Closing Balance (Remaining Principal) */}
                      <td className="border border-slate-300 p-1.5 text-right font-mono font-medium">
                        {inr(r.closingBalance)}
                      </td>

                      {/* Dedicated blank physical FO Signature space (User Req B8) */}
                      <td className="border border-slate-300 p-1.5 text-center min-h-[28px]">
                        <div className="h-6 w-full"></div>
                      </td>

                      {/* Remarks & Payment Details (User Req B7, B9, B17) */}
                      <td className="border border-slate-300 p-1.5">
                        <div className="flex flex-col">
                          <span
                            className={`font-semibold ${
                              isPaid
                                ? "text-emerald-700"
                                : isCancelled
                                ? "text-slate-500 font-bold uppercase"
                                : isOverdue
                                ? "text-red-700"
                                : isPartial
                                ? "text-orange-700"
                                : "text-slate-700"
                            }`}
                          >
                            {isCancelled ? "CANCELLED - EARLY CLOSURE" : r.remarks}
                          </span>
                          {r.paymentDetails && (
                            <span className="text-[9px] text-slate-500 font-mono">
                              Paid {inr(r.paidAmount)} on {fmtDate(r.paymentDetails.date)} • {r.paymentDetails.method} • Ref: {r.paymentDetails.receiptId}
                              {r.lateFeePaid && r.lateFeePaid > 0 ? ` (Late Fee: ${inr(r.lateFeePaid)})` : ""}
                              {r.lateFeeWaived ? " (Late Fee Waived)" : ""}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 5. EMI SUMMARY AT BOTTOM (B10) */}
          <div className="border border-slate-400 rounded-lg p-3 bg-slate-50/70 mb-4 text-[11px] space-y-2">
            <div className="font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 flex justify-between">
              <span>EMI Repayment Summary & Totals</span>
              <span className="font-mono text-[10px] text-slate-500">
                Total EMIs: {sched.rows.length} (Paid: {paidCount}, Partial: {partialCount}, Overdue: {overdueCount}, Upcoming: {upcomingCount}, Cancelled: {cancelledCount})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500">Total Scheduled:</span>{" "}
                <strong className="font-mono">{inr(totalScheduled)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Total Paid Amount:</span>{" "}
                <strong className="font-mono text-emerald-800">{inr(totalPaid)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Total Pending Amount:</span>{" "}
                <strong className="font-mono text-slate-900">{inr(totalPending)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Total Principal:</span>{" "}
                <strong className="font-mono">{inr(loan.principal)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Total Interest:</span>{" "}
                <strong className="font-mono">{inr(loan.totalInterest)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Outstanding Principal:</span>{" "}
                <strong className="font-mono text-slate-900">{inr(sched.outstandingPrincipal)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Outstanding Interest:</span>{" "}
                <strong className="font-mono text-slate-900">{inr(sched.outstandingInterest)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Future Interest Waived:</span>{" "}
                <strong className="font-mono text-emerald-700">₹0 Charged</strong>
              </div>
            </div>
          </div>

          {/* 6. EARLY CLOSURE SECTION IN PRINT (B11) */}
          {(loan.status === "Closed Early" || loan.earlyClosure) && (
            <div className="border-2 border-purple-600 rounded-lg p-3 bg-purple-50/50 mb-4 text-[11px] space-y-2">
              <div className="font-black uppercase tracking-wider text-purple-900 border-b border-purple-200 pb-1 flex justify-between items-center">
                <span>EARLY CLOSURE / FORECLOSURE SUMMARY</span>
                <span className="px-2 py-0.5 bg-purple-700 text-white rounded text-[9px] font-bold">
                  CLOSED EARLY
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono">
                <div>
                  <span className="text-slate-600">Closure Date:</span>{" "}
                  <strong>{fmtDate(loan.earlyClosure?.closureDate || new Date().toISOString())}</strong>
                </div>
                <div>
                  <span className="text-slate-600">Outstanding Principal:</span>{" "}
                  <strong>{inr(loan.earlyClosure?.outstandingPrincipal || sched.outstandingPrincipal)}</strong>
                </div>
                <div>
                  <span className="text-slate-600">Early Closure Charge %:</span>{" "}
                  <strong>{loan.earlyClosure?.earlyClosureChargePercent ?? 0}%</strong>
                </div>
                <div>
                  <span className="text-slate-600">Early Closure Charge:</span>{" "}
                  <strong>{inr(loan.earlyClosure?.earlyClosureCharge ?? 0)}</strong>
                </div>
                <div>
                  <span className="text-slate-600">Future Interest Charged:</span>{" "}
                  <strong className="text-emerald-700">₹0</strong>
                </div>
                <div className="text-purple-900 font-bold text-xs bg-purple-100 p-1 rounded">
                  <span>FINAL CLOSURE AMOUNT:</span>{" "}
                  <span>{inr(loan.earlyClosure?.finalClosureAmount ?? sched.outstandingPrincipal)}</span>
                </div>
              </div>

              {loan.earlyClosure && (
                <p className="text-[10px] text-slate-600 pt-1 border-t border-purple-200">
                  Receipt: <strong>{loan.earlyClosure.receiptId}</strong> • Payment Ref: <strong>{loan.earlyClosure.paymentId}</strong> • Mode: <strong>{loan.earlyClosure.paymentMethod}</strong>
                  {loan.earlyClosure.bankTransactionId ? ` (${loan.earlyClosure.bankTransactionId})` : ""}
                </p>
              )}
            </div>
          )}

          {/* 7. SIGNATURE SECTION (B12) */}
          <div
            className="pt-12 mt-6 border-t border-slate-300 text-slate-800 text-[11px]"
            style={{ pageBreakInside: "avoid" }}
          >
            <div className="grid grid-cols-4 gap-6 text-center">
              <div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-semibold min-h-[30px] flex items-end justify-center">
                  <span>{customer?.name}</span>
                </div>
                <p className="font-bold text-[10px] uppercase tracking-wider text-slate-600">Customer Signature</p>
              </div>

              <div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-semibold min-h-[30px] flex items-end justify-center">
                  <span>&nbsp;</span>
                </div>
                <p className="font-bold text-[10px] uppercase tracking-wider text-slate-600">Field Officer Signature</p>
              </div>

              <div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-semibold min-h-[30px] flex items-end justify-center">
                  <span>{settings.businessName}</span>
                </div>
                <p className="font-bold text-[10px] uppercase tracking-wider text-slate-600">Authorized Signatory</p>
              </div>

              <div>
                <div className="border-b border-slate-400 pb-1 mb-1 font-semibold min-h-[30px] flex items-end justify-center">
                  <span>{fmtDate(new Date().toISOString())}</span>
                </div>
                <p className="font-bold text-[10px] uppercase tracking-wider text-slate-600">Date</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions for modal */}
        <DialogFooter className="p-3 border-t border-border/60 bg-muted/20 print:hidden justify-between">
          <p className="text-[11px] text-muted-foreground">
            Print layout matches A4 physical specifications with repeating table headers.
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs cursor-pointer"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              className="text-xs cursor-pointer bg-primary text-primary-foreground font-semibold"
              onClick={handlePrint}
            >
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              Print / Save as PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
