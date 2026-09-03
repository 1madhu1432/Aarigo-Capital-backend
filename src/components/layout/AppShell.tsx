import { useState, type ReactNode } from "react";
import { useStore } from "@/store/app-store";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { MobileBottomNav } from "./MobileBottomNav";
import { GlobalSearchDialog } from "./GlobalSearchDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleDollarSign, Lock, Mail, ShieldCheck } from "lucide-react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { loggedIn, login } = useStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Login form state for demo
  const [email, setEmail] = useState("admin@loanflow.demo");
  const [password, setPassword] = useState("123456");
  const [loginError, setLoginError] = useState("");

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const success = login(email, password);
    if (!success) {
      setLoginError("Invalid credentials. Use admin@loanflow.demo / 123456");
    }
  };

  // If logged out, render clean login card
  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <Card className="w-full max-w-md shadow-lg border-border">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md mb-1">
              <CircleDollarSign className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
              LoanFlow Hub
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Professional Loan, EMI & Door-to-Door Collection System
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLoginSubmit}>
            <CardContent className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {loginError}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-xs"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 border border-border/60 text-[11px] space-y-1 text-muted-foreground">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Demo Admin Credentials:
                </div>
                <div>Email: <code className="font-mono text-foreground">admin@loanflow.demo</code></div>
                <div>Password: <code className="font-mono text-foreground">123456</code></div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 pt-2">
              <Button type="submit" className="w-full text-xs font-semibold h-10 cursor-pointer">
                Sign In to LoanFlow Hub
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Collapsible Left Sidebar */}
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="hidden md:flex"
      />

      {/* Main Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <AppHeader
          onOpenSearch={() => setSearchOpen(true)}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 focus:outline-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (hidden on desktop) */}
      <MobileBottomNav />

      {/* Global Command Palette Search */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
