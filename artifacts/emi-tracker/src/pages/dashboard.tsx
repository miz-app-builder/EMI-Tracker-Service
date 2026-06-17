import { useState } from "react";
import {
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useGetDueThisMonth, getGetDueThisMonthQueryKey,
  useGetShopStats, getGetShopStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { Activity, Wallet, AlertCircle, Calendar, Clock, ArrowRight, CreditCard, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { QuickPayDialog } from "@/components/QuickPayDialog";
import { SpendingTrendChart } from "@/components/SpendingTrendChart";

function getDaysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: dueThisMonth, isLoading: loadingDue } = useGetDueThisMonth({ query: { queryKey: getGetDueThisMonthQueryKey() } });
  const { data: shopStats, isLoading: loadingStats } = useGetShopStats({ query: { queryKey: getGetShopStatsQueryKey() } });
  const [quickPayOrder, setQuickPayOrder] = useState<{ id: number; productName: string; shopName: string; amount: number } | null>(null);

  const nextPayDays = getDaysUntil(summary?.nextPaymentDate);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Next payment alert */}
      {!loadingSummary && summary?.nextPaymentDate && (
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${
          nextPayDays !== null && nextPayDays < 0
            ? "bg-destructive/10 border-destructive/30 text-destructive"
            : nextPayDays !== null && nextPayDays <= 7
            ? "bg-orange-500/10 border-orange-400/30 text-orange-700"
            : "bg-primary/5 border-primary/20 text-primary"
        }`}>
          <Clock className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">
              {nextPayDays !== null && nextPayDays < 0
                ? "Installment is overdue!"
                : nextPayDays === 0
                ? "Payment due today!"
                : `Next payment: ${formatDate(summary.nextPaymentDate)}`}
            </p>
            <p className="text-sm opacity-80">
              {nextPayDays !== null && nextPayDays < 0
                ? `Due date was ${Math.abs(nextPayDays)} day(s) ago`
                : nextPayDays !== null && nextPayDays <= 7
                ? `Only ${nextPayDays} day(s) left — pay now`
                : nextPayDays !== null
                ? `${nextPayDays} day(s) remaining`
                : ""}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active EMIs</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold text-primary">{summary?.totalActiveOrders || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">out of {summary?.totalOrders || 0} total EMIs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{formatCurrency(summary?.totalDueAmount || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total paid: {formatCurrency(summary?.totalPaidAmount || 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{formatCurrency(summary?.thisMonthCollected || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">This month's payments</p>
          </CardContent>
        </Card>

        <Link href="/overdue">
          <Card className={`cursor-pointer transition-colors hover:border-destructive/50 ${summary?.overdueOrders ? "border-destructive/30 bg-destructive/5" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className={`h-4 w-4 ${summary?.overdueOrders ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
                <div className={`text-2xl font-bold ${summary?.overdueOrders ? "text-destructive" : ""}`}>
                  {summary?.overdueOrders || 0}
                </div>
              )}
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">
                  {summary?.overdueOrders ? "Needs attention!" : "All up to date"}
                </p>
                {summary?.overdueOrders ? (
                  <span className="text-xs text-destructive flex items-center gap-0.5 font-medium">
                    View all <ArrowRight className="h-3 w-3" />
                  </span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <SpendingTrendChart />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Due This Month</CardTitle>
            <CardDescription>EMI payments pending in the current month.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDue ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : dueThisMonth && dueThisMonth.length > 0 ? (
              <div className="space-y-3">
                {dueThisMonth.map((order) => {
                  const days = getDaysUntil(order.nextDueDate);
                  const isOverdue = days !== null && days < 0;
                  const isUrgent = days !== null && days >= 0 && days <= 7;
                  return (
                    <div
                      key={order.id}
                      className={`flex items-center justify-between p-4 border rounded-lg transition-colors mb-2 ${isOverdue ? "border-destructive/30 bg-destructive/[0.02]" : "hover:bg-muted/30"}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{order.productName}</p>
                        <p className="text-sm text-muted-foreground">{order.shopName}</p>
                        {order.nextDueDate && (
                          <p className={`text-xs mt-1 ${isOverdue ? "text-destructive" : isUrgent ? "text-orange-600" : "text-muted-foreground"}`}>
                            Due: {formatDate(order.nextDueDate)}
                            {isOverdue && ` (${Math.abs(days!)} day(s) ago)`}
                            {days === 0 && " (Today!)"}
                            {isUrgent && days! > 0 && ` (${days} day(s) left)`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <div className="text-right mr-2">
                          <p className={`font-bold ${isOverdue ? "text-destructive" : "text-primary"}`}>
                            {formatCurrency(order.monthlyAmount)}
                          </p>
                          <Badge
                            variant="outline"
                            className={`mt-1 text-xs ${isOverdue ? "border-destructive text-destructive" : isUrgent ? "border-orange-400 text-orange-600" : ""}`}
                          >
                            {isOverdue ? "Overdue" : "Due"}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant={isOverdue ? "destructive" : "default"}
                          className="gap-1.5"
                          onClick={() => setQuickPayOrder({
                            id: order.id,
                            productName: order.productName,
                            shopName: order.shopName,
                            amount: order.monthlyAmount,
                          })}
                        >
                          <CreditCard className="h-3.5 w-3.5" />
                          Pay
                        </Button>
                        <Link href={`/emi-orders/${order.id}`}>
                          <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No installments due this month.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>By Shop</CardTitle>
            <CardDescription>Outstanding and paid amounts per shop.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-4">
                {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : shopStats && shopStats.length > 0 ? (
              <div className="space-y-6">
                {shopStats.filter(s => s.totalOrders > 0).map((stat) => (
                  <div key={stat.shopId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stat.shopName}</span>
                      <span className="text-muted-foreground">{stat.totalOrders} EMI(s)</span>
                    </div>
                    <div className="flex h-4 overflow-hidden rounded-full bg-secondary">
                      {stat.totalPaid > 0 && stat.totalDue + stat.totalPaid > 0 && (
                        <div
                          className="bg-primary"
                          style={{ width: `${(stat.totalPaid / (stat.totalDue + stat.totalPaid)) * 100}%` }}
                        />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Paid: {formatCurrency(stat.totalPaid)}</span>
                      <span>Remaining: {formatCurrency(stat.totalDue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No shop data available.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {quickPayOrder && (
        <QuickPayDialog
          orderId={quickPayOrder.id}
          productName={quickPayOrder.productName}
          shopName={quickPayOrder.shopName}
          amountDue={quickPayOrder.amount}
          open={!!quickPayOrder}
          onOpenChange={(open) => { if (!open) setQuickPayOrder(null); }}
        />
      )}
    </div>
  );
}
