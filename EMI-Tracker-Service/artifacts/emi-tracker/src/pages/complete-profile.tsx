import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  onComplete?: () => void;
}

export default function CompleteProfile({ onComplete }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "নাম লিখুন", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${basePath}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "প্রোফাইল সম্পন্ন হয়েছে!" });
      onComplete?.();
    } catch {
      toast({ title: "সমস্যা হয়েছে, আবার চেষ্টা করুন", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-2xl mx-auto">
            ৳
          </div>
          <h1 className="text-2xl font-bold text-foreground">আপনার তথ্য দিন</h1>
          <p className="text-sm text-muted-foreground">
            একবারই লাগবে — পরে settings থেকে পরিবর্তন করা যাবে
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              পূর্ণ নাম <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="যেমন: রহিম উদ্দিন"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">ফোন নম্বর</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="যেমন: 01XXXXXXXXX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">ঠিকানা</Label>
            <Input
              id="address"
              placeholder="যেমন: ঢাকা, বাংলাদেশ"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "সংরক্ষণ হচ্ছে..." : "শুরু করুন →"}
          </Button>
        </form>
      </div>
    </div>
  );
}
