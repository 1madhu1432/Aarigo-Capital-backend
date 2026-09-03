import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Banknote, Lock, Mail, AlertCircle } from "lucide-react";
import { useStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) { setError("Email or mobile is required"); return; }
    if (!password) { setError("Password is required"); return; }

    setLoading(true);
    // Simulate slight delay for realism
    await new Promise((r) => setTimeout(r, 500));

    const ok = login(email.trim(), password);
    setLoading(false);

    if (ok) {
      void navigate({ to: "/" });
    } else {
      setError("Invalid credentials. Try admin@loanflow.demo / 123456");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground mx-auto shadow-sm">
            <Banknote className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">LoanFlow Hub</h1>
          <p className="text-xs text-muted-foreground">Loan & EMI Collection Management</p>
        </div>

        <Card className="shadow-sm border-border">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold">Sign In</CardTitle>
            <CardDescription className="text-xs">Enter your credentials to access the dashboard</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs font-medium">Email / Mobile</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@loanflow.demo"
                    className="pl-9 h-10 text-sm"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="text-xs font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="pl-9 pr-10 h-10 text-sm"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label htmlFor="remember-me" className="text-xs text-muted-foreground cursor-pointer">
                    Remember me
                  </Label>
                </div>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-10 text-sm font-semibold cursor-pointer"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border/60 text-[10px] text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Demo Credentials:</p>
              <p>Email: admin@loanflow.demo</p>
              <p>Password: 123456</p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground">
          LoanFlow Hub — Secure local session. No data leaves your device.
        </p>
      </div>
    </div>
  );
}
