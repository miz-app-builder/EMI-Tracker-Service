import { useState } from "react";
import { useLocation } from "wouter";
import { CreditCard, Calendar, TrendingDown, CheckCircle2, ShoppingBag, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const features = [
  {
    icon: CreditCard,
    title: "কিস্তি ট্র্যাক করুন",
    desc: "প্রতিটি EMI-এর payment history ও বাকি পরিমাণ এক নজরে দেখুন।",
  },
  {
    icon: Calendar,
    title: "Due Date মনে রাখুন",
    desc: "পরবর্তী কিস্তির তারিখ সবসময় সামনে থাকবে, কোনো ভুলের সুযোগ নেই।",
  },
  {
    icon: TrendingDown,
    title: "Auto Calculation",
    desc: "Overpayment হলে automatically পরবর্তী কিস্তি adjust হয়।",
  },
  {
    icon: ShoppingBag,
    title: "দোকান ভিত্তিক হিসাব",
    desc: "প্রতিটি দোকানের আলাদা হিসাব রাখুন, সব এক জায়গায়।",
  },
  {
    icon: BarChart3,
    title: "Dashboard Summary",
    desc: "মোট বাকি, এই মাসের কিস্তি, overdue — সব এক দৃষ্টিতে।",
  },
];

type Tab = "login" | "signup";

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
    if (!loginForm.email.trim()) { setLoginError("ইমেইল লিখুন"); return; }
    if (!loginForm.password) { setLoginError("পাসওয়ার্ড লিখুন"); return; }
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
        setLoginError(d.error === "Invalid credentials" ? "ইমেইল বা পাসওয়ার্ড ভুল" : "সমস্যা হয়েছে");
        return;
      }
      await refetch();
      setLocation("/dashboard");
    } catch {
      setLoginError("সমস্যা হয়েছে, আবার চেষ্টা করুন");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupError("");
    if (!signupForm.name.trim()) { setSignupError("পূর্ণ নাম লিখুন"); return; }
    if (!signupForm.email.trim()) { setSignupError("ইমেইল লিখুন"); return; }
    if (signupForm.password.length < 8) { setSignupError("পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে"); return; }
    if (signupForm.password !== signupForm.confirmPassword) { setSignupError("পাসওয়ার্ড দুটি মিলছে না"); return; }
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
        setSignupError(d.error === "Email already registered" ? "এই ইমেইলে আগেই অ্যাকাউন্ট আছে" : d.error ?? "সমস্যা হয়েছে");
        return;
      }
      await refetch();
      setLocation("/dashboard");
    } catch {
      setSignupError("সমস্যা হয়েছে, আবার চেষ্টা করুন");
    } finally {
      setSignupLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ───── LEFT PANEL — desktop only ───── */}
      <div className="hidden md:flex md:w-1/2 lg:w-3/5 bg-sidebar flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-sidebar-primary/20" />
        <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-sidebar-primary/15" />
        <div className="absolute top-1/2 right-0 w-32 h-64 rounded-l-full bg-sidebar-primary/10" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center text-white font-bold text-xl shadow-lg">৳</div>
          <span className="text-xl font-bold text-sidebar-foreground tracking-tight">EMI Tracker</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl xl:text-4xl font-bold text-sidebar-foreground leading-snug">
              আপনার সব কিস্তির হিসাব<br />
              <span className="text-sidebar-primary">এক জায়গায়</span>
            </h1>
            <p className="text-sidebar-foreground/70 text-base leading-relaxed max-w-sm">
              মাসিক কিস্তি ট্র্যাক করুন, বাকি পরিমাণ দেখুন এবং সময়মতো পরিশোধ করুন — সবকিছু এক অ্যাপে।
            </p>
          </div>

          {/* Feature list */}
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

          {/* Stats row */}
          <div className="flex gap-6 pt-2">
            {[
              { label: "সক্রিয় ব্যবহারকারী", value: "১০০+" },
              { label: "EMI ট্র্যাক হয়েছে", value: "৫০০+" },
              { label: "সাশ্রয়ী সিদ্ধান্ত", value: "১০০%" },
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

      {/* ───── RIGHT PANEL — auth ───── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-background min-h-screen">
        {/* Mobile-only logo */}
        <div className="md:hidden flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg">৳</div>
          <span className="text-lg font-bold text-foreground">EMI Tracker</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Tab switcher */}
          <div className="flex bg-muted rounded-xl p-1 mb-7">
            <button
              type="button"
              onClick={() => { setTab("login"); setLoginError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === "login"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              লগইন
            </button>
            <button
              type="button"
              onClick={() => { setTab("signup"); setSignupError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === "signup"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              নিবন্ধন
            </button>
          </div>

          {/* ── LOGIN FORM ── */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xl font-bold text-foreground">স্বাগতম!</p>
                <p className="text-sm text-muted-foreground">আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
              </div>

              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">ইমেইল</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="example@gmail.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password">পাসওয়ার্ড</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="আপনার পাসওয়ার্ড"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                  />
                </div>
              </div>

              {loginError && <p className="text-sm text-destructive">{loginError}</p>}

              <Button type="submit" className="w-full" disabled={loginLoading}>
                {loginLoading ? "লগইন হচ্ছে..." : "লগইন করুন"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                অ্যাকাউন্ট নেই?{" "}
                <button type="button" onClick={() => setTab("signup")} className="text-primary font-medium hover:underline">
                  নিবন্ধন করুন
                </button>
              </p>
            </form>
          )}

          {/* ── SIGNUP FORM ── */}
          {tab === "signup" && (
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="space-y-1.5">
                <p className="text-xl font-bold text-foreground">নতুন অ্যাকাউন্ট</p>
                <p className="text-sm text-muted-foreground">EMI Tracker-এ যোগ দিন</p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="su-name">পূর্ণ নাম <span className="text-destructive">*</span></Label>
                  <Input id="su-name" placeholder="যেমন: রহিম উদ্দিন" value={signupForm.name}
                    onChange={(e) => setSignupForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">ইমেইল <span className="text-destructive">*</span></Label>
                  <Input id="su-email" type="email" placeholder="example@gmail.com" value={signupForm.email}
                    onChange={(e) => setSignupForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="su-phone">ফোন</Label>
                    <Input id="su-phone" type="tel" placeholder="01XXXXXXXXX" value={signupForm.phone}
                      onChange={(e) => setSignupForm((p) => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-address">ঠিকানা</Label>
                    <Input id="su-address" placeholder="ঢাকা" value={signupForm.address}
                      onChange={(e) => setSignupForm((p) => ({ ...p, address: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-pass">পাসওয়ার্ড <span className="text-destructive">*</span></Label>
                  <Input id="su-pass" type="password" placeholder="কমপক্ষে ৮ অক্ষর" value={signupForm.password}
                    onChange={(e) => setSignupForm((p) => ({ ...p, password: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-confirm">পাসওয়ার্ড নিশ্চিত করুন <span className="text-destructive">*</span></Label>
                  <Input id="su-confirm" type="password" placeholder="পুনরায় লিখুন" value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm((p) => ({ ...p, confirmPassword: e.target.value }))} />
                </div>
              </div>

              {signupError && <p className="text-sm text-destructive">{signupError}</p>}

              <Button type="submit" className="w-full" disabled={signupLoading}>
                {signupLoading ? "তৈরি হচ্ছে..." : "অ্যাকাউন্ট তৈরি করুন"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                আগে থেকে অ্যাকাউন্ট আছে?{" "}
                <button type="button" onClick={() => setTab("login")} className="text-primary font-medium hover:underline">
                  লগইন করুন
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
