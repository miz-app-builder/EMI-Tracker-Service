import { useState } from "react";
import { useLocation } from "wouter";
import { CreditCard, Calendar, TrendingDown, ShoppingBag, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { saveToken } from "@/lib/token";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const features = [
  { icon: CreditCard, title: "Track Installments", desc: "View payment history and remaining balance for every EMI at a glance." },
  { icon: Calendar, title: "Never Miss a Due Date", desc: "Your next installment date is always front and center — no more forgetting." },
  { icon: TrendingDown, title: "Auto Calculation", desc: "Overpayments automatically adjust the next installment amount." },
  { icon: ShoppingBag, title: "Per-Shop Tracking", desc: "Keep separate records for each shop — all in one place." },
  { icon: BarChart3, title: "Dashboard Summary", desc: "Total outstanding, this month's installments, overdue — all at a glance." },
];

type Tab = "login" | "signup";

function AuthForm({
  tab, setTab,
  loginForm, setLoginForm, loginError, loginLoading, handleLogin,
  signupForm, setSignupForm, signupError, signupLoading, handleSignup,
  idPrefix,
}: {
  tab: Tab; setTab: (t: Tab) => void;
  loginForm: { email: string; password: string };
  setLoginForm: React.Dispatch<React.SetStateAction<{ email: string; password: string }>>;
  loginError: string; loginLoading: boolean;
  handleLogin: (e: React.FormEvent) => void;
  signupForm: { name: string; email: string; phone: string; address: string; password: string; confirmPassword: string };
  setSignupForm: React.Dispatch<React.SetStateAction<{ name: string; email: string; phone: string; address: string; password: string; confirmPassword: string }>>;
  signupError: string; signupLoading: boolean;
  handleSignup: (e: React.FormEvent) => void;
  idPrefix: string;
}) {
  return (
    <>
      <div className="flex bg-muted rounded-xl p-1 mb-7">
        <button
          type="button"
          onClick={() => setTab("login")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === "login" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setTab("signup")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === "signup" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Sign Up
        </button>
      </div>

      {tab === "login" && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-xl font-bold text-foreground">Welcome back!</p>
            <p className="text-sm text-muted-foreground">Sign in to your account</p>
          </div>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-login-email`}>Email</Label>
              <Input id={`${idPrefix}-login-email`} type="email" placeholder="example@gmail.com"
                value={loginForm.email} onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-login-password`}>Password</Label>
              <Input id={`${idPrefix}-login-password`} type="password" placeholder="Your password"
                value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
          </div>
          {loginError && <p className="text-sm text-destructive">{loginError}</p>}
          <Button type="submit" className="w-full" disabled={loginLoading}>
            {loginLoading ? "Signing in..." : "Sign In"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <button type="button" onClick={() => setTab("signup")} className="text-primary font-medium hover:underline">Sign up</button>
          </p>
        </form>
      )}

      {tab === "signup" && (
        <form onSubmit={handleSignup} className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xl font-bold text-foreground">Create Account</p>
            <p className="text-sm text-muted-foreground">Join EMI Tracker</p>
          </div>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-su-name`}>Full Name <span className="text-destructive">*</span></Label>
              <Input id={`${idPrefix}-su-name`} placeholder="e.g. John Smith" value={signupForm.name}
                onChange={(e) => setSignupForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-su-email`}>Email <span className="text-destructive">*</span></Label>
              <Input id={`${idPrefix}-su-email`} type="email" placeholder="example@gmail.com" value={signupForm.email}
                onChange={(e) => setSignupForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-su-phone`}>Phone</Label>
                <Input id={`${idPrefix}-su-phone`} type="tel" placeholder="01XXXXXXXXX" value={signupForm.phone}
                  onChange={(e) => setSignupForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-su-address`}>Address</Label>
                <Input id={`${idPrefix}-su-address`} placeholder="City" value={signupForm.address}
                  onChange={(e) => setSignupForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-su-pass`}>Password <span className="text-destructive">*</span></Label>
              <Input id={`${idPrefix}-su-pass`} type="password" placeholder="At least 8 characters" value={signupForm.password}
                onChange={(e) => setSignupForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-su-confirm`}>Confirm Password <span className="text-destructive">*</span></Label>
              <Input id={`${idPrefix}-su-confirm`} type="password" placeholder="Re-enter password" value={signupForm.confirmPassword}
                onChange={(e) => setSignupForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
            </div>
          </div>
          {signupError && <p className="text-sm text-destructive">{signupError}</p>}
          <Button type="submit" className="w-full" disabled={signupLoading}>
            {signupLoading ? "Creating account..." : "Create Account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button type="button" onClick={() => setTab("login")} className="text-primary font-medium hover:underline">Sign in</button>
          </p>
        </form>
      )}
    </>
  );
}

export default function LandingPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [signupForm, setSignupForm] = useState({
    name: "", email: "", phone: "", address: "", password: "", confirmPassword: "",
  });
  const [signupError, setSignupError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    if (!loginForm.email.trim()) { setLoginError("Please enter your email"); return; }
    if (!loginForm.password) { setLoginError("Please enter your password"); return; }
    setLoginLoading(true);
    try {
      const res = await fetch(`${basePath}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password }),
      });
      if (!res.ok) {
        const d = await res.json();
        setLoginError(d.error === "Invalid credentials" ? "Incorrect email or password" : "Something went wrong");
        return;
      }
      const data = await res.json();
      if (data.token) saveToken(data.token);
      await refetch();
      setLocation("/dashboard");
    } catch {
      setLoginError("Something went wrong, please try again");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    if (!signupForm.name.trim()) { setSignupError("Please enter your full name"); return; }
    if (!signupForm.email.trim()) { setSignupError("Please enter your email"); return; }
    if (signupForm.password.length < 8) { setSignupError("Password must be at least 8 characters"); return; }
    if (signupForm.password !== signupForm.confirmPassword) { setSignupError("Passwords do not match"); return; }
    setSignupLoading(true);
    try {
      const res = await fetch(`${basePath}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: signupForm.email, password: signupForm.password,
          name: signupForm.name, phone: signupForm.phone || null, address: signupForm.address || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSignupError(d.error === "Email already registered" ? "An account with this email already exists" : d.error ?? "Something went wrong");
        return;
      }
      const data = await res.json();
      if (data.token) saveToken(data.token);
      await refetch();
      setLocation("/dashboard");
    } catch {
      setSignupError("Something went wrong, please try again");
    } finally {
      setSignupLoading(false);
    }
  }

  const formProps = {
    tab, setTab,
    loginForm, setLoginForm, loginError, loginLoading, handleLogin,
    signupForm, setSignupForm, signupError, signupLoading, handleSignup,
  };

  return (
    <div className="min-h-screen flex">

      {/* ───── LEFT PANEL — desktop only ───── */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-sidebar flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-sidebar-primary/20" />
        <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-sidebar-primary/15" />
        <div className="absolute top-1/2 right-0 w-32 h-64 rounded-l-full bg-sidebar-primary/10" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center text-white font-bold text-xl shadow-lg">৳</div>
          <span className="text-xl font-bold text-sidebar-foreground tracking-tight">EMI Tracker</span>
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl xl:text-4xl font-bold text-sidebar-foreground leading-snug">
              All your installments,<br />
              <span className="text-sidebar-primary">in one place</span>
            </h1>
            <p className="text-sidebar-foreground/70 text-base leading-relaxed max-w-sm">
              Track monthly installments, view outstanding balances, and stay on top of payments — all in one app.
            </p>
          </div>
          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-sidebar-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <f.icon className="h-4 w-4 text-sidebar-primary" />
                </div>
                <div>
                  <p className="text-sidebar-foreground font-medium text-sm">{f.title}</p>
                  <p className="text-sidebar-foreground/60 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-6 pt-2">
            {[
              { label: "Active Users", value: "100+" },
              { label: "EMIs Tracked", value: "500+" },
              { label: "Smart Savings", value: "100%" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-sidebar-primary font-bold text-lg">{s.value}</p>
                <p className="text-sidebar-foreground/50 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-sidebar-foreground/30 text-xs">© {new Date().getFullYear()} EMI Tracker</p>
        </div>
      </div>

      {/* ───── RIGHT PANEL — desktop auth ───── */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center px-6 py-10 bg-background min-h-screen">
        <div className="w-full max-w-sm">
          <AuthForm {...formProps} idPrefix="d" />
        </div>
      </div>

      {/* ───── MOBILE LAYOUT ───── */}
      <div className="md:hidden flex flex-col min-h-screen w-full">
        {/* Top hero panel */}
        <div className="relative bg-sidebar flex flex-col items-center justify-end px-6 pt-14 pb-10 overflow-hidden" style={{ minHeight: "40%" }}>
          <div className="absolute -top-16 -left-16 w-52 h-52 rounded-full bg-sidebar-primary/20" />
          <div className="absolute -top-8 right-4 w-32 h-32 rounded-full bg-sidebar-primary/15" />
          <div className="absolute bottom-0 -right-10 w-40 h-40 rounded-full bg-sidebar-primary/10" />

          <div className="relative z-10 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sidebar-primary flex items-center justify-center text-white font-bold text-2xl shadow-xl">৳</div>
            <div>
              <h1 className="text-2xl font-bold text-sidebar-foreground tracking-tight">EMI Tracker</h1>
              <p className="text-sidebar-foreground/60 text-sm mt-1">সব কিস্তি, এক জায়গায়</p>
            </div>
            <div className="flex gap-6 mt-3">
              {[{ label: "Active Users", value: "100+" }, { label: "EMIs Tracked", value: "500+" }].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-sidebar-primary font-bold text-base">{s.value}</p>
                  <p className="text-sidebar-foreground/50 text-[11px]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form card — rounded top sheet */}
        <div className="flex-1 bg-background rounded-t-3xl -mt-5 relative z-10 px-6 pt-7 pb-10 overflow-auto hide-scrollbar">
          <div className="w-full max-w-sm mx-auto">
            <AuthForm {...formProps} idPrefix="m" />
          </div>
        </div>
      </div>

    </div>
  );
}
