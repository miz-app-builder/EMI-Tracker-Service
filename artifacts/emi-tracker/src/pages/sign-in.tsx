import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function SignInPage() {
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.email.trim()) { setError("ইমেইল লিখুন"); return; }
    if (!form.password) { setError("পাসওয়ার্ড লিখুন"); return; }

    setLoading(true);
    try {
      const res = await fetch(`${basePath}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(
          data.error === "Invalid credentials"
            ? "ইমেইল বা পাসওয়ার্ড ভুল"
            : "সমস্যা হয়েছে, আবার চেষ্টা করুন"
        );
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
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-2xl mx-auto">
            ৳
          </div>
          <h1 className="text-2xl font-bold text-foreground">লগইন করুন</h1>
          <p className="text-sm text-muted-foreground">আপনার অ্যাকাউন্টে প্রবেশ করুন</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">ইমেইল</Label>
            <Input id="email" type="email" placeholder="example@gmail.com" value={form.email} onChange={field("email")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">পাসওয়ার্ড</Label>
            <Input id="password" type="password" placeholder="আপনার পাসওয়ার্ড" value={form.password} onChange={field("password")} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "লগইন হচ্ছে..." : "লগইন করুন"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            অ্যাকাউন্ট নেই?{" "}
            <Link href="/sign-up" className="text-primary font-medium hover:underline">
              নিবন্ধন করুন
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
