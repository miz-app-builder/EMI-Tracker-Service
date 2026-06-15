import { useState } from "react";
import {
  useListEmiOrders, getListEmiOrdersQueryKey,
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Wallet, Calendar, TrendingDown, ArrowRight, ExternalLink, CheckCircle2,
} from "lucide-react";

type SortMode = "most-remaining" | "finishing-soon" | "most-paid";

function getPayoffDate(purchaseDate: string, emiMonths: number): Date {
  const d = new Date(purchaseDate);
  d.setMonth(d.getMonth() + emiMonths);
  return d;
}

function getMonthsLeft(purchaseDate: string, emiMonths: number, installmentsPaid: number) {
  return Math.max(0, emiMonths - installmentsPaid);
}

function progressPct(installmentsPaid: number, emiMonths: number) {
  if (emiMonths === 0) return 100;
  return Math.min(100, Math.round((installmentsPaid / emiMonths) * 100));
}

export default function DebtOverviewPage() {
  const [sort, setSort] = useState<SortMode>("most-remaining");

  const { data: orders, isLoading } = useListEmiOrders(
    { status: "active" },
    { query: { queryKey: [...getListEmiOrdersQueryKey({ status: "active" })] } }
  );
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  const activeOrders = orders ?? [];

  const totalMonthly = activeOrders.reduce((sum, o) => sum + (o.nextMonthlyAmount ?? o.monthlyAmount), 0);

  const sorted = [...activeOrders].sort((a, b) => {
    if (sort === "most-remaining") return (b.remainingAmount ?? 0) - (a.remainingAmount ?? 0);
    if (sort === "finishing-soon") {
      const aLeft = getMonthsLeft(a.purchaseDate, a.emiMonths, a.installmentsPaid ?? 0);
      const bLeft = getMonthsLeft(b.purchaseDate, b.emiMonths, b.installmentsPaid ?? 0);
      return aLeft - bLeft;
    }
    return (b.totalPaid ?? 0) - (a.totalPaid ?? 0);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Total Debt Overview</h2>
        <p className="text-muted-foreground mt-1">All your active EMIs in one place — see what's left and when you'll be free.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Owed</CardTitle>
            <Wallet className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold text-destructive">{formatCurrency(summary?.totalDueAmount ?? 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Remaining across all active EMIs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Commitment</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-28" /> : (
              <div className="text-2xl font-bold">{formatCurrency(totalMonthly)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total due every month</p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <TrendingDown className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold text-primary">{formatCurrency(summary?.totalPaidAmount ?? 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Paid so far (all time)</p>
          </CardContent>
        </Card>
      </div>

      {/* Sort Controls */}
      {activeOrders.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          {(["most-remaining", "finishing-soon", "most-paid"] as SortMode[]).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={sort === mode ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setSort(mode)}
            >
              {mode === "most-remaining" && "Most Remaining"}
              {mode === "finishing-soon" && "Finishing Soonest"}
              {mode === "most-paid" && "Most Paid"}
            </Button>
          ))}
        </div>
      )}

      {/* EMI Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full" />)}
        </div>
      ) : activeOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 text-green-500 opacity-60" />
            <p className="text-lg font-semibold">No active EMIs!</p>
            <p className="text-sm">You have no ongoing installments. Great job!</p>
            <Link href="/emi-orders/new">
              <Button className="mt-2" size="sm">Add an EMI Order</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((order) => {
            const pct = progressPct(order.installmentsPaid ?? 0, order.emiMonths);
            const monthsLeft = getMonthsLeft(order.purchaseDate, order.emiMonths, order.installmentsPaid ?? 0);
            const payoffDate = getPayoffDate(order.purchaseDate, order.emiMonths);
            const isAlmostDone = pct >= 75;
            const isNew = pct < 25;

            return (
              <Card key={order.id} className={`transition-colors ${isAlmostDone ? "border-green-500/30 bg-green-500/5" : ""}`}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base truncate">{order.productName}</h3>
                        {isAlmostDone && (
                          <Badge variant="outline" className="border-green-500 text-green-600 text-xs shrink-0">Almost done!</Badge>
                        )}
                        {isNew && (
                          <Badge variant="outline" className="text-xs shrink-0">Just started</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{order.shopName}</p>
                    </div>
                    <Link href={`/emi-orders/${order.id}`}>
                      <Button size="sm" variant="ghost" className="shrink-0 gap-1 text-muted-foreground hover:text-foreground h-8">
                        Details
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                      <span>{order.installmentsPaid ?? 0} of {order.emiMonths} installments paid</span>
                      <span className={`font-semibold ${isAlmostDone ? "text-green-600" : "text-foreground"}`}>{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isAlmostDone ? "bg-green-500" : "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="bg-muted/40 rounded-lg px-3 py-2">
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="text-sm font-bold text-destructive">{formatCurrency(order.remainingAmount ?? 0)}</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg px-3 py-2">
                      <p className="text-xs text-muted-foreground">Monthly</p>
                      <p className="text-sm font-bold">{formatCurrency(order.nextMonthlyAmount ?? order.monthlyAmount)}</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg px-3 py-2">
                      <p className="text-xs text-muted-foreground">Months Left</p>
                      <p className="text-sm font-bold">{monthsLeft} month{monthsLeft !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="bg-muted/40 rounded-lg px-3 py-2">
                      <p className="text-xs text-muted-foreground">Payoff Date</p>
                      <p className="text-sm font-bold">{formatDate(payoffDate.toISOString().split("T")[0])}</p>
                    </div>
                  </div>

                  {order.nextDueDate && (
                    <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                      <ArrowRight className="h-3 w-3" />
                      <span>Next installment: <span className="font-medium text-foreground">{formatDate(order.nextDueDate)} — {formatCurrency(order.nextMonthlyAmount ?? order.monthlyAmount)}</span></span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
