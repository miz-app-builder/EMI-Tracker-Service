import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Store, FileText, CreditCard, Package, ChevronDown, Table2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { buildWorkbook, downloadWorkbook, downloadSheetAsExcel } from "@/lib/exportExcel";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function toCSV(rows: Record<string, unknown>[], headers: string[]): string {
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type ExportData = {
  exportedAt: string;
  shops: Record<string, unknown>[];
  emiOrders: Record<string, unknown>[];
  payments: Record<string, unknown>[];
};

const SHOP_HEADERS = ["id", "name", "description", "createdAt"];
const ORDER_HEADERS = ["id", "productName", "shopName", "totalPrice", "discount", "downPayment", "emiMonths", "monthlyAmount", "dueDayOfMonth", "modelNumber", "warrantyInfo", "status", "purchaseDate"];
const PAYMENT_HEADERS = ["id", "emiOrderId", "amount", "paymentDate", "paymentMethod", "bankName", "accountNumber", "transactionId", "notes", "createdAt"];

export default function ExportPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ExportData | null>(null);

  async function fetchData() {
    if (data) return data;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/export`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch export data");
      const json: ExportData = await res.json();
      setData(json);
      return json;
    } catch {
      toast({ title: "Export failed", description: "Could not load data. Please try again.", variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadCSV(type: "shops" | "emiOrders" | "payments") {
    const d = await fetchData();
    if (!d) return;
    const date = new Date().toISOString().split("T")[0];
    if (type === "shops") {
      downloadCSV(toCSV(d.shops, SHOP_HEADERS), `shops_${date}.csv`);
    } else if (type === "emiOrders") {
      downloadCSV(toCSV(d.emiOrders, ORDER_HEADERS), `emi_orders_${date}.csv`);
    } else {
      downloadCSV(toCSV(d.payments, PAYMENT_HEADERS), `payments_${date}.csv`);
    }
    toast({ title: "Downloaded!", description: "CSV file saved." });
  }

  async function handleDownloadExcel(type: "shops" | "emiOrders" | "payments") {
    const d = await fetchData();
    if (!d) return;
    const date = new Date().toISOString().split("T")[0];
    if (type === "shops") {
      downloadSheetAsExcel(d.shops, "Shops", `shops_${date}.xlsx`);
    } else if (type === "emiOrders") {
      downloadSheetAsExcel(d.emiOrders, "EMI Orders", `emi_orders_${date}.xlsx`);
    } else {
      downloadSheetAsExcel(d.payments, "Payments", `payments_${date}.xlsx`);
    }
    toast({ title: "Downloaded!", description: "Excel file saved." });
  }

  async function handleDownloadAllCSV() {
    const d = await fetchData();
    if (!d) return;
    const date = new Date().toISOString().split("T")[0];
    downloadCSV(toCSV(d.shops, SHOP_HEADERS), `shops_${date}.csv`);
    await new Promise((r) => setTimeout(r, 300));
    downloadCSV(toCSV(d.emiOrders, ORDER_HEADERS), `emi_orders_${date}.csv`);
    await new Promise((r) => setTimeout(r, 300));
    downloadCSV(toCSV(d.payments, PAYMENT_HEADERS), `payments_${date}.csv`);
    toast({ title: "All files downloaded!", description: "3 CSV files saved to your device." });
  }

  async function handleDownloadAllExcel() {
    const d = await fetchData();
    if (!d) return;
    const date = new Date().toISOString().split("T")[0];
    const wb = buildWorkbook([
      { name: "Shops", rows: d.shops },
      { name: "EMI Orders", rows: d.emiOrders },
      { name: "Payments", rows: d.payments },
    ]);
    downloadWorkbook(wb, `emi_tracker_export_${date}.xlsx`);
    toast({ title: "Excel Downloaded!", description: "All 3 sheets saved in one .xlsx file." });
  }

  const cards = [
    {
      key: "shops" as const,
      title: "Shops",
      description: "All your shop / showroom records",
      icon: Store,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      columns: "id, name, description, createdAt",
    },
    {
      key: "emiOrders" as const,
      title: "EMI Orders",
      description: "All EMI orders with pricing & status",
      icon: FileText,
      color: "text-teal-600",
      bg: "bg-teal-50 dark:bg-teal-950/30",
      columns: "id, productName, shopName, totalPrice, discount, downPayment, emiMonths, monthlyAmount, status, purchaseDate …",
    },
    {
      key: "payments" as const,
      title: "Payments",
      description: "Full payment history for all orders",
      icon: CreditCard,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      columns: "id, emiOrderId, amount, paymentDate, paymentMethod, transactionId, notes …",
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            Export My Data
          </h2>
          <p className="text-muted-foreground mt-1">
            Download your data as CSV or Excel — open in Excel, Google Sheets, or any spreadsheet app.
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={loading} className="shrink-0">
              <Download className="mr-2 h-4 w-4" />
              {loading ? "Loading…" : "Download All"}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDownloadAllExcel}>
              <Table2 className="mr-2 h-4 w-4 text-green-600" />
              Excel — 1 file, 3 sheets (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDownloadAllCSV}>
              <Download className="mr-2 h-4 w-4 text-muted-foreground" />
              CSV — 3 separate files
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4">
        {cards.map((card) => (
          <Card key={card.key} className="overflow-hidden">
            <CardHeader className={`${card.bg} border-b`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                  <div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{card.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadExcel(card.key)}
                    disabled={loading}
                    className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/40"
                  >
                    <Table2 className="mr-1.5 h-3.5 w-3.5" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadCSV(card.key)}
                    disabled={loading}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3 pb-3">
              <p className="text-xs text-muted-foreground font-mono">{card.columns}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        CSV files are UTF-8 encoded with BOM — compatible with Excel, Google Sheets, and LibreOffice.
      </p>
    </div>
  );
}
