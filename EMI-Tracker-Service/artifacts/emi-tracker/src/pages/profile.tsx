import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Camera, Save, KeyRound, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function photoUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return `${basePath}/api/users/me/photo`;
}

export default function ProfilePage() {
  const { user, refetch } = useAuth();

  const initials = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U";
  const photo = photoUrl(user?.profilePhotoUrl);

  // ── Info form ──
  const [infoForm, setInfoForm] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    address: user?.address ?? "",
  });
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoSuccess, setInfoSuccess] = useState(false);
  const [infoError, setInfoError] = useState("");

  async function handleInfoSave(e: React.FormEvent) {
    e.preventDefault();
    setInfoError("");
    setInfoSuccess(false);
    setInfoLoading(true);
    try {
      const res = await fetch(`${basePath}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: infoForm.name || null,
          phone: infoForm.phone || null,
          address: infoForm.address || null,
        }),
      });
      if (!res.ok) { setInfoError("সমস্যা হয়েছে, আবার চেষ্টা করুন"); return; }
      await refetch();
      setInfoSuccess(true);
      setTimeout(() => setInfoSuccess(false), 3000);
    } catch {
      setInfoError("সমস্যা হয়েছে, আবার চেষ্টা করুন");
    } finally {
      setInfoLoading(false);
    }
  }

  // ── Password form ──
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState("");

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    if (!pwForm.current) { setPwError("বর্তমান পাসওয়ার্ড লিখুন"); return; }
    if (pwForm.next.length < 8) { setPwError("নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষর হতে হবে"); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("নতুন পাসওয়ার্ড দুটি মিলছে না"); return; }
    setPwLoading(true);
    try {
      const res = await fetch(`${basePath}/api/users/me/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      if (!res.ok) {
        const d = await res.json();
        setPwError(
          d.error === "Current password is incorrect"
            ? "বর্তমান পাসওয়ার্ড ভুল"
            : "সমস্যা হয়েছে, আবার চেষ্টা করুন"
        );
        return;
      }
      await refetch();
      setPwSuccess(true);
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwSuccess(false), 3000);
    } catch {
      setPwError("সমস্যা হয়েছে, আবার চেষ্টা করুন");
    } finally {
      setPwLoading(false);
    }
  }

  // ── Photo upload ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoError("শুধুমাত্র ছবি আপলোড করুন"); return; }
    if (file.size > 5 * 1024 * 1024) { setPhotoError("ছবির আকার সর্বোচ্চ ৫MB"); return; }

    setPhotoError("");
    setPhotoLoading(true);
    try {
      const urlRes = await fetch(`${basePath}/api/users/me/photo/request-url`, {
        method: "POST",
        credentials: "include",
      });
      if (!urlRes.ok) throw new Error("URL generation failed");
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      const patchRes = await fetch(`${basePath}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ profilePhotoUrl: objectPath }),
      });
      if (!patchRes.ok) throw new Error("Save failed");

      await refetch();
    } catch {
      setPhotoError("ছবি আপলোড করতে সমস্যা হয়েছে, আবার চেষ্টা করুন");
    } finally {
      setPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">প্রোফাইল সেটিংস</h1>
        <p className="text-sm text-muted-foreground mt-1">আপনার অ্যাকাউন্টের তথ্য পরিবর্তন করুন</p>
      </div>

      {/* ── Photo card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">প্রোফাইল ছবি</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative">
            <Avatar className="h-20 w-20">
              {photo && <AvatarImage src={photo} alt={user?.name ?? "User"} />}
              <AvatarFallback className="bg-primary text-white text-2xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            {photoLoading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={photoLoading}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              ছবি পরিবর্তন করুন
            </Button>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP — সর্বোচ্চ ৫MB</p>
            {photoError && <p className="text-xs text-destructive">{photoError}</p>}
          </div>
        </CardContent>
      </Card>

      {/* ── Account info card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">অ্যাকাউন্টের তথ্য</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Read-only account metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-muted-foreground text-xs">ইমেইল</p>
              <p className="font-medium mt-0.5">{user?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">অ্যাকাউন্ট তৈরির তারিখ</p>
              <p className="font-medium mt-0.5">
                {user?.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy") : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">সর্বশেষ সক্রিয়</p>
              <p className="font-medium mt-0.5">
                {user?.lastActiveAt ? format(new Date(user.lastActiveAt), "dd MMM yyyy, hh:mm a") : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">পাসওয়ার্ড পরিবর্তন</p>
              <p className="font-medium mt-0.5">
                {user?.passwordChangedAt ? format(new Date(user.passwordChangedAt), "dd MMM yyyy") : "কখনো পরিবর্তন হয়নি"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Editable fields */}
          <form onSubmit={handleInfoSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">পূর্ণ নাম</Label>
              <Input
                id="p-name"
                placeholder="আপনার নাম"
                value={infoForm.name}
                onChange={(e) => setInfoForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-phone">ফোন নম্বর</Label>
                <Input
                  id="p-phone"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={infoForm.phone}
                  onChange={(e) => setInfoForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-address">ঠিকানা</Label>
                <Input
                  id="p-address"
                  placeholder="ঢাকা"
                  value={infoForm.address}
                  onChange={(e) => setInfoForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
            </div>

            {infoError && <p className="text-sm text-destructive">{infoError}</p>}
            {infoSuccess && (
              <p className="text-sm text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> তথ্য সংরক্ষিত হয়েছে
              </p>
            )}

            <Button type="submit" size="sm" disabled={infoLoading} className="gap-2">
              {infoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              সংরক্ষণ করুন
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Password card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">পাসওয়ার্ড পরিবর্তন</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pw-current">বর্তমান পাসওয়ার্ড</Label>
              <Input
                id="pw-current"
                type="password"
                placeholder="বর্তমান পাসওয়ার্ড"
                value={pwForm.current}
                onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pw-new">নতুন পাসওয়ার্ড</Label>
                <Input
                  id="pw-new"
                  type="password"
                  placeholder="কমপক্ষে ৮ অক্ষর"
                  value={pwForm.next}
                  onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-confirm">নিশ্চিত করুন</Label>
                <Input
                  id="pw-confirm"
                  type="password"
                  placeholder="পুনরায় লিখুন"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                />
              </div>
            </div>

            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
            {pwSuccess && (
              <p className="text-sm text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> পাসওয়ার্ড পরিবর্তন হয়েছে
              </p>
            )}

            <Button type="submit" size="sm" variant="outline" disabled={pwLoading} className="gap-2">
              {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              পাসওয়ার্ড পরিবর্তন করুন
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
