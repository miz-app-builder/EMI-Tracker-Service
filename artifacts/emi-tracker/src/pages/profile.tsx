import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Camera, Save, KeyRound, CheckCircle2, Loader2, Download, Upload, Store, FileText, CreditCard, Shield, Clock, Trash2, Monitor, MapPin, LogOut, RefreshCw, AlertCircle, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { usePinLock } from "@/hooks/usePinLock";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  // ── Data Management tab ──
  const [dataTab, setDataTab] = useState<"export" | "import">("export");

  // ── Export ──
  const [exportLoading, setExportLoading] = useState(false);

  // ── Import ──
  type ImportMode = "all" | "shops" | "emiOrders" | "payments";
  const importFileRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<ImportMode>("all");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{ shops: number; emiOrders: number; payments: number } | null>(null);
  const [importError, setImportError] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ shops: number; emiOrders: number; payments: number } | null>(null);

  function openImportPicker(mode: ImportMode) {
    setImportMode(mode);
    setImportError("");
    setImportResult(null);
    setImportFile(null);
    setImportPreview(null);
    if (importFileRef.current) importFileRef.current.value = "";
    importFileRef.current?.click();
  }

  function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImportFile(file);
    setImportError("");
    setImportResult(null);
    setImportPreview(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        if (!json || typeof json !== "object") throw new Error();
        setImportPreview({
          shops: Array.isArray(json.shops) ? json.shops.length : 0,
          emiOrders: Array.isArray(json.emiOrders) ? json.emiOrders.length : 0,
          payments: Array.isArray(json.payments) ? json.payments.length : 0,
        });
      } catch {
        setImportError("Invalid file. Please upload a JSON file exported from EMI Tracker.");
        setImportFile(null);
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!importFile || !importPreview) return;
    setImportLoading(true);
    setImportError("");
    setImportResult(null);
    try {
      const text = await importFile.text();
      const json = JSON.parse(text);
      const res = await fetch(`${basePath}/api/import?mode=${importMode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(json),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Import failed");
      }
      const result = await res.json();
      setImportResult(result);
      setImportFile(null);
      setImportPreview(null);
      if (importFileRef.current) importFileRef.current.value = "";
      toast({ title: "Import successful!", description: `${result.shops} shops, ${result.emiOrders} orders, ${result.payments} payments imported.` });
    } catch (err: any) {
      setImportError(err.message ?? "Something went wrong");
    } finally {
      setImportLoading(false);
    }
  }

  function clearImport() {
    setImportFile(null);
    setImportPreview(null);
    setImportError("");
    setImportResult(null);
    if (importFileRef.current) importFileRef.current.value = "";
  }

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
    <div className="space-y-6">

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

      {/* ── Export / Import card ── */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Data Management</CardTitle>
          <div className="flex rounded-lg border border-border overflow-hidden w-fit mt-3">
            {(["export", "import"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDataTab(t)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition-colors ${
                  dataTab === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {t === "export" ? <Download className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                {t === "export" ? "Export" : "Import"}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {dataTab === "export" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Download your data as CSV — opens in Excel or Google Sheets</p>
                <Button size="sm" onClick={() => handleExport("all")} disabled={exportLoading} className="gap-2 shrink-0">
                  {exportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Download All
                </Button>
              </div>
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
            </div>
          )}

          {dataTab === "import" && (
            <div className="space-y-3">
              <input
                ref={importFileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={handleImportFileChange}
              />

              {/* Top row: description + Import All */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Select what to import from a previously exported JSON file</p>
                <Button size="sm" onClick={() => openImportPicker("all")} disabled={importLoading} className="gap-2 shrink-0">
                  {importLoading && importMode === "all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  Import All
                </Button>
              </div>

              {/* 3 cards — mirrors Export layout */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: "shops"     as const, label: "Shops",      icon: Store,      color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/30",   desc: "Restore all shops" },
                  { key: "emiOrders" as const, label: "EMI Orders", icon: FileText,   color: "text-teal-600",   bg: "bg-teal-50 dark:bg-teal-950/30",   desc: "Restore orders only" },
                  { key: "payments"  as const, label: "Payments",   icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30", desc: "Restore payments only" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => openImportPicker(item.key)}
                    disabled={importLoading}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${item.bg} hover:opacity-80 transition-opacity text-left disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <item.icon className={`h-5 w-5 shrink-0 ${item.color}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                    </div>
                    <Upload className="h-3.5 w-3.5 ml-auto shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>

              {/* File selected — inline preview */}
              {importFile && importPreview && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3 mt-1">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{importFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(importFile.size / 1024).toFixed(1)} KB · importing{" "}
                        <span className="font-medium text-foreground">
                          {importMode === "all" ? "everything" : importMode === "shops" ? "Shops" : importMode === "emiOrders" ? "EMI Orders" : "Payments"}
                        </span>
                      </p>
                    </div>
                    <button onClick={clearImport} className="text-muted-foreground hover:text-destructive transition-colors text-xs shrink-0">Remove</button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Shops",      count: importPreview.shops,     icon: Store,      color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" },
                      { label: "EMI Orders", count: importPreview.emiOrders, icon: Package,    color: "text-teal-600",   bg: "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800" },
                      { label: "Payments",   count: importPreview.payments,  icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800" },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-lg border p-2 text-center ${item.bg}`}>
                        <item.icon className={`h-4 w-4 mx-auto mb-1 ${item.color}`} />
                        <p className={`text-lg font-bold ${item.color}`}>{item.count}</p>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {importError && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                      <AlertCircle className="h-4 w-4 shrink-0" />{importError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleImport} disabled={importLoading} className="gap-2">
                      {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {importLoading ? "Importing…" : "Import Now"}
                    </Button>
                    <Button variant="outline" onClick={clearImport} disabled={importLoading}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Error with no file */}
              {importError && !importFile && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />{importError}
                </div>
              )}

              {/* Success */}
              {importResult && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3 mt-1">
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 dark:bg-green-950/30 rounded-lg p-3 border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    <span className="font-medium">Import complete!</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Shops",      count: importResult.shops,     icon: Store,      color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" },
                      { label: "EMI Orders", count: importResult.emiOrders, icon: Package,    color: "text-teal-600",   bg: "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800" },
                      { label: "Payments",   count: importResult.payments,  icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800" },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-lg border p-2 text-center ${item.bg}`}>
                        <item.icon className={`h-4 w-4 mx-auto mb-1 ${item.color}`} />
                        <p className={`text-lg font-bold ${item.color}`}>{item.count}</p>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setImportResult(null)} className="gap-2">
                    <Upload className="h-3.5 w-3.5" /> Import another file
                  </Button>
                </div>
              )}
            </div>
          )}
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

      <PinSettingsCard />
      <AutoLogoutCard />
      <SessionsCard />
    </div>
  );
}

function PinSettingsCard() {
  const { hasPin, setPin, removePin } = usePinLock();
  const [mode, setMode] = useState<"idle" | "set" | "change" | "remove">("idle");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function reset() { setMode("idle"); setStep("enter"); setPin1(""); setPin2(""); setError(""); }

  function handleSubmit() {
    if (mode === "remove") {
      const ok = removePin(pin1);
      if (!ok) { setError("Incorrect PIN"); return; }
      setSuccess("PIN removed successfully."); reset(); return;
    }
    if (step === "enter") {
      if (pin1.length !== 4 || !/^\d{4}$/.test(pin1)) { setError("Please enter a 4-digit number"); return; }
      setStep("confirm"); setPin2(""); setError(""); return;
    }
    if (pin1 !== pin2) { setError("PINs do not match"); setPin2(""); return; }
    setPin(pin1);
    setSuccess("PIN set successfully!");
    reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          PIN Lock
        </CardTitle>
        <CardDescription>
          Protect the app with a 4-digit PIN when opening.{" "}
          {hasPin ? <span className="text-green-600 font-medium">PIN is active ✓</span> : <span className="text-muted-foreground">No PIN set</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {success && <p className="text-sm text-green-600 flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />{success}</p>}

        {mode === "idle" ? (
          <div className="flex flex-wrap gap-2">
            {!hasPin && (
              <Button size="sm" variant="outline" className="gap-2" onClick={() => { setMode("set"); setSuccess(""); }}>
                <Shield className="h-4 w-4" /> Set PIN
              </Button>
            )}
            {hasPin && (
              <>
                <Button size="sm" variant="outline" className="gap-2" onClick={() => { setMode("change"); setSuccess(""); }}>
                  <KeyRound className="h-4 w-4" /> Change PIN
                </Button>
                <Button size="sm" variant="destructive" className="gap-2" onClick={() => { setMode("remove"); setSuccess(""); }}>
                  <Trash2 className="h-4 w-4" /> Remove PIN
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-w-xs">
            <Label>
              {mode === "remove"
                ? "Enter current PIN"
                : step === "enter"
                ? mode === "change" ? "Enter new PIN" : "Enter PIN (4 digits)"
                : "Confirm PIN"}
            </Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              placeholder="••••"
              value={mode === "remove" ? pin1 : step === "enter" ? pin1 : pin2}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                if (mode === "remove" || step === "enter") setPin1(v); else setPin2(v);
              }}
              className="tracking-widest text-center text-lg"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit}>
                {mode === "remove" ? "Remove" : step === "enter" ? "Next" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const AUTO_LOGOUT_OPTIONS = [
  { label: "Off (no auto logout)", value: "0" },
  { label: "5 minutes", value: "5" },
  { label: "10 minutes", value: "10" },
  { label: "15 minutes", value: "15" },
  { label: "30 minutes", value: "30" },
  { label: "1 hour", value: "60" },
];

function AutoLogoutCard() {
  const stored = parseInt(localStorage.getItem("emi_auto_logout_minutes") ?? "0", 10) || 0;
  const [minutes, setMinutes] = useState(String(stored));
  const [saved, setSaved] = useState(false);

  function save() {
    localStorage.setItem("emi_auto_logout_minutes", minutes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Auto Logout
        </CardTitle>
        <CardDescription>
          Automatically log out after a period of inactivity.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={minutes} onValueChange={setMinutes}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select a duration" />
            </SelectTrigger>
            <SelectContent>
              {AUTO_LOGOUT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={save} className="gap-2">
            {saved ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved!" : "Save"}
          </Button>
        </div>
        {minutes !== "0" && (
          <p className="text-xs text-muted-foreground">
            You will be automatically logged out after {minutes} minute{minutes !== "1" ? "s" : ""} of inactivity, with a 30-second warning beforehand.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

type SessionRow = {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

function parseUA(ua: string | null | undefined): string {
  if (!ua) return "Unknown device";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone / iPad";
  if (/Android/i.test(ua)) return "Android device";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/Linux/i.test(ua)) return "Linux PC";
  return ua.slice(0, 60);
}

function getBrowser(ua: string | null | undefined): string {
  if (!ua) return "";
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "Chrome";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Safari\//i.test(ua)) return "Safari";
  return "";
}

function SessionsCard() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  function load() {
    setLoading(true);
    fetch(`${basePath}/api/sessions`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setSessions(Array.isArray(d) ? d : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function revoke(sessionId: string) {
    setRevoking(sessionId);
    await fetch(`${basePath}/api/sessions/${sessionId}`, { method: "DELETE", credentials: "include" });
    setSessions((s) => s.filter((r) => r.id !== sessionId));
    setRevoking(null);
  }

  async function revokeOthers() {
    setRevokingAll(true);
    await fetch(`${basePath}/api/sessions`, { method: "DELETE", credentials: "include" });
    setSessions((s) => s.filter((r) => r.isCurrent));
    setRevokingAll(false);
  }

  const others = sessions.filter((s) => !s.isCurrent);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              Active Sessions
            </CardTitle>
            <CardDescription className="mt-1">
              All active login sessions on your account across devices. Revoke any session to sign it out.
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {others.length > 0 && (
              <Button size="sm" variant="destructive" className="gap-1.5 h-8" onClick={revokeOthers} disabled={revokingAll}>
                {revokingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                Sign out all others
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="px-6 pb-6 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">No active sessions found.</p>
        ) : (
          <div className="divide-y">
            {[...sessions].reverse().map((s) => {
              const device = parseUA(s.deviceInfo);
              const browser = getBrowser(s.deviceInfo);
              return (
                <div key={s.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Monitor className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{device}{browser ? ` · ${browser}` : ""}</span>
                      {s.isCurrent && (
                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {s.ipAddress && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />{s.ipAddress}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Last active: {format(new Date(s.lastUsedAt), "dd MMM yyyy, hh:mm a")}
                      </span>
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/30"
                      onClick={() => revoke(s.id)}
                      disabled={revoking === s.id}
                    >
                      {revoking === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Revoke
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
