import { useState, useMemo } from "react";
import { createFileRoute, useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import {
  CreditCard,
  Search,
  X,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate } from "@/lib/format";
import { EarlyCloseDialog } from "@/components/loans/EarlyCloseDialog";
import { EmiSchedulePrintModal } from "@/components/loans/EmiSchedulePrintModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/loans")({
  component: LoansRouteComponent,
});

function LoansRouteComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChild = pathname !== "/loans" && pathname !== "/loans/";
  if (isChild) {
    return <Outlet />;
  }
  return <LoansPage />;
}

function LoansPage() {
  const { loans, customers, emis, payments } = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("active");
  const [printLoan, setPrintLoan] = useState<(typeof loans)[0] | null>(null);
  const [earlyCloseLoan, setEarlyCloseLoan] = useState<(typeof loans)[0] | null>(null);

  const filtered = useMemo(() => {
    let result = loans;
    if (frequencyFilter !== "all") {
      result = result.filter((l) => l.frequency === frequencyFilter);
    }
    if (!query) return result;
    const q = query.toLowerCase();
    return result.filter((l) => {
      const c = customers.find((cust) => cust.id === l.customerId);
      const matchesQ =
        l.id.toLowerCase().includes(q) ||
        (c?.name ?? "").toLowerCase().includes(q) ||
        l.customerId.toLowerCase().includes(q);
      return matchesQ;
    });
  }, [loans, customers, query, frequencyFilter]);

  const byStatus = {
    active: filtered.filter((l) => l.status === "Active"),
    overdue: filtered.filter((l) => l.status === "Overdue"),
    closed: filtered.filter((l) => l.status === "Closed" || l.status === "Closed Early"),
  };

  const LoanRow = ({ loan }: { loan: (typeof loans)[0] }) => {
    const cust = customers.find((c) => c.id === loan.customerId);
    const loanEmis = emis.filter((e) => e.loanId === loan.id);
    const paidEmis = loanEmis.filter((e) => e.status === "Paid").length;
    const totalPaid = payments.filter((p) => p.loanId === loan.id && !p.reversed).reduce((s, p) => s + p.amount, 0);
    const isClosedEarly = loan.status === "Closed Early" || Boolean(loan.earlyClosure);
    const outstanding = isClosedEarly ? 0 : Math.max(0, loan.totalPayable - totalPaid);
    const progress = isClosedEarly ? 100 : loanEmis.length > 0 ? Math.round((paidEmis / loanEmis.length) * 100) : 0;
    const nextEmi = loanEmis.find((e) => e.status !== "Paid" && e.status !== "Partial" && e.status !== "Cancelled");
    const canEarlyClose = loan.status !== "Closed" && !isClosedEarly && outstanding > 0;

    return (
      <div
        className="p-4 hover:bg-muted/30 cursor-pointer transition-colors group"
        onClick={() => void navigate({ to: "/loans/$id", params: { id: loan.id } })}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {cust && (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: `hsl(${cust.photoHue}, 65%, 45%)` }}
              >
                {cust.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                  {cust?.name ?? "Unknown"}
                </span>
                <StatusBadge status={loan.status} />
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                {loan.id} • {cust?.id} • {loan.frequency}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Principal</p>
              <p className="font-mono font-medium">{inr(loan.principal)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">EMI</p>
              <p className="font-mono font-medium">{inr(loan.emiAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Paid</p>
              <p className="font-mono font-medium text-emerald-600">{inr(totalPaid)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Outstanding</p>
              <p className={`font-mono font-bold ${outstanding > 0 ? "text-foreground" : "text-emerald-600"}`}>
                {inr(outstanding)}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Progress value={progress} className="h-1 flex-1" />
            <span className="text-[10px] text-muted-foreground shrink-0">
              {isClosedEarly ? "Foreclosed" : `${paidEmis}/${loanEmis.length} EMIs`}
            </span>
            {nextEmi && !isClosedEarly && (
              <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
                Next: {fmtDate(nextEmi.dueDate)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              title="Print EMI Schedule"
              onClick={() => setPrintLoan(loan)}
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-primary" />
              <span className="hidden md:inline">Print</span>
            </Button>

            {canEarlyClose && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px] text-purple-700 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10 cursor-pointer"
                title="Early Close Loan"
                onClick={() => setEarlyCloseLoan(loan)}
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                <span className="hidden md:inline">Early Close</span>
              </Button>
            )}

            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors ml-1" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">Loan Portfolio</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Manage all active, overdue, and closed loan contracts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs font-semibold">
              {byStatus.active.length} Active
            </Badge>
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30 bg-destructive/5">
              {byStatus.overdue.length} Overdue
            </Badge>
          </div>
          <Button
            size="sm"
            className="text-xs h-9 cursor-pointer"
            onClick={() => void navigate({ to: "/loans/new" })}
          >
            + New Loan
          </Button>
        </div>
      </div>

      {/* Search and Frequency Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by loan ID, customer name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 text-xs h-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Frequency:</span>
          <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
            <SelectTrigger className="h-9 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Frequencies</SelectItem>
              <SelectItem value="Daily" className="text-xs">Daily (Day)</SelectItem>
              <SelectItem value="Weekly" className="text-xs">Weekly</SelectItem>
              <SelectItem value="Monthly" className="text-xs">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active" className="text-xs gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            Active ({byStatus.active.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="text-xs gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Overdue ({byStatus.overdue.length})
          </TabsTrigger>
          <TabsTrigger value="closed" className="text-xs gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Closed ({byStatus.closed.length})
          </TabsTrigger>
        </TabsList>

        {(["active", "overdue", "closed"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="m-0">
            <Card className="shadow-xs border-border">
              <CardContent className="p-0 divide-y divide-border/60">
                {byStatus[tab].length === 0 ? (
                  <EmptyState
                    icon={CreditCard}
                    title={`No ${tab} loans`}
                    description={query ? `No ${tab} loans match your search.` : `All ${tab} loans will appear here.`}
                    className="py-12"
                  />
                ) : (
                  byStatus[tab].map((loan) => <LoanRow key={loan.id} loan={loan} />)
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Early Close Dialog */}
      <EarlyCloseDialog
        loan={earlyCloseLoan}
        customer={customers.find((c) => c.id === earlyCloseLoan?.customerId)}
        open={Boolean(earlyCloseLoan)}
        onOpenChange={(open) => {
          if (!open) setEarlyCloseLoan(null);
        }}
      />

      {/* Print EMI Schedule Modal */}
      <EmiSchedulePrintModal
        loan={printLoan}
        customer={customers.find((c) => c.id === printLoan?.customerId)}
        open={Boolean(printLoan)}
        onOpenChange={(open) => {
          if (!open) setPrintLoan(null);
        }}
      />
    </div>
  );
}
