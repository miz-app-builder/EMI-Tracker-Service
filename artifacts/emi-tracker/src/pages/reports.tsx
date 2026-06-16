import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  useGetMonthlySpending, getGetMonthlySpendingQueryKey,
  useGetShopStats, getGetShopStatsQueryKey,
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { buildWorkbook, downloadWorkbook, downloadSheetAsExcel } from "@/lib/exportExcel";
import { Wallet, Activity, TrendingUp, BarChart2, Download, Table2, Printer, ChevronDown } from "lucide-react";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "#f59e0b",
  "#10b981",
  "#6366f1",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-semibold mb-1">{label}</p>
      <p className="text-primary font-bold">৳{Number(payload[0].value).toLocaleString("en-IN")}</p>
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-semibold">{payload[0].name}</p>
      <p className="font-bold" style={{ color: payload[0].payload.fill }}>
        {formatCurrency(payload[0].value)}
      </p>
    </div>
  );
}

function formatYAxis(value: number) {
  if (value >= 100000) return `৳${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `৳${(value / 1000).toFixed(0)}K`;
  return `৳${value}`;
}

export default function ReportsPage() {
  const { data: monthly, isLoading: loadingMonthly } = useGetMonthlySpending({
    query: { queryKey: getGetMonthlySpendingQueryKey() },
  });
  const { data: shopStats, isLoading: loadingShops } = useGetShopStats({
    query: { queryKey: getGetShopStatsQueryKey() },
  });
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  const pieData = (shopStats ?? [])
    .filter((s) => s.totalPaid > 0)
    .map((s, i) => ({
      name: s.shopName,
      value: s.totalPaid,
      fill: PIE_COLORS[i % PIE_COLORS.length],
    }));

  const maxPaid = Math.max(...(monthly ?? []).map((m) => m.totalPaid), 1);
  const reversedMonthly = [...(monthly ?? [])].reverse();

  function handleExportMonthlyExcel() {
    const date = new Date().toISOString().split("T")[0];
    const rows = (monthly ?? []).map((m) => ({
      Month: m.label,
      "Total Paid (৳)": m.totalPaid,
    }));
    downloadSheetAsExcel(rows, "Monthly Payments", `monthly_payments_${date}.xlsx`);
  }

  function handleExportShopExcel() {
    const date = new Date().toISOString().split("T")[0];
    const rows = (shopStats ?? []).map((s) => ({
      Shop: s.shopName,
      "Total Paid (৳)": s.totalPaid,
      "Total Outstanding (৳)": s.totalOutstanding,
      "Active Orders": s.activeOrders,
    }));
    downloadSheetAsExcel(rows, "Shop Breakdown", `shop_breakdown_${date}.xlsx`);
  }

  function handleExportFullExcel() {
    const date = new Date().toISOString().split("T")[0];
    const monthlyRows = (monthly ?? []).map((m) => ({
      Month: m.label,
      "Total Paid (৳)": m.totalPaid,
    }));
    const shopRows = (shopStats ?? []).map((s) => ({
      Shop: s.shopName,
      "Total Paid (৳)": s.totalPaid,
      "Total Outstanding (৳)": s.totalOutstanding,
      "Active Orders": s.activeOrders,
    }));
    const wb = buildWorkbook([
      { name: "Monthly Payments", rows: monthlyRows },
      { name: "Shop Breakdown", rows: shopRows },
    ]);
    downloadWorkbook(wb, `reports_${date}.xlsx`);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Summary Cards + Export button — same row */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 flex-1">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid (All Time)</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingSummary ? <Skeleton className="h-8 w-32" /> : (
                <div className="text-2xl font-bold text-primary">{formatCurrency(summary?.totalPaidAmount ?? 0)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Across all EMI orders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingSummary ? <Skeleton className="h-8 w-32" /> : (
                <div className="text-2xl font-bold">{formatCurrency(summary?.totalDueAmount ?? 0)}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Remaining to be paid</p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/10 col-span-2 sm:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active EMIs</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-bold text-primary">{summary?.totalActiveOrders ?? 0}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">of {summary?.totalOrders ?? 0} total orders</p>
            </CardContent>
          </Card>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="shrink-0 self-start sm:self-stretch sm:flex-col sm:h-auto sm:py-4 sm:px-3 gap-2">
              <Download className="h-4 w-4" />
              <span>Export</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleExportFullExcel}>
              <Table2 className="mr-2 h-4 w-4 text-green-600" />
              Full Report (.xlsx, 2 sheets)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportMonthlyExcel}>
              <Table2 className="mr-2 h-4 w-4 text-green-600" />
              Monthly Payments (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportShopExcel}>
              <Table2 className="mr-2 h-4 w-4 text-green-600" />
              Shop Breakdown (.xlsx)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4 text-muted-foreground" />
              Print / Save as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Monthly Payments</CardTitle>
            <CardDescription className="text-xs mt-0.5">Total EMI payments per month (last 12 months)</CardDescription>
          </div>
          <BarChart2 className="h-4 w-4 text-primary opacity-70" />
        </CardHeader>
        <CardContent>
          {loadingMonthly ? (
            <Skeleton className="h-[220px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={formatYAxis}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
                <Bar dataKey="totalPaid" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Pie + Table */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Payments by Shop</CardTitle>
            <CardDescription className="text-xs">Total amount paid per shop</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingShops ? (
              <Skeleton className="h-[220px] w-full" />
            ) : pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground gap-2">
                <p className="text-sm">No payment data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                  <Legend
                    formatter={(value, entry: any) => (
                      <span className="text-xs text-foreground">
                        {value} — {formatCurrency(entry.payload.value)}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Monthly Breakdown</CardTitle>
            <CardDescription className="text-xs">Payment history — most recent first</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMonthly ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {reversedMonthly.map((row) => {
                  const pct = maxPaid > 0 ? (row.totalPaid / maxPaid) * 100 : 0;
                  const isTop = row.totalPaid === maxPaid && row.totalPaid > 0;
                  return (
                    <div key={row.month} className={`rounded-md px-3 py-2 ${isTop ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/40"}`}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className={`font-medium ${isTop ? "text-primary" : "text-foreground"}`}>{row.label}</span>
                        <span className={`font-semibold ${row.totalPaid === 0 ? "text-muted-foreground" : isTop ? "text-primary" : ""}`}>
                          {row.totalPaid === 0 ? "—" : formatCurrency(row.totalPaid)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isTop ? "bg-primary" : "bg-primary/40"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
