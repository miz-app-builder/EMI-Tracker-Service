import { useState } from "react";
import { useSignUp } from "@clerk/react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

type Step = "form" | "verify";

export default function SignUpPage() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
    address: "",
  });

  // hold extra data across steps
  const [extra, setExtra] = useState<{ name: string; phone: string; address: string } | null>(null);

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");

    if (!form.name.trim()) { setError("পূর্ণ নাম লিখুন"); return; }
    if (!form.email.trim()) { setError("ইমেইল লিখুন"); return; }
    if (form.password.length < 8) { setError("পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে"); return; }
    if (form.password !== form.confirmPassword) { setError("পাসওয়ার্ড দুটি মিলছে না"); return; }

    setLoading(true);
    try {
      await signUp!.create({
        emailAddress: form.email,
        password: form.password,
        firstName: form.name,
      });

      setExtra({ name: form.name, phone: form.phone, address: form.address });

      if (signUp!.status === "complete") {
        await finishSignUp(signUp!.createdSessionId!, form.name, form.phone, form.address);
      } else {
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
        setStep("verify");
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      const msg = clerkErr?.errors?.[0]?.message ?? "সমস্যা হয়েছে, আবার চেষ্টা করুন";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    if (!code.trim()) { setError("কোডটি লিখুন"); return; }
    setLoading(true);
    try {
      const result = await signUp!.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await finishSignUp(result.createdSessionId!, extra?.name ?? "", extra?.phone ?? "", extra?.address ?? "");
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: { message: string }[] };
      const msg = clerkErr?.errors?.[0]?.message ?? "কোড সঠিক নয়";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function finishSignUp(sessionId: string, name: string, phone: string, address: string) {
    await setActive!({ session: sessionId });
    // Create user record then save extra profile data
    try {
      const email = form.email || signUp?.emailAddress || "";
      await fetch(`${basePath}/api/users/me`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, name }),
      });
      await fetch(`${basePath}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, phone, address }),
      });
    } catch {
      // non-fatal — UserSyncer will handle it
    }
    window.location.href = `${basePath}/dashboard`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
        {/* Logo */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-2xl mx-auto">
            ৳
          </div>
          <h1 className="text-2xl font-bold text-foreground">নতুন অ্যাকাউন্ট</h1>
          <p className="text-sm text-muted-foreground">EMI Tracker-এ যোগ দিন</p>
        </div>

        {step === "form" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                পূর্ণ নাম <span className="text-destructive">*</span>
              </Label>
              <Input id="name" placeholder="যেমন: রহিম উদ্দিন" value={form.name} onChange={field("name")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                ইমেইল <span className="text-destructive">*</span>
              </Label>
              <Input id="email" type="email" placeholder="example@gmail.com" value={form.email} onChange={field("email")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">ফোন নম্বর</Label>
              <Input id="phone" type="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={field("phone")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">ঠিকানা</Label>
              <Input id="address" placeholder="যেমন: ঢাকা, বাংলাদেশ" value={form.address} onChange={field("address")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                পাসওয়ার্ড <span className="text-destructive">*</span>
              </Label>
              <Input id="password" type="password" placeholder="কমপক্ষে ৮ অক্ষর" value={form.password} onChange={field("password")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                পাসওয়ার্ড নিশ্চিত করুন <span className="text-destructive">*</span>
              </Label>
              <Input id="confirmPassword" type="password" placeholder="পুনরায় লিখুন" value={form.confirmPassword} onChange={field("confirmPassword")} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading || !isLoaded}>
              {loading ? "তৈরি হচ্ছে..." : "অ্যাকাউন্ট তৈরি করুন"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              আগে থেকে অ্যাকাউন্ট আছে?{" "}
              <Link href="/sign-in" className="text-primary font-medium hover:underline">
                লগ ইন করুন
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{form.email}</span>-এ একটি ৬ সংখ্যার কোড পাঠানো হয়েছে
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">যাচাইকরণ কোড</Label>
              <Input
                id="code"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "যাচাই হচ্ছে..." : "যাচাই করুন"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => { setStep("form"); setError(""); }}
            >
              ← পেছনে যান
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
