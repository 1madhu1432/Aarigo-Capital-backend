import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Receipt as ReceiptIcon, Search, X, Printer, Eye, Calendar, RotateCcw } from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, fmtDateTime, todayISO, addDays } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PaymentReceiptModal } from "@/components/loans/PaymentReceiptModal";

export const Route = createFileRoute("/receipts")({
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const { receipts, payments, customers, loans, settings, admin } = useStore();
  const today = todayISO();
  const [query, setQuery] = useState("");
  const [dayFilter, setDayFilter] = useState<"all" | "today" | "yesterday" | "custom">("all");
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [previewReceiptId, setPreviewReceiptId] = useState<string | null>(null);

  const activeDate = useMemo(() => {
    if (dayFilter === "today") return today;
    if (dayFilter === "yesterday") return addDays(today, -1);
    if (dayFilter === "custom") return selectedDate;
    return null;
  }, [dayFilter, today, selectedDate]);

  const receiptsWithData = useMemo(() =>
    receipts.map((r) => {
      const cust = customers.find((c) => c.id === r.customerId);
      const payment = payments.find((p) => p.id === r.paymentId);
      const loan = loans.find((l) => l.id === r.loanId);
      return { r, cust, payment, loan };
    }),
    [receipts, customers, payments, loans]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return receiptsWithData.filter(({ r, cust }) => {
      if (activeDate && r.date.slice(0, 10) !== activeDate) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.paymentId.toLowerCase().includes(q) ||
        r.loanId.toLowerCase().includes(q) ||
        cust?.name.toLowerCase().includes(q) ||
        cust?.id.toLowerCase().includes(q) ||
        false
      );
    });
  }, [receiptsWithData, query, activeDate]);

  // Aggregate metrics for cards
  const totalAmountCollected = useMemo(() => filtered.reduce((s, { r }) => s + r.amount, 0), [filtered]);
  const cashCollected = useMemo(
    () => filtered.filter(({ payment }) => payment?.method === "Cash").reduce((s, { r }) => s + r.amount, 0),
    [filtered]
  );
  const digitalCollected = useMemo(
    () => filtered.filter(({ payment }) => payment?.method !== "Cash").reduce((s, { r }) => s + r.amount, 0),
    [filtered]
  );

  const previewData = previewReceiptId ? receiptsWithData.find((d) => d.r.id === previewReceiptId) : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Receipts</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Payment receipts issued for all EMI collections
          </p>
        </div>
        <Badge variant="secondary" className="px-2.5 py-1 text-xs w-fit">
          {filtered.length} of {receipts.length} Receipts
        </Badge>
      </div>

      {/* Search & Day Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search receipt, payment ID, customer..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Day / All Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-muted-foreground">Receipt Day:</span>
          <div className="inline-flex rounded-md border border-border/80 p-0.5 bg-muted/30">
            <button
              type="button"
              onClick={() => setDayFilter("all")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                dayFilter === "all" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => {
                setDayFilter("today");
                setSelectedDate(today);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                dayFilter === "today" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                setDayFilter("yesterday");
                setSelectedDate(addDays(today, -1));
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                dayFilter === "yesterday" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yesterday
            </button>
          </div>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                setSelectedDate(e.target.value);
                setDayFilter("custom");
              }
            }}
            className="h-9 text-xs w-36"
          />
          {dayFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDayFilter("all")}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              title="Clear day filter"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards (Filter Day & All) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="shadow-xs border-border/80">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {dayFilter === "all" ? "All Receipts" : `Receipts (${fmtDate(activeDate!)})`}
              </span>
              <Badge variant="outline" className="text-[9px] font-mono">
                {filtered.length} Nos
              </Badge>
            </div>
            <p className="text-xl font-bold font-mono text-foreground mt-1">{filtered.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
              {dayFilter === "all" ? "All issued receipts" : `Issued on ${fmtDate(activeDate!)}`}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-emerald-500/30 bg-gradient-to-br from-card to-emerald-500/5">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wide font-semibold">
                Total Collected
              </span>
              <Badge className="text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                Gross
              </Badge>
            </div>
            <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">{inr(totalAmountCollected)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Across verified receipts
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Cash Collected</span>
              <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-500/30 bg-amber-500/10">
                Cash
              </Badge>
            </div>
            <p className="text-xl font-bold font-mono text-amber-600 mt-1">{inr(cashCollected)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Physical cash receipts
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Digital / UPI / Bank</span>
              <Badge variant="outline" className="text-[9px] text-blue-600 border-blue-500/30 bg-blue-500/10">
                Online
              </Badge>
            </div>
            <p className="text-xl font-bold font-mono text-blue-600 mt-1">{inr(digitalCollected)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Bank & UPI verified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Receipts Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptIcon}
          title="No receipts found"
          description={query ? `No receipts match "${query}"` : "Receipts will appear here after payments are recorded."}
        />
      ) : (
        <Card className="shadow-xs border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  {["Receipt No.", "Payment ID", "Customer", "Loan", "Amount", "Method", "Date", "Status", "Actions"].map((h) => (
                    <th key={h} className={`p-3 text-[10px] text-muted-foreground font-medium ${h === "Amount" ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map(({ r, cust }) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-[10px] font-semibold">{r.id}</td>
                    <td className="p-3 font-mono text-[10px] text-muted-foreground">{r.paymentId}</td>
                    <td className="p-3">
                      <div>
                        <div className="font-medium text-foreground">{cust?.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{cust?.id}</div>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[10px]">{r.loanId}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-600">+{inr(r.amount)}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[9px]">{r.method}</Badge>
                    </td>
                    <td className="p-3 whitespace-nowrap">{fmtDateTime(r.date)}</td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] px-2 cursor-pointer"
                          onClick={() => setPreviewReceiptId(r.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Itemized Payment Receipt Modal */}
      <PaymentReceiptModal
        open={!!previewReceiptId}
        onOpenChange={(open) => {
          if (!open) setPreviewReceiptId(null);
        }}
        receiptId={previewReceiptId}
      />
    </div>
  );
}
