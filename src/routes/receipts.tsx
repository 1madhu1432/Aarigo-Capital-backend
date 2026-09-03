import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Receipt as ReceiptIcon, Search, X, Printer, Eye } from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, fmtDateTime } from "@/lib/format";
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
  const [query, setQuery] = useState("");
  const [previewReceiptId, setPreviewReceiptId] = useState<string | null>(null);

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
    if (!q) return receiptsWithData;
    return receiptsWithData.filter(({ r, cust }) =>
      r.id.toLowerCase().includes(q) ||
      r.paymentId.toLowerCase().includes(q) ||
      r.loanId.toLowerCase().includes(q) ||
      cust?.name.toLowerCase().includes(q) ||
      cust?.id.toLowerCase().includes(q) ||
      false
    );
  }, [receiptsWithData, query]);

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
        <Badge variant="secondary" className="px-2.5 py-1 text-xs w-fit">{receipts.length} Receipts</Badge>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
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
