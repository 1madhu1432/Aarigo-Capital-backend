import { useMemo } from "react";
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
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, fmtDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/loans/$id")({
  component: LoanDetailPage,
});

function LoanDetailPage() {
  const { id } = useParams({ from: "/loans/$id" });
  const { loans, customers, emis, payments, visits, documents } = useStore();
  const navigate = useNavigate();

  const loan = loans.find((l) => l.id === id);
  const customer = loan ? customers.find((c) => c.id === loan.customerId) : undefined;
  const loanEmis = useMemo(() => emis.filter((e) => e.loanId === id), [emis, id]);
  const loanPayments = useMemo(() => payments.filter((p) => p.loanId === id), [payments, id]);
  const loanVisits = useMemo(() => visits.filter((v) => v.loanId === id), [visits, id]);
  const loanDocs = useMemo(() => documents.filter((d) => d.customerId === loan?.customerId), [documents, loan]);

  const totalPaid = useMemo(() => loanPayments.reduce((s, p) => s + p.amount, 0), [loanPayments]);
  const outstanding = loan ? Math.max(0, loan.totalPayable - totalPaid) : 0;
  const paidEmis = loanEmis.filter((e) => e.status === "Paid").length;
  const progress = loanEmis.length > 0 ? Math.round((paidEmis / loanEmis.length) * 100) : 0;

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
    <div className="space-y-6 max-w-7xl mx-auto">
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
        <Button
          size="sm"
          className="text-xs h-9 cursor-pointer"
          onClick={() => void navigate({ to: "/collection" })}
        >
          <Banknote className="h-3.5 w-3.5 mr-1.5" />
          Collect EMI
        </Button>
      </div>

      {/* Loan Header */}
      <Card className="shadow-xs border-border">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-bold text-foreground">{loan.id}</span>
                <StatusBadge status={loan.status} size="sm" />
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
                    className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-primary"
                    onClick={() => void navigate({ to: "/customers/$id", params: { id: customer.id } })}
                  >
                    {customer.id}
                  </span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Repayment Progress</p>
              <p className="text-sm font-bold text-foreground mt-0.5">{progress}% Complete</p>
              <Progress value={progress} className="h-2 mt-1.5 w-32" />
              <p className="text-[10px] text-muted-foreground mt-1">{paidEmis} of {loanEmis.length} EMIs paid</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Principal", value: inr(loan.principal), color: "" },
          { label: "Total Interest", value: inr(loan.totalInterest), color: "" },
          { label: "Processing Fee", value: inr(loan.processingFee), color: "" },
          { label: "Total Payable", value: inr(loan.totalPayable), color: "" },
          { label: "Total Paid", value: inr(totalPaid), color: "text-emerald-600" },
          { label: "Outstanding", value: inr(outstanding), color: outstanding > 0 ? "text-foreground" : "text-emerald-600" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="shadow-xs border-border">
            <CardContent className="p-3.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className={`text-sm font-bold mt-0.5 ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Loan Terms */}
      <Card className="shadow-xs border-border">
        <CardHeader className="p-4 pb-2 border-b border-border/60">
          <CardTitle className="text-xs font-semibold">Loan Terms</CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {[
            { label: "Interest Rate", value: `${loan.interestRate}%` },
            { label: "Interest Method", value: loan.interestMethod },
            { label: "Tenure", value: `${loan.tenure} ${loan.frequency === "Monthly" ? "months" : loan.frequency === "Weekly" ? "weeks" : "days"}` },
            { label: "EMI Frequency", value: loan.frequency },
            { label: "EMI Amount", value: inr(loan.emiAmount) },
            { label: "Start Date", value: fmtDate(loan.startDate) },
            { label: "First EMI Date", value: fmtDate(loan.firstEmiDate) },
            { label: "End Date", value: fmtDate(loan.endDate) },
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
                    {["EMI ID", "No.", "Due Date", "Amount", "Paid", "Remaining", "Status"].map((h) => (
                      <th key={h} className={`p-3 text-[10px] text-muted-foreground font-medium ${h === "Amount" || h === "Paid" || h === "Remaining" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loanEmis.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-[10px] text-muted-foreground">{e.id}</td>
                      <td className="p-3">{e.emiNo}</td>
                      <td className="p-3">{fmtDate(e.dueDate)}</td>
                      <td className="p-3 text-right font-mono">{inr(e.amount)}</td>
                      <td className="p-3 text-right font-mono text-emerald-600">{inr(e.paid)}</td>
                      <td className="p-3 text-right font-mono">{inr(Math.max(0, e.amount - e.paid))}</td>
                      <td className="p-3"><StatusBadge status={e.status} /></td>
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
                    {["Payment ID", "Receipt", "Amount", "Method", "Date", "Collector"].map((h) => (
                      <th key={h} className={`p-3 text-[10px] text-muted-foreground font-medium ${h === "Amount" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loanPayments.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No payments recorded</td></tr>
                  ) : (
                    loanPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-[10px]">{p.id}</td>
                        <td className="p-3 font-mono text-[10px]">{p.receiptId}</td>
                        <td className="p-3 text-right font-mono font-semibold text-emerald-600">+{inr(p.amount)}</td>
                        <td className="p-3"><Badge variant="outline" className="text-[9px]">{p.method}</Badge></td>
                        <td className="p-3">{fmtDateTime(p.date)}</td>
                        <td className="p-3 text-muted-foreground">{p.collectedBy}</td>
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
                    {["Visit ID", "Date", "Due Amount", "Collected", "Status", "Reason", "Next Visit"].map((h) => (
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
                        <td className="p-3 text-muted-foreground">{v.reason ?? "—"}</td>
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
    </div>
  );
}
