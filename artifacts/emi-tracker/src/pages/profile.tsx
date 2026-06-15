import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Camera, Save, KeyRound, CheckCircle2, Loader2, Download, Store, FileText, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function photoUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return `${basePath}/api/users/me/photo`;
}

function toCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function ProfilePage() {
  const { user, refetch } = useAuth();
  const { toast } = useToast();

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
      if (!res.ok) { setInfoError("Something went wrong, please try again"); return; }
      await refetch();
      setInfoSuccess(true);
      setTimeout(() => setInfoSuccess(false), 3000);
    } catch {
      setInfoError("Something went wrong, please try again");
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
    if (!pwForm.current) { setPwError("Please enter your current password"); return; }
    if (pwForm.next.length < 8) { setPwError("New password must be at least 8 characters"); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("New passwords do not match"); return; }
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
            ? "Current password is incorrect"
            : "Something went wrong, please try again"
        );
        return;
      }
      await refetch();
      setPwSuccess(true);
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwSuccess(false), 3000);
    } catch {
      setPwError("Something went wrong, please try again");
    } finally {
      setPwLoading(false);
    }
  }

  // ── Export ──
  const [exportLoading, setExportLoading] = useState(false);

  async function fetchExportData() {
    const res = await fetch(`${basePath}/api/export`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed");
    return res.json();
  }

  async function handleExport(type: "shops" | "emiOrders" | "payments" | "all") {
    setExportLoading(true);
    try {
      const d = await fetchExportData();
      const date = new Date().toISOString().split("T")[0];
      const dl = async (csv: string, name: string) => {
        downloadCSV(csv, name);
        await new Promise((r) => setTimeout(r, 300));
      };
      if (type === "shops" || type === "all")
        await dl(toCSV(d.shops, ["id", "name", "description", "createdAt"]), `shops_${date}.csv`);
      if (type === "emiOrders" || type === "all")
        await dl(toCSV(d.emiOrders, ["id", "productName", "shopName", "totalPrice", "discount", "downPayment", "emiMonths", "monthlyAmount", "dueDayOfMonth", "modelNumber", "status", "purchaseDate"]), `emi_orders_${date}.csv`);
      if (type === "payments" || type === "all")
        await dl(toCSV(d.payments, ["id", "emiOrderId", "amount", "paymentDate", "paymentMethod", "bankName", "accountNumber", "transactionId", "notes", "createdAt"]), `payments_${date}.csv`);
      toast({ title: type === "all" ? "All 3 files downloaded!" : "Downloaded!", description: "CSV file saved to your device." });
    } catch {
      toast({ title: "Export failed", description: "Could not load data. Please try again.", variant: "destructive" });
    } finally {
      setExportLoading(false);
    }
  }

  // ── Photo upload ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoError("Please upload an image file only"); return; }
    if (file.size > 5 * 1024 * 1024) { setPhotoError("Image size must be 5MB or less"); return; }

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
      setPhotoError("Failed to upload photo, please try again");
    } finally {
      setPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Update your account information</p>
      </div>

      {/* ── Photo card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Photo</CardTitle>
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
              Change Photo
            </Button>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP — max 5MB</p>
            {photoError && <p className="text-xs text-destructive">{photoError}</p>}
          </div>
        </CardContent>
      </Card>

      {/* ── Account info card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Read-only account metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-muted-foreground text-xs">Email</p>
              <p className="font-medium mt-0.5">{user?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Account Created</p>
              <p className="font-medium mt-0.5">
                {user?.createdAt ? format(new Date(user.createdAt), "dd MMM yyyy") : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Last Active</p>
              <p className="font-medium mt-0.5">
                {user?.lastActiveAt ? format(new Date(user.lastActiveAt), "dd MMM yyyy, hh:mm a") : "—"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Password Changed</p>
              <p className="font-medium mt-0.5">
                {user?.passwordChangedAt ? format(new Date(user.passwordChangedAt), "dd MMM yyyy") : "Never changed"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Editable fields */}
          <form onSubmit={handleInfoSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Full Name</Label>
              <Input
                id="p-name"
                placeholder="Your name"
                value={infoForm.name}
                onChange={(e) => setInfoForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-phone">Phone Number</Label>
                <Input
                  id="p-phone"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={infoForm.phone}
                  onChange={(e) => setInfoForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-address">Address</Label>
                <Input
                  id="p-address"
                  placeholder="City"
                  value={infoForm.address}
                  onChange={(e) => setInfoForm((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
            </div>

            {infoError && <p className="text-sm text-destructive">{infoError}</p>}
            {infoSuccess && (
              <p className="text-sm text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Information saved
              </p>
            )}

            <Button type="submit" size="sm" disabled={infoLoading} className="gap-2">
              {infoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Export card ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Export My Data</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Download your data as CSV — opens in Excel or Google Sheets</p>
            </div>
            <Button size="sm" onClick={() => handleExport("all")} disabled={exportLoading} className="gap-2 shrink-0">
              {exportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: "shops" as const, label: "Shops", icon: Store, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", desc: "id, name, description" },
              { key: "emiOrders" as const, label: "EMI Orders", icon: FileText, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30", desc: "product, price, status, date…" },
              { key: "payments" as const, label: "Payments", icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30", desc: "amount, date, method…" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => handleExport(item.key)}
                disabled={exportLoading}
                className={`flex items-center gap-3 p-3 rounded-lg border ${item.bg} hover:opacity-80 transition-opacity text-left disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <item.icon className={`h-5 w-5 shrink-0 ${item.color}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                </div>
                <Download className="h-3.5 w-3.5 ml-auto shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Password card ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pw-current">Current Password</Label>
              <Input
                id="pw-current"
                type="password"
                placeholder="Current password"
                value={pwForm.current}
                onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pw-new">New Password</Label>
                <Input
                  id="pw-new"
                  type="password"
                  placeholder="At least 8 characters"
                  value={pwForm.next}
                  onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw-confirm">Confirm</Label>
                <Input
                  id="pw-confirm"
                  type="password"
                  placeholder="Re-enter password"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                />
              </div>
            </div>

            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
            {pwSuccess && (
              <p className="text-sm text-green-600 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Password changed successfully
              </p>
            )}

            <Button type="submit" size="sm" variant="outline" disabled={pwLoading} className="gap-2">
              {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
