import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { User, Shield, Mail, Phone, Save, LogOut } from "lucide-react";
import { useStore } from "@/store/app-store";
import { initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { admin, updateAdmin, logout } = useStore();

  const [form, setForm] = useState({
    name: admin.name,
    email: admin.email,
    mobile: admin.mobile,
    role: admin.role,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateAdmin(form);
    toast.success("Profile details updated successfully");
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
          Administrator Profile
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
          Manage your personal credentials, role permissions, and contact details
        </p>
      </div>

      <Card className="shadow-xs border-border">
        <CardHeader className="p-4 md:p-5 flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16 border border-border">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
              {initials(admin.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">{admin.name}</CardTitle>
              <Badge variant="default" className="text-[10px]">
                {admin.role}
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Super Admin & System Owner • Full Access
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSave}>
          <CardContent className="p-4 md:p-5 pt-0 space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="pl-9 text-xs h-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="pl-9 text-xs h-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mobile" className="text-xs">Mobile Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="mobile"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  className="pl-9 text-xs h-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-xs">Assigned Role</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="pl-9 text-xs h-9"
                  required
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-4 md:p-5 pt-0 flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={logout}
              className="text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Sign Out
            </Button>

            <Button type="submit" size="sm" className="text-xs cursor-pointer">
              <Save className="h-3.5 w-3.5 mr-1.5" />
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
