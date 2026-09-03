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
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

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
  const [activeTab, setActiveTab] = useState("active");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return loans.filter((l) => {
      const cust = customers.find((c) => c.id === l.customerId);
      const matchesQ =
        l.id.toLowerCase().includes(q) ||
        (cust?.name ?? "").toLowerCase().includes(q) ||
        l.customerId.toLowerCase().includes(q);
      return matchesQ;
    });
  }, [loans, customers, query]);

  const byStatus = {
    active: filtered.filter((l) => l.status === "Active"),
    overdue: filtered.filter((l) => l.status === "Overdue"),
    closed: filtered.filter((l) => l.status === "Closed"),
  };

  const LoanRow = ({ loan }: { loan: (typeof loans)[0] }) => {
    const cust = customers.find((c) => c.id === loan.customerId);
    const loanEmis = emis.filter((e) => e.loanId === loan.id);
    const paidEmis = loanEmis.filter((e) => e.status === "Paid").length;
    const totalPaid = payments.filter((p) => p.loanId === loan.id).reduce((s, p) => s + p.amount, 0);
    const outstanding = Math.max(0, loan.totalPayable - totalPaid);
    const progress = loanEmis.length > 0 ? Math.round((paidEmis / loanEmis.length) * 100) : 0;
    const nextEmi = loanEmis.find((e) => e.status !== "Paid" && e.status !== "Partial");

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
        <div className="mt-2.5 flex items-center gap-3">
          <Progress value={progress} className="h-1 flex-1" />
          <span className="text-[10px] text-muted-foreground shrink-0">{paidEmis}/{loanEmis.length} EMIs</span>
          {nextEmi && (
            <span className="text-[10px] text-muted-foreground shrink-0">
              Next: {fmtDate(nextEmi.dueDate)}
            </span>
          )}
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
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

      {/* Search */}
      <div className="relative max-w-sm">
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
    </div>
  );
}
