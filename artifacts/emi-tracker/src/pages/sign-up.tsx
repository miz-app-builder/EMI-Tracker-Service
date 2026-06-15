import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignUpPage() {
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    confirmPassword: "",
  });

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) { setError("পূর্ণ নাম লিখুন"); return; }
    if (!form.email.trim()) { setError("ইমেইল লিখুন"); return; }
    if (form.password.length < 8) { setError("পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে"); return; }
    if (form.password !== form.confirmPassword) { setError("পাসওয়ার্ড দুটি মিলছে না"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${basePath}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          phone: form.phone || null,
          address: form.address || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error === "Email already registered") {
          setError("এই ইমেইলে আগেই অ্যাকাউন্ট আছে");
        } else {
          setError(data.error ?? "সমস্যা হয়েছে, আবার চেষ্টা করুন");
        }
        return;
      }

      await refetch();
      setLocation("/dashboard");
    } catch {
      setError("সমস্যা হয়েছে, আবার চেষ্টা করুন");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-2xl mx-auto">
            ৳
          </div>
          <h1 className="text-2xl font-bold text-foreground">নতুন অ্যাকাউন্ট</h1>
          <p className="text-sm text-muted-foreground">EMI Tracker-এ যোগ দিন</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">পূর্ণ নাম <span className="text-destructive">*</span></Label>
            <Input id="name" placeholder="যেমন: রহিম উদ্দিন" value={form.name} onChange={field("name")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">ইমেইল <span className="text-destructive">*</span></Label>
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
            <Label htmlFor="password">পাসওয়ার্ড <span className="text-destructive">*</span></Label>
            <Input id="password" type="password" placeholder="কমপক্ষে ৮ অক্ষর" value={form.password} onChange={field("password")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">পাসওয়ার্ড নিশ্চিত করুন <span className="text-destructive">*</span></Label>
            <Input id="confirmPassword" type="password" placeholder="পুনরায় লিখুন" value={form.confirmPassword} onChange={field("confirmPassword")} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "তৈরি হচ্ছে..." : "অ্যাকাউন্ট তৈরি করুন"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            আগে থেকে অ্যাকাউন্ট আছে?{" "}
            <Link href="/sign-in" className="text-primary font-medium hover:underline">
              লগ ইন করুন
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
