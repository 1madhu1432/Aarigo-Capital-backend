import { useState, useMemo } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import {
  Phone,
  MessageSquare,
  MapPin,
  Banknote,
  PlusCircle,
  ArrowLeft,
  User,
  CreditCard,
  FileText,
  Eye,
  CalendarCheck,
  BarChart2,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit3,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { inr, fmtDate, fmtDateTime, daysBetween, todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";

export const Route = createFileRoute("/customers/$id")({
  component: CustomerProfilePage,
});

function CustomerProfilePage() {
  const { id } = useParams({ from: "/customers/$id" });
  const { customers, accounts, loans, emis, payments, visits, documents, limitHistory } = useStore();
  const navigate = useNavigate();
  const today = todayISO();

  const customer = customers.find((c) => c.id === id);
  const account = accounts.find((a) => a.customerId === id);
  const customerLoans = loans.filter((l) => l.customerId === id);
  const activeLoans = customerLoans.filter((l) => l.status === "Active");
  const customerEmis = emis.filter((e) => e.customerId === id);
  const customerPayments = payments.filter((p) => p.customerId === id);
  const customerVisits = visits.filter((v) => v.customerId === id);
  const customerDocs = documents.filter((d) => d.customerId === id);
  const customerLimitHistory = limitHistory.filter((h) => h.customerId === id);

  const usedLimit = useMemo(() => {
    return activeLoans.reduce((sum, l) => {
      const loanEmis = emis.filter((e) => e.loanId === l.id);
      const remaining = loanEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0);
      return sum + remaining;
    }, 0);
  }, [activeLoans, emis]);

  const creditLimit = account?.creditLimit ?? 0;
  const availableLimit = Math.max(0, creditLimit - usedLimit);
  const usedPct = creditLimit > 0 ? Math.min(100, Math.round((usedLimit / creditLimit) * 100)) : 0;

  const overdueEmis = customerEmis.filter((e) => e.status === "Overdue");
  const overdueAmount = overdueEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0);

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-sm text-muted-foreground">Customer not found.</p>
        <Button size="sm" onClick={() => void navigate({ to: "/customers" })} className="cursor-pointer">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Customers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Back + Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void navigate({ to: "/customers" })}
            className="text-xs h-8 -ml-2 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Back
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={() => { window.open(`tel:${customer.mobile}`, "_self"); }}
          >
            <Phone className="h-3.5 w-3.5 mr-1.5" />
            Call
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={() => { window.open(`https://wa.me/91${customer.mobile}`, "_blank"); }}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            WhatsApp
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={() => {
              const addr = [customer.address.house, customer.address.area, customer.address.city].join(", ");
              window.open(`https://maps.google.com/?q=${encodeURIComponent(addr)}`, "_blank");
            }}
          >
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            Navigate
          </Button>
          <Button
            size="sm"
            className="text-xs h-8 cursor-pointer"
            onClick={() => void navigate({ to: "/collection" })}
          >
            <Banknote className="h-3.5 w-3.5 mr-1.5" />
            Collect EMI
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8 cursor-pointer"
            onClick={() => void navigate({ to: "/loans" })}
          >
            <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
            New Loan
          </Button>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="shadow-xs border-border">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white shadow-sm"
              style={{ backgroundColor: `hsl(${customer.photoHue}, 65%, 45%)` }}
            >
              {customer.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <h1 className="text-lg font-bold text-foreground truncate">{customer.name}</h1>
                <StatusBadge status={customer.status} size="sm" />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                <span className="font-mono font-medium text-foreground">{customer.id}</span>
                {account && <span className="font-mono">{account.id}</span>}
                <span>{customer.mobile}</span>
                <span>{customer.occupation}</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>
                  {customer.address.house}, {customer.address.area}, {customer.address.city},{" "}
                  {customer.address.district} — {customer.address.pin}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Credit Limit</p>
            <p className="text-base font-bold text-foreground mt-0.5">{inr(creditLimit)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Used Limit</p>
            <p className="text-base font-bold text-foreground mt-0.5">{inr(usedLimit)}</p>
            <Progress value={usedPct} className="h-1 mt-1.5" />
          </CardContent>
        </Card>
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Available</p>
            <p className="text-base font-bold text-emerald-600 mt-0.5">{inr(availableLimit)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Outstanding</p>
            <p className="text-base font-bold text-foreground mt-0.5">{inr(usedLimit)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Overdue</p>
            <p className={`text-base font-bold mt-0.5 ${overdueAmount > 0 ? "text-destructive" : "text-foreground"}`}>
              {inr(overdueAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max gap-0">
            {[
              { value: "overview", label: "Overview" },
              { value: "personal", label: "Personal" },
              { value: "kyc", label: "KYC" },
              { value: "loans", label: `Loans (${customerLoans.length})` },
              { value: "emi", label: `EMI (${customerEmis.length})` },
              { value: "payments", label: `Payments (${customerPayments.length})` },
              { value: "visits", label: `Visits (${customerVisits.length})` },
              { value: "docs", label: `Docs (${customerDocs.length})` },
            ].map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs whitespace-nowrap">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="m-0 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Active Loans Summary */}
            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 pb-2 border-b border-border/60">
                <CardTitle className="text-xs font-semibold">Active Loans</CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border/60">
                {activeLoans.length === 0 ? (
                  <EmptyState icon={CreditCard} title="No active loans" className="py-8" />
                ) : (
                  activeLoans.map((l) => {
                    const loanEmis = emis.filter((e) => e.loanId === l.id);
                    const paidEmis = loanEmis.filter((e) => e.status === "Paid").length;
                    const progress = loanEmis.length > 0 ? Math.round((paidEmis / loanEmis.length) * 100) : 0;
                    const outstanding = loanEmis.reduce((s, e) => s + Math.max(0, e.amount - e.paid), 0);
                    return (
                      <div key={l.id} className="p-3.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-semibold text-foreground">{l.id}</span>
                          <StatusBadge status={l.status} />
                        </div>
                        <div className="flex justify-between mt-1.5 text-muted-foreground">
                          <span>Principal: {inr(l.principal)}</span>
                          <span>Outstanding: <span className="font-semibold text-foreground">{inr(outstanding)}</span></span>
                        </div>
                        <Progress value={progress} className="h-1 mt-2" />
                        <p className="text-[10px] text-muted-foreground mt-1">{paidEmis}/{loanEmis.length} EMIs paid</p>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 pb-2 border-b border-border/60">
                <CardTitle className="text-xs font-semibold">Recent Payments</CardTitle>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-border/60">
                {customerPayments.length === 0 ? (
                  <EmptyState icon={Banknote} title="No payments yet" className="py-8" />
                ) : (
                  customerPayments.slice(0, 6).map((p) => (
                    <div key={p.id} className="p-3.5 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-mono text-[10px] text-muted-foreground">{p.receiptId}</div>
                        <div className="text-foreground mt-0.5">{p.loanId} • <Badge variant="outline" className="text-[9px]">{p.method}</Badge></div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-600">+{inr(p.amount)}</div>
                        <div className="text-[10px] text-muted-foreground">{fmtDateTime(p.date)}</div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Personal Tab */}
        <TabsContent value="personal" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {[
                { label: "Full Name", value: customer.name },
                { label: "Guardian / S/o / D/o", value: customer.guardianName },
                { label: "Date of Birth", value: fmtDate(customer.dob) },
                { label: "Gender", value: customer.gender },
                { label: "Mobile", value: customer.mobile },
                { label: "Alternate Mobile", value: customer.altMobile || "—" },
                { label: "Occupation", value: customer.occupation },
                { label: "Monthly Income", value: inr(customer.monthlyIncome) },
                { label: "Customer Since", value: fmtDate(customer.createdAt) },
                { label: "Status", value: customer.status },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="font-medium text-foreground mt-0.5">{value}</p>
                </div>
              ))}
              <div className="sm:col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Address</p>
                <p className="font-medium text-foreground mt-0.5">
                  {customer.address.house}, {customer.address.area}, {customer.address.landmark &&
                    `Near ${customer.address.landmark}, `}
                  {customer.address.city}, {customer.address.district}, {customer.address.state} — {customer.address.pin}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KYC Tab */}
        <TabsContent value="kyc" className="m-0 space-y-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">KYC Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">KYC Type</p>
                <p className="font-medium text-foreground mt-0.5">{customer.kycType}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">KYC Number</p>
                <p className="font-mono font-medium text-foreground mt-0.5">{customer.kycNumber}</p>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 pb-2 border-b border-border/60">
                <CardTitle className="text-xs font-semibold">Nominee</CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: "Name", value: customer.nominee.name },
                  { label: "Relationship", value: customer.nominee.relationship },
                  { label: "Mobile", value: customer.nominee.mobile },
                  { label: "Address", value: customer.nominee.address },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
                    <p className="font-medium text-foreground mt-0.5">{value || "—"}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="shadow-xs border-border">
              <CardHeader className="p-4 pb-2 border-b border-border/60">
                <CardTitle className="text-xs font-semibold">Guarantor</CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: "Name", value: customer.guarantor.name },
                  { label: "Relationship", value: customer.guarantor.relationship },
                  { label: "Mobile", value: customer.guarantor.mobile },
                  { label: "Address", value: customer.guarantor.address },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
                    <p className="font-medium text-foreground mt-0.5">{value || "—"}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Loans Tab */}
        <TabsContent value="loans" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">All Loans</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/60">
              {customerLoans.length === 0 ? (
                <EmptyState icon={CreditCard} title="No loans found" description="This customer has no loans." className="py-10" />
              ) : (
                customerLoans.map((l) => {
                  const loanEmis = emis.filter((e) => e.loanId === l.id);
                  const totalPaid = payments.filter((p) => p.loanId === l.id).reduce((s, p) => s + p.amount, 0);
                  const outstanding = Math.max(0, l.totalPayable - totalPaid);
                  return (
                    <div key={l.id} className="p-4 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-foreground">{l.id}</span>
                        <StatusBadge status={l.status} />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground">Principal</span>
                          <div className="font-medium">{inr(l.principal)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Total Payable</span>
                          <div className="font-medium">{inr(l.totalPayable)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Paid</span>
                          <div className="font-medium text-emerald-600">{inr(totalPaid)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Outstanding</span>
                          <div className={`font-medium ${outstanding > 0 ? "text-foreground" : "text-emerald-600"}`}>
                            {inr(outstanding)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-[10px] text-muted-foreground flex gap-4">
                        <span>EMI: {inr(l.emiAmount)}/{l.frequency.toLowerCase()}</span>
                        <span>Rate: {l.interestRate}% {l.interestMethod}</span>
                        <span>Tenure: {l.tenure} {l.frequency === "Monthly" ? "mo" : l.frequency === "Weekly" ? "wk" : "days"}</span>
                        <span>Start: {fmtDate(l.startDate)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EMI Tab */}
        <TabsContent value="emi" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">EMI Schedule</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">#</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Loan</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Due Date</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Amount</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Paid</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Remaining</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerEmis.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-muted-foreground">No EMIs found</td>
                    </tr>
                  ) : (
                    customerEmis.map((e) => (
                      <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-[10px] text-muted-foreground">{e.emiNo}</td>
                        <td className="p-3 font-mono text-[10px]">{e.loanId}</td>
                        <td className="p-3">{fmtDate(e.dueDate)}</td>
                        <td className="p-3 text-right font-mono">{inr(e.amount)}</td>
                        <td className="p-3 text-right font-mono text-emerald-600">{inr(e.paid)}</td>
                        <td className="p-3 text-right font-mono">{inr(Math.max(0, e.amount - e.paid))}</td>
                        <td className="p-3"><StatusBadge status={e.status} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">Payment History</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Receipt</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Loan</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Amount</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Method</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Date</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Collector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerPayments.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No payments recorded</td></tr>
                  ) : (
                    customerPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-[10px]">{p.receiptId}</td>
                        <td className="p-3 font-mono text-[10px]">{p.loanId}</td>
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

        {/* Visits Tab */}
        <TabsContent value="visits" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">Field Visits</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Visit ID</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Date</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Due</th>
                    <th className="text-right p-3 text-[10px] text-muted-foreground font-medium">Collected</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-3 text-[10px] text-muted-foreground font-medium">Next Visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customerVisits.length === 0 ? (
                    <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No visits recorded</td></tr>
                  ) : (
                    customerVisits.map((v) => (
                      <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-mono text-[10px]">{v.id}</td>
                        <td className="p-3">{fmtDate(v.date)}</td>
                        <td className="p-3 text-right font-mono">{inr(v.dueAmount)}</td>
                        <td className="p-3 text-right font-mono text-emerald-600">{inr(v.collected)}</td>
                        <td className="p-3"><StatusBadge status={v.status} /></td>
                        <td className="p-3 text-muted-foreground">{v.nextVisit ? fmtDate(v.nextVisit) : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="docs" className="m-0">
          <Card className="shadow-xs border-border">
            <CardHeader className="p-4 pb-2 border-b border-border/60">
              <CardTitle className="text-xs font-semibold">Documents</CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/60">
              {customerDocs.length === 0 ? (
                <EmptyState icon={FileText} title="No documents" description="No documents uploaded for this customer." className="py-10" />
              ) : (
                customerDocs.map((d) => (
                  <div key={d.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{d.name}</div>
                        <div className="text-[10px] text-muted-foreground">{d.type} • {d.sizeKb} KB • {fmtDate(d.uploadedAt)}</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px]">{d.type}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
