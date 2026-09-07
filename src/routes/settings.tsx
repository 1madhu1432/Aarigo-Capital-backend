import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Settings as SettingsIcon,
  Save,
  Building,
  Percent,
  BellRing,
  Receipt,
  Download,
  Database,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { EmiFrequency } from "@/types";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const store = useStore();
  const { settings, updateSettings, today } = store;

  const [form, setForm] = useState({
    businessName: settings.businessName,
    businessAddress: settings.businessAddress,
    businessPhone: settings.businessPhone,
    businessEmail: settings.businessEmail,
    defaultInterestRate: settings.defaultInterestRate,
    defaultTenure: settings.defaultTenure,
    defaultFrequency: settings.defaultFrequency || ("Monthly" as EmiFrequency),
    lateFeePerDay: settings.lateFeePerDay,
    receiptPrefix: settings.receiptPrefix,
    receiptFooter: settings.receiptFooter,
  });

  const [notifications, setNotifications] = useState({
    smsAlerts: true,
    whatsappReceipts: true,
    dailyClosingEmail: true,
    overdueAlerts: true,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
    toast.success("Settings updated successfully");
  };

  const handleExportBackup = () => {
    const backupData = {
      exportedAt: new Date().toISOString(),
      business: form.businessName,
      customers: store.customers,
      accounts: store.accounts,
      loans: store.loans,
      emis: store.emis,
      payments: store.payments,
      receipts: store.receipts,
      visits: store.visits,
      documents: store.documents,
      limitHistory: store.limitHistory,
      settings: form,
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `loanflow_hub_backup_${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Complete JSON database backup downloaded");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
          System Settings & Business Configuration
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
          Configure business details, default lending interest parameters, notifications, and data backups
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Profile */}
        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 md:p-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building className="h-4 w-4 text-primary" />
              Business Profile
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Official lending entity details shown on customer receipts and notices
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="businessName" className="text-xs">Business / Agency Name</Label>
                <Input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="businessPhone" className="text-xs">Contact Phone</Label>
                <Input
                  id="businessPhone"
                  value={form.businessPhone}
                  onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="businessEmail" className="text-xs">Official Email</Label>
                <Input
                  id="businessEmail"
                  value={form.businessEmail}
                  onChange={(e) => setForm({ ...form, businessEmail: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="businessAddress" className="text-xs">Registered Address</Label>
                <Input
                  id="businessAddress"
                  value={form.businessAddress}
                  onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loan Rules */}
        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 md:p-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              Lending & Interest Rules
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Default parameters applied to newly generated loan contracts
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rate" className="text-xs">Default Rate (% p.a.)</Label>
                <Input
                  id="rate"
                  type="number"
                  value={form.defaultInterestRate}
                  onChange={(e) => setForm({ ...form, defaultInterestRate: Number(e.target.value) })}
                  className="text-xs h-9 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="frequency" className="text-xs">Default Frequency</Label>
                <Select
                  value={form.defaultFrequency}
                  onValueChange={(v) => setForm({ ...form, defaultFrequency: v as EmiFrequency })}
                >
                  <SelectTrigger id="frequency" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly" className="text-xs">Monthly</SelectItem>
                    <SelectItem value="Weekly" className="text-xs">Weekly</SelectItem>
                    <SelectItem value="Daily" className="text-xs">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tenure" className="text-xs">
                  Default Tenure ({form.defaultFrequency === "Monthly" ? "Months" : form.defaultFrequency === "Weekly" ? "Weeks" : "Days"})
                </Label>
                <Input
                  id="tenure"
                  type="number"
                  value={form.defaultTenure}
                  onChange={(e) => setForm({ ...form, defaultTenure: Number(e.target.value) })}
                  className="text-xs h-9 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lateFee" className="text-xs">Late Fee / Day (₹)</Label>
                <Input
                  id="lateFee"
                  type="number"
                  value={form.lateFeePerDay}
                  onChange={(e) => setForm({ ...form, lateFeePerDay: Number(e.target.value) })}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipt Setup */}
        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 md:p-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Receipt Format
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Customize receipt serial number prefix and footer note
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="prefix" className="text-xs">Receipt Number Prefix</Label>
              <Input
                id="prefix"
                value={form.receiptPrefix}
                onChange={(e) => setForm({ ...form, receiptPrefix: e.target.value })}
                className="text-xs h-9 font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="footer" className="text-xs">Receipt Footer Disclaimer</Label>
              <Input
                id="footer"
                value={form.receiptFooter}
                onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                className="text-xs h-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="shadow-xs border-border">
          <CardHeader className="p-4 md:p-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" />
              Notification & Dispatch Alerts
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Automated communications sent to borrowers upon repayment and overdue triggers
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60">
              <div>
                <p className="font-semibold text-foreground">SMS Repayment Alerts</p>
                <p className="text-[11px] text-muted-foreground">Send real-time SMS receipts when EMI is collected</p>
              </div>
              <Switch
                checked={notifications.smsAlerts}
                onCheckedChange={(v) => setNotifications((n) => ({ ...n, smsAlerts: v }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60">
              <div>
                <p className="font-semibold text-foreground">WhatsApp Payment Confirmations</p>
                <p className="text-[11px] text-muted-foreground">Auto-generate WhatsApp e-receipt share links</p>
              </div>
              <Switch
                checked={notifications.whatsappReceipts}
                onCheckedChange={(v) => setNotifications((n) => ({ ...n, whatsappReceipts: v }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/60">
              <div>
                <p className="font-semibold text-foreground">Daily Closing Email Summary</p>
                <p className="text-[11px] text-muted-foreground">Send manager reconciliation report at 8:00 PM</p>
              </div>
              <Switch
                checked={notifications.dailyClosingEmail}
                onCheckedChange={(v) => setNotifications((n) => ({ ...n, dailyClosingEmail: v }))}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" size="sm" className="text-xs cursor-pointer h-9 px-4">
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save All Settings
          </Button>
        </div>
      </form>

      {/* Backup & Data Management */}
      <Card className="shadow-xs border-border mt-8">
        <CardHeader className="p-4 md:p-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Data Archival & Backup
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Download an offline JSON snapshot of all customer profiles, loan ledgers, and transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 text-xs space-y-3">
          <p className="text-muted-foreground">
            Export creates a portable, self-contained JSON file containing {store.customers.length} customer records, {store.loans.length} loans, {store.emis.length} EMIs, and {store.payments.length} receipt transactions.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportBackup}
              className="text-xs cursor-pointer h-9"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export Full Database (JSON)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
