import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { CreditCard, Calendar, TrendingDown, ShoppingBag, BarChart3, X, Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { saveToken } from "@/lib/token";
import { useBiometric, generateBiometricToken } from "@/hooks/useBiometric";

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
  compact = false,
  onBiometricLogin,
  bioEnabled = false,
  bioLoginLoading = false,
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
  compact?: boolean;
  onBiometricLogin?: () => void;
  bioEnabled?: boolean;
  bioLoginLoading?: boolean;
}) {
  const sp = compact ? "space-y-1" : "space-y-1.5";
  const fieldGap = compact ? "space-y-2" : "space-y-4";
  return (
    <>
      <div className={`flex bg-muted rounded-xl p-1 ${compact ? "mb-3" : "mb-7"}`}>
        <button type="button" onClick={() => setTab("login")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === "login" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          Login
        </button>
        <button type="button" onClick={() => setTab("signup")}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === "signup" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          Sign Up
        </button>
      </div>

      {tab === "login" && (
        <form onSubmit={handleLogin} className={compact ? "space-y-3" : "space-y-4"}>
          <div className={sp}>
            <p className={`font-bold text-foreground ${compact ? "text-lg" : "text-xl"}`}>Welcome back!</p>
            {!compact && <p className="text-sm text-muted-foreground">Sign in to your account</p>}
          </div>
          <div className={fieldGap}>
            <div className={sp}>
              <Label htmlFor={`${idPrefix}-login-email`} className={compact ? "text-xs" : ""}>Email</Label>
              <Input id={`${idPrefix}-login-email`} type="email" placeholder="example@gmail.com"
                className={compact ? "h-9 text-sm" : ""}
                value={loginForm.email} onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className={sp}>
              <Label htmlFor={`${idPrefix}-login-password`} className={compact ? "text-xs" : ""}>Password</Label>
              <Input id={`${idPrefix}-login-password`} type="password" placeholder="Your password"
                className={compact ? "h-9 text-sm" : ""}
                value={loginForm.password} onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
          </div>
          {loginError && <p className="text-xs text-destructive">{loginError}</p>}
          <div className="flex gap-2">
            <Button type="submit" className={`flex-1 ${compact ? "h-9 text-sm" : ""}`} disabled={loginLoading}>
              {loginLoading ? "Signing in..." : "Sign In"}
            </Button>
            {compact && bioEnabled && (
              <Button
                type="button"
                variant="outline"
                className="h-9 w-9 p-0 flex-shrink-0"
                onClick={onBiometricLogin}
                disabled={bioLoginLoading || loginLoading}
                title="Login with biometric"
              >
                {bioLoginLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Fingerprint className="h-4 w-4 text-primary" />}
              </Button>
            )}
          </div>
          <p className={`text-center text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
            Don't have an account?{" "}
            <button type="button" onClick={() => setTab("signup")} className="text-primary font-medium hover:underline">Sign up</button>
          </p>
        </form>
      )}

      {tab === "signup" && (
        <form onSubmit={handleSignup} className={compact ? "space-y-2" : "space-y-3"}>
          <div className={sp}>
            <p className={`font-bold text-foreground ${compact ? "text-base" : "text-xl"}`}>Create Account</p>
            {!compact && <p className="text-sm text-muted-foreground">Join EMI Tracker</p>}
          </div>
          <div className={compact ? "space-y-2" : "space-y-3"}>
            <div className={sp}>
              <Label htmlFor={`${idPrefix}-su-name`} className={compact ? "text-xs" : ""}>Full Name <span className="text-destructive">*</span></Label>
              <Input id={`${idPrefix}-su-name`} placeholder="e.g. John Smith" value={signupForm.name}
                className={compact ? "h-9 text-sm" : ""}
                onChange={(e) => setSignupForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className={sp}>
              <Label htmlFor={`${idPrefix}-su-email`} className={compact ? "text-xs" : ""}>Email <span className="text-destructive">*</span></Label>
              <Input id={`${idPrefix}-su-email`} type="email" placeholder="example@gmail.com" value={signupForm.email}
                className={compact ? "h-9 text-sm" : ""}
                onChange={(e) => setSignupForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className={`grid grid-cols-2 ${compact ? "gap-2" : "gap-3"}`}>
              <div className={sp}>
                <Label htmlFor={`${idPrefix}-su-phone`} className={compact ? "text-xs" : ""}>Phone</Label>
                <Input id={`${idPrefix}-su-phone`} type="tel" placeholder="01XXXXXXXXX" value={signupForm.phone}
                  className={compact ? "h-9 text-sm" : ""}
                  onChange={(e) => setSignupForm((p) => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className={sp}>
                <Label htmlFor={`${idPrefix}-su-address`} className={compact ? "text-xs" : ""}>Address</Label>
                <Input id={`${idPrefix}-su-address`} placeholder="City" value={signupForm.address}
                  className={compact ? "h-9 text-sm" : ""}
                  onChange={(e) => setSignupForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
            <div className={sp}>
              <Label htmlFor={`${idPrefix}-su-pass`} className={compact ? "text-xs" : ""}>Password <span className="text-destructive">*</span></Label>
              <Input id={`${idPrefix}-su-pass`} type="password" placeholder="At least 8 characters" value={signupForm.password}
                className={compact ? "h-9 text-sm" : ""}
                onChange={(e) => setSignupForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <div className={sp}>
              <Label htmlFor={`${idPrefix}-su-confirm`} className={compact ? "text-xs" : ""}>Confirm Password <span className="text-destructive">*</span></Label>
              <Input id={`${idPrefix}-su-confirm`} type="password" placeholder="Re-enter password" value={signupForm.confirmPassword}
                className={compact ? "h-9 text-sm" : ""}
                onChange={(e) => setSignupForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
            </div>
          </div>
          {signupError && <p className="text-xs text-destructive">{signupError}</p>}
          <Button type="submit" className={`w-full ${compact ? "h-9 text-sm" : ""}`} disabled={signupLoading}>
            {signupLoading ? "Creating account..." : "Create Account"}
          </Button>
          <p className={`text-center text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
            Already have an account?{" "}
            <button type="button" onClick={() => setTab("login")} className="text-primary font-medium hover:underline">Sign in</button>
          </p>
        </form>
      )}
    </>
  );
}

type Feature = typeof features[number];

export default function LandingPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();
  const { enabled: bioEnabled, authenticate: bioAuthenticate, getStoredToken } = useBiometric();
  const [bioLoginLoading, setBioLoginLoading] = useState(false);
  const [bioLoginError, setBioLoginError] = useState("");

  const lastEmail = localStorage.getItem("emi_last_email") ?? "";
  const pinActive = localStorage.getItem("emi_pin_login_active") === "true" && Boolean(lastEmail);
  const [overridePasswordMode, setOverridePasswordMode] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: pinActive ? lastEmail : "", password: "" });
  const pinMode = pinActive && loginForm.email === lastEmail && !overridePasswordMode;
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
      localStorage.setItem("emi_last_email", loginForm.email.toLowerCase());
      if (data.hasPinLogin) localStorage.setItem("emi_pin_login_active", "true");
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
      localStorage.setItem("emi_last_email", signupForm.email.toLowerCase());
      await refetch();
      setLocation("/dashboard");
    } catch {
      setSignupError("Something went wrong, please try again");
    } finally {
      setSignupLoading(false);
    }
  }

  // Lock body scroll on mobile so page can't scroll behind the fixed layout
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      document.documentElement.style.overflow = "";
    };
  }, []);

  function maskEmail(email: string): string {
    const [user, domain] = email.split("@");
    if (!domain) return email;
    return user.slice(0, 2) + "***@" + domain;
  }

  async function handlePinLogin(e: React.FormEvent) {
    e.preventDefault();
    setPinError("");
    if (pinInput.length !== 4) { setPinError("Please enter a 4-digit PIN"); return; }
    setPinLoading(true);
    try {
      const res = await fetch(`${basePath}/api/auth/pin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginForm.email, pin: pinInput }),
      });
      if (!res.ok) {
        setPinError("Incorrect PIN, please try again");
        setPinInput("");
        return;
      }
      const data = await res.json();
      if (data.token) saveToken(data.token);
      await refetch();
      setLocation("/dashboard");
    } catch {
      setPinError("Something went wrong, please try again");
      setPinInput("");
    } finally {
      setPinLoading(false);
    }
  }

  async function handleBiometricLogin() {
    setBioLoginError("");
    setBioLoginLoading(true);
    try {
      const ok = await bioAuthenticate();
      if (!ok) {
        setBioLoginError("Biometric authentication failed");
        return;
      }
      // Try server-side biometric token login first
      const storedToken = getStoredToken();
      const email = loginForm.email || localStorage.getItem("emi_last_email") || "";
      if (storedToken && email) {
        const res = await fetch(`${basePath}/api/auth/biometric-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, token: storedToken }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.token) saveToken(data.token);
          await refetch();
          setLocation("/dashboard");
          return;
        }
        setBioLoginError("Biometric login failed — please sign in with your password");
        return;
      }
      // Fallback: check if server session is still active
      const meRes = await fetch(`${basePath}/api/auth/me`, { credentials: "include" });
      if (meRes.ok) {
        await refetch();
        setLocation("/dashboard");
      } else {
        setBioLoginError("Session expired — please sign in with your password");
      }
    } catch {
      setBioLoginError("Something went wrong, please try again");
    } finally {
      setBioLoginLoading(false);
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

      {/* ───── FEATURE POPUP (mobile) ───── */}
      {selectedFeature && (
        <>
          <div className="md:hidden fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setSelectedFeature(null)}>
            <div className="w-full bg-card rounded-t-3xl p-6 pb-10" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                    <selectedFeature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">{selectedFeature.title}</h3>
                    <p className="text-[11px] text-primary font-medium">EMI Tracker</p>
                  </div>
                </div>
                <button onClick={() => setSelectedFeature(null)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedFeature.desc}</p>
              <div className="mt-5 w-12 h-1 bg-border rounded-full mx-auto" />
            </div>
          </div>
        </>
      )}

      {/* ───── MOBILE LAYOUT ───── */}
      <div className="md:hidden fixed inset-0 flex flex-col overflow-hidden z-10">

        {/* Hero panel */}
        <div
          className="relative bg-sidebar flex-shrink-0 flex flex-col justify-start px-6 overflow-hidden transition-all duration-500"
          style={{
            height: tab === "signup" ? "80px" : "36%",
            paddingTop: tab === "signup" ? "1rem" : "2.5rem",
            paddingBottom: tab === "signup" ? "0" : "1rem",
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-sidebar-primary/25" />
          <div className="absolute -top-6 right-0 w-40 h-40 rounded-full bg-sidebar-primary/15" />
          <div className="absolute top-1/2 -right-16 w-52 h-52 rounded-full bg-white/5" />
          <div className="absolute bottom-2 left-1/3 w-20 h-20 rounded-full bg-sidebar-primary/10" />

          <div className="relative z-10 w-full flex flex-col items-center text-center">
            {tab === "signup" ? (
              /* Signup: compact horizontal logo row */
              <div className="flex items-center gap-2 w-full">
                <div className="w-8 h-8 rounded-xl bg-sidebar-primary flex items-center justify-center text-white font-bold text-base shadow-lg">৳</div>
                <span className="text-base font-bold text-sidebar-foreground tracking-tight">EMI Tracker</span>
              </div>
            ) : (
              /* Login: centered stacked layout */
              <>
                <div className="w-12 h-12 rounded-2xl bg-sidebar-primary flex items-center justify-center text-white font-bold text-2xl shadow-xl mb-1.5">৳</div>
                <span className="text-base font-bold text-sidebar-foreground tracking-tight mb-2">EMI Tracker</span>
                <h1 className="font-extrabold text-sidebar-foreground leading-tight whitespace-nowrap" style={{ fontSize: "clamp(0.95rem, 5.2vw, 1.4rem)" }}>
                  All your installments, <span className="text-sidebar-primary">in one place</span>
                </h1>
                <p className="text-sidebar-foreground/55 text-[11px] mt-1.5 leading-snug max-w-[260px]">
                  Track installments, balances &amp; payments — all in one app.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Form card — fills remaining height, no scroll */}
        <div className="flex-1 bg-background rounded-t-3xl -mt-5 relative z-10 flex flex-col overflow-hidden">
          <div className="flex-1 flex flex-col px-6 pt-6 overflow-hidden" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}>
            <div className="w-full max-w-sm mx-auto flex flex-col flex-1 overflow-hidden">

              {tab === "login" && pinMode ? (
                /* ── PIN login — same visual layout as password login ── */
                <form onSubmit={handlePinLogin} className="space-y-3">
                  {/* Same tab bar */}
                  <div className="flex bg-muted rounded-xl p-1 mb-3">
                    <span className="flex-1 py-2 text-sm font-medium rounded-lg bg-white text-foreground shadow-sm text-center">Login</span>
                    <button
                      type="button"
                      onClick={() => { setOverridePasswordMode(true); setTab("signup"); setPinError(""); }}
                      className="flex-1 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:text-foreground transition-all"
                    >
                      Sign Up
                    </button>
                  </div>

                  {/* Same heading */}
                  <div className="space-y-1">
                    <p className="font-bold text-foreground text-lg">Welcome back!</p>
                    <p className="text-xs text-muted-foreground">Sign in with your PIN</p>
                  </div>

                  {/* Email + PIN fields */}
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor="m-pin-email" className="text-xs">Email</Label>
                      <Input
                        id="m-pin-email"
                        type="email"
                        className="h-9 text-sm"
                        value={loginForm.email}
                        onChange={(e) => { setLoginForm((p) => ({ ...p, email: e.target.value })); setPinError(""); }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="m-pin-field" className="text-xs">PIN</Label>
                      <Input
                        id="m-pin-field"
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="Your PIN"
                        className="h-9 text-sm"
                        value={pinInput}
                        onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4)); setPinError(""); }}
                        autoFocus
                      />
                    </div>
                  </div>

                  {(pinError || bioLoginError) && (
                    <p className="text-xs text-destructive">{pinError || bioLoginError}</p>
                  )}

                  {/* Sign In + Biometric inline — same as password login */}
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1 h-9 text-sm" disabled={pinLoading}>
                      {pinLoading ? "Signing in..." : "Sign In"}
                    </Button>
                    {bioEnabled && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 w-9 p-0 flex-shrink-0"
                        onClick={handleBiometricLogin}
                        disabled={bioLoginLoading || pinLoading}
                        title="Login with biometric"
                      >
                        {bioLoginLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4 text-primary" />}
                      </Button>
                    )}
                  </div>

                  {/* Use password instead — same style as "Don't have an account?" */}
                  <p className="text-center text-xs text-muted-foreground">
                    Use password instead?{" "}
                    <button
                      type="button"
                      onClick={() => { setOverridePasswordMode(true); setPinError(""); }}
                      className="text-primary font-medium hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              ) : (
                <>
                  <AuthForm
                    {...formProps}
                    idPrefix="m"
                    compact
                    onBiometricLogin={handleBiometricLogin}
                    bioEnabled={bioEnabled}
                    bioLoginLoading={bioLoginLoading}
                  />
                  {bioLoginError && tab === "login" && (
                    <p className="text-xs text-destructive -mt-1">{bioLoginError}</p>
                  )}
                </>
              )}

              {/* Features + Stats — show on login tab (both password and PIN mode) */}
              {tab === "login" && (
                <div className="mt-auto pt-3 space-y-3">
                  {/* Features row */}
                  <div className="flex gap-2 pt-3 border-t border-border">
                    {features.map((f) => (
                      <button
                        key={f.title}
                        onClick={() => setSelectedFeature(f)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/50 hover:bg-primary/10 active:scale-95 transition-all text-center flex-1 min-w-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                          <f.icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex justify-center gap-6 pt-3 border-t border-border">
                    {[
                      { label: "Active Users", value: "100+" },
                      { label: "EMIs Tracked", value: "500+" },
                      { label: "Smart Savings", value: "100%" },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <p className="text-primary font-bold text-xs">{s.value}</p>
                        <p className="text-muted-foreground text-[10px]">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-muted-foreground/40 text-[10px] text-center">© {new Date().getFullYear()} EMI Tracker</p>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
