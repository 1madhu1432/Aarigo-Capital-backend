import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Banknote,
  Calendar,
  Download,
  FileSpreadsheet,
  Search,
  Filter,
  Users,
  CreditCard,
  ArrowDownRight,
  CheckCircle2,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, inrShort, pct, fmtDate, fmtDateTime } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success(`Exported ${filename}`);
}

function ReportsPage() {
  const { loans, emis, payments, customers, receipts, today } = useStore();
  const [activeTab, setActiveTab] = useState("portfolio");
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  // Portfolio Totals
  const totalDisbursed = useMemo(() => loans.reduce((s, l) => s + l.principal, 0), [loans]);
  const totalPayable = useMemo(() => loans.reduce((s, l) => s + l.totalPayable, 0), [loans]);
  const totalCollected = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments]);
  const totalOutstanding = Math.max(0, totalPayable - totalCollected);

  const overdueEmis = useMemo(() => emis.filter((e) => e.status === "Overdue"), [emis]);
  const overdueAmount = useMemo(() => overdueEmis.reduce((s, e) => s + (e.amount - e.paid), 0), [overdueEmis]);

  const recoveryRate = totalPayable > 0 ? Math.round((totalCollected / totalPayable) * 100) : 0;
  const npaRate = totalOutstanding > 0 ? Math.round((overdueAmount / totalOutstanding) * 100) : 0;

  // Breakdown by payment method
  const cashTotal = useMemo(() => payments.filter((p) => p.method === "Cash").reduce((s, p) => s + p.amount, 0), [payments]);
  const upiTotal = useMemo(() => payments.filter((p) => p.method === "UPI").reduce((s, p) => s + p.amount, 0), [payments]);
  const bankTotal = useMemo(() => payments.filter((p) => p.method === "Bank").reduce((s, p) => s + p.amount, 0), [payments]);

  // Delinquent customer list
  const delinquentCustomers = useMemo(() => {
    const map = new Map<string, { customer: (typeof customers)[0]; overdueCount: number; overdueTotal: number; lastDueDate: string }>();
    overdueEmis.forEach((e) => {
      const c = customers.find((cust) => cust.id === e.customerId);
      if (!c) return;
      const existing = map.get(c.id) ?? { customer: c, overdueCount: 0, overdueTotal: 0, lastDueDate: e.dueDate };
      existing.overdueCount += 1;
      existing.overdueTotal += (e.amount - e.paid);
      if (e.dueDate < existing.lastDueDate) existing.lastDueDate = e.dueDate;
      map.set(c.id, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.overdueTotal - a.overdueTotal);
  }, [overdueEmis, customers]);

  // Filtered collections
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const c = customers.find((cust) => cust.id === p.customerId);
      const matchesSearch = !searchQuery ||
        c?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.receiptId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMethod = methodFilter === "all" || p.method === methodFilter;
      return matchesSearch && matchesMethod;
    });
  }, [payments, customers, searchQuery, methodFilter]);

  // CSV Exporters
  const exportPortfolioCsv = () => {
    const headers = ["Loan ID", "Customer ID", "Customer Name", "Principal", "Total Payable", "Tenure Months", "Status", "Start Date"];
    const rows = loans.map((l) => {
      const c = customers.find((cust) => cust.id === l.customerId);
      return [l.id, l.customerId, c?.name ?? "Unknown", l.principal, l.totalPayable, l.tenure, l.status, l.startDate];
    });
    downloadCsv(`loanflow_portfolio_${today}.csv`, headers, rows);
  };

  const exportCollectionsCsv = () => {
    const headers = ["Payment ID", "Receipt ID", "Date", "Customer Name", "Loan ID", "Amount", "Method", "Collected By"];
    const rows = filteredPayments.map((p) => {
      const c = customers.find((cust) => cust.id === p.customerId);
      return [p.id, p.receiptId, p.date, c?.name ?? "Unknown", p.loanId, p.amount, p.method, p.collectedBy];
    });
    downloadCsv(`loanflow_collections_${today}.csv`, headers, rows);
  };

  const exportDelinquencyCsv = () => {
    const headers = ["Customer ID", "Customer Name", "Mobile", "City", "Overdue EMIs", "Total Overdue Amount", "Oldest Due Date"];
    const rows = delinquentCustomers.map((d) => [
      d.customer.id,
      d.customer.name,
      d.customer.mobile,
      d.customer.address.city,
      d.overdueCount,
      d.overdueTotal,
      d.lastDueDate,
    ]);
    downloadCsv(`loanflow_delinquency_npa_${today}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
            Portfolio Reports & Analytics
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Audit-grade lending metrics, collection channel breakdowns, and delinquency exposure
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "portfolio" && (
            <Button size="sm" variant="outline" onClick={exportPortfolioCsv} className="text-xs h-9 cursor-pointer">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export Portfolio CSV
            </Button>
          )}
          {activeTab === "collections" && (
            <Button size="sm" variant="outline" onClick={exportCollectionsCsv} className="text-xs h-9 cursor-pointer">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export Collections CSV
            </Button>
          )}
          {activeTab === "delinquency" && (
            <Button size="sm" variant="outline" onClick={exportDelinquencyCsv} className="text-xs h-9 cursor-pointer">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export NPA Risk CSV
            </Button>
          )}
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Disbursed</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold font-mono text-foreground">{inr(totalDisbursed)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Across {loans.length} loans</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total Recovered</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold font-mono text-emerald-600">{inr(totalCollected)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{recoveryRate}% recovery rate</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold font-mono text-foreground">{inr(totalOutstanding)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Principal + interest due</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Overdue Risk (NPA)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold font-mono text-destructive">{inr(overdueAmount)}</div>
            <p className="text-[11px] text-muted-foreground mt-1">{npaRate}% of outstanding</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="portfolio" className="text-xs cursor-pointer">Portfolio Overview</TabsTrigger>
          <TabsTrigger value="collections" className="text-xs cursor-pointer">Collections Ledger</TabsTrigger>
          <TabsTrigger value="delinquency" className="text-xs cursor-pointer">
            Delinquency & NPA ({delinquentCustomers.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Portfolio Breakdown */}
        <TabsContent value="portfolio" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Channels */}
            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 md:p-5">
                <CardTitle className="text-sm font-semibold">Collections by Channel</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Payment mode distribution across all received receipts
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4 text-xs">
                <div className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <span>Cash Collection</span>
                    <span className="font-mono">{inr(cashTotal)} ({totalCollected > 0 ? Math.round((cashTotal / totalCollected) * 100) : 0}%)</span>
                  </div>
                  <Progress value={totalCollected > 0 ? (cashTotal / totalCollected) * 100 : 0} className="h-2" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <span>UPI Payments</span>
                    <span className="font-mono">{inr(upiTotal)} ({totalCollected > 0 ? Math.round((upiTotal / totalCollected) * 100) : 0}%)</span>
                  </div>
                  <Progress value={totalCollected > 0 ? (upiTotal / totalCollected) * 100 : 0} className="h-2" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between font-medium">
                    <span>Bank Transfer</span>
                    <span className="font-mono">{inr(bankTotal)} ({totalCollected > 0 ? Math.round((bankTotal / totalCollected) * 100) : 0}%)</span>
                  </div>
                  <Progress value={totalCollected > 0 ? (bankTotal / totalCollected) * 100 : 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Portfolio Health */}
            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 md:p-5">
                <CardTitle className="text-sm font-semibold">Portfolio Health Summary</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Active vs overdue book performance
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3 text-xs">
                <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Active Performing Loans:</span>
                  </div>
                  <strong className="font-mono text-sm">{loans.filter((l) => l.status === "Active").length}</strong>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-destructive/10 text-destructive">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Overdue Non-Performing Loans:</span>
                  </div>
                  <strong className="font-mono text-sm">{loans.filter((l) => l.status === "Overdue").length}</strong>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/60 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>Closed / Fully Repaid:</span>
                  </div>
                  <strong className="font-mono text-sm text-foreground">{loans.filter((l) => l.status === "Closed").length}</strong>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Collections Ledger */}
        <TabsContent value="collections" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by customer, receipt ID or payment ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-full sm:w-40 text-xs h-9">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Methods</SelectItem>
                <SelectItem value="Cash" className="text-xs">Cash</SelectItem>
                <SelectItem value="UPI" className="text-xs">UPI</SelectItem>
                <SelectItem value="Bank" className="text-xs">Bank</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="shadow-xs border-border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                    <tr>
                      <th className="p-3">Receipt / ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Loan</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Method</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No collection records match your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((p) => {
                        const cust = customers.find((c) => c.id === p.customerId);
                        return (
                          <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-mono">
                              <span className="font-semibold text-foreground">{p.receiptId}</span>
                              <span className="block text-[10px] text-muted-foreground">{p.id}</span>
                            </td>
                            <td className="p-3 font-medium text-foreground">{cust?.name}</td>
                            <td className="p-3 font-mono text-muted-foreground">{p.loanId}</td>
                            <td className="p-3 text-muted-foreground">{fmtDateTime(p.date)}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px]">
                                {p.method}
                              </Badge>
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-600">
                              {inr(p.amount)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Delinquency & NPA */}
        <TabsContent value="delinquency" className="space-y-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 md:p-5 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Delinquent Customer Exposure Matrix
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Ranked by outstanding default risk. Requires prioritized field officer intervention.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-medium">
                    <tr>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Contact</th>
                      <th className="p-3">Location</th>
                      <th className="p-3 text-center">Overdue EMIs</th>
                      <th className="p-3 text-right">Total Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {delinquentCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-emerald-600 font-medium">
                          Zero delinquent accounts! All active EMIs are currently up to date.
                        </td>
                      </tr>
                    ) : (
                      delinquentCustomers.map((d) => (
                        <tr key={d.customer.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium text-foreground">
                            <div>{d.customer.name}</div>
                            <div className="text-[10px] font-mono text-muted-foreground">{d.customer.id}</div>
                          </td>
                          <td className="p-3 font-mono text-muted-foreground">{d.customer.mobile}</td>
                          <td className="p-3 text-muted-foreground">
                            {d.customer.address.area}, {d.customer.address.city}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="destructive" className="text-[10px] px-2">
                              {d.overdueCount} EMIs
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-destructive">
                            {inr(d.overdueTotal)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
