import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cross, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Greenacres Hospital Pharmacy" },
      { name: "description", content: "Secure login to the Greenacres Hospital Pharmacy Management System." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — you can sign in now.");
    setTab("signin");
  };

  const forgot = async () => {
    if (!email) return toast.error("Enter your email first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset link sent.");
  };

  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur">
            <Cross className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-semibold">Greenacres Hospital</div>
            <div className="text-xs opacity-80">Pharmacy Management System</div>
          </div>
        </div>

        <div className="max-w-md space-y-6">
          <h2 className="text-3xl font-semibold leading-tight">
            Care starts with the right medicine, at the right time.
          </h2>
          <p className="text-primary-foreground/85">
            A secure, hospital-grade platform to manage inventory, dispensing, prescriptions,
            invoicing, and reporting — all in one place.
          </p>
          <div className="grid gap-3 text-sm">
            {[
              "Real-time stock and expiry tracking",
              "Prescription workflow with medical aid support",
              "Role-based access for pharmacists, cashiers & managers",
              "Audit trail and reporting for compliance",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-primary-foreground/70">
          © {new Date().getFullYear()} Greenacres Hospital. All rights reserved.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Cross className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold">Greenacres Hospital</div>
              <div className="text-xs text-muted-foreground">Pharmacy Management</div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
            <h1 className="text-xl font-semibold text-foreground">Sign in to your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials to access the pharmacy dashboard.
            </p>

            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" type="email" autoComplete="email" required
                      value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@greenacres.co.za" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button type="button" onClick={forgot} className="text-xs font-medium text-secondary hover:underline">
                        Forgot password?
                      </button>
                    </div>
                    <Input id="password" type="password" autoComplete="current-password" required
                      value={password} onChange={(e) => setPassword(e.target.value)} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                    <Label htmlFor="remember" className="text-sm font-normal">Remember me on this device</Label>
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Secure sign in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Natalie Williams" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email2">Email address</Label>
                    <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@greenacres.co.za" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pw2">Password</Label>
                    <Input id="pw2" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Minimum 8 characters. Avoid common leaked passwords.</p>
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Protected access. All activity is logged for compliance.
          </p>
        </div>
      </main>
    </div>
  );
}
