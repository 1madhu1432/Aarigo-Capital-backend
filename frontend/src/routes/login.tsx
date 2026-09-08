import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";
import { useStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandBanner } from "@/components/ui/brand-logo";

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
    try {
      const ok = await login(email.trim(), password);
      setLoading(false);

      if (ok) {
        void navigate({ to: "/" });
      } else {
        setError("Invalid credentials. Please check your email/mobile and password.");
      }
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Login failed");
    }
  };

  const handleFillDemo = () => {
    setEmail("admin@aarigocapital.com");
    setPassword("123456");
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <BrandBanner className="max-w-[280px] mx-auto" />
        </div>

        <Card className="shadow-xs border-border">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold">Sign In to Operations Portal</CardTitle>
            <CardDescription className="text-xs">Enter your administrative credentials to continue</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="login-email" className="text-xs font-medium">Email / Staff ID</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@aarigocapital.com"
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
                    Remember session
                  </Label>
                </div>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-xs text-primary font-medium hover:underline cursor-pointer"
                >
                  Quick Fill Demo
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
                {loading ? "Verifying..." : "Sign In to Aarigo Capital"}
              </Button>
            </form>

            <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
              <div>
                <span className="font-semibold text-foreground">Demo: </span>
                <code className="font-mono text-foreground">admin@aarigocapital.com</code> / <code className="font-mono text-foreground">123456</code>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-[10px] text-primary font-semibold hover:underline cursor-pointer"
              >
                Auto-fill
              </button>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground">
          Aarigo Capital — Secure local session. No data leaves your device.
        </p>
      </div>
    </div>
  );
}
