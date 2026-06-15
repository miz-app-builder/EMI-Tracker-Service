import {
  useGetDashboardSummary, getGetDashboardSummaryQueryKey,
  useGetDueThisMonth, getGetDueThisMonthQueryKey,
  useGetShopStats, getGetShopStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { Activity, Wallet, AlertCircle, Calendar, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

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

  const nextPayDays = getDaysUntil(summary?.nextPaymentDate);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-1">আমার সকল EMI কিস্তির সারসংক্ষেপ।</p>
      </div>

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
                ? "কিস্তির তারিখ পার হয়ে গেছে!"
                : nextPayDays === 0
                ? "আজকে কিস্তির শেষ তারিখ!"
                : `পরবর্তী কিস্তি: ${formatDate(summary.nextPaymentDate)}`}
            </p>
            <p className="text-sm opacity-80">
              {nextPayDays !== null && nextPayDays < 0
                ? `${Math.abs(nextPayDays)} দিন আগে শেষ তারিখ ছিল`
                : nextPayDays !== null && nextPayDays <= 7
                ? `মাত্র ${nextPayDays} দিন বাকি — এখনই দিন`
                : nextPayDays !== null
                ? `${nextPayDays} দিন বাকি`
                : ""}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">চলমান EMI</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold text-primary">{summary?.totalActiveOrders || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">মোট {summary?.totalOrders || 0}টি EMI-এর মধ্যে</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">মোট বাকি আছে</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{formatCurrency(summary?.totalDueAmount || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">মোট পরিশোধ: {formatCurrency(summary?.totalPaidAmount || 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">এই মাসে দিয়েছি</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{formatCurrency(summary?.thisMonthCollected || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">এই মাসের পেমেন্ট</p>
          </CardContent>
        </Card>

        <Card className={summary?.overdueOrders ? "border-destructive/30 bg-destructive/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">মেয়াদ পেরিয়ে গেছে</CardTitle>
            <AlertCircle className={`h-4 w-4 ${summary?.overdueOrders ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
              <div className={`text-2xl font-bold ${summary?.overdueOrders ? "text-destructive" : ""}`}>
                {summary?.overdueOrders || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.overdueOrders ? "মনোযোগ দরকার!" : "সব ঠিকঠাক"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>এই মাসে যে কিস্তিগুলো দিতে হবে</CardTitle>
            <CardDescription>চলতি মাসে যে EMI পেমেন্ট pending আছে।</CardDescription>
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
                  return (
                    <Link key={order.id} href={`/emi-orders/${order.id}`}>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors mb-2">
                        <div className="flex-1">
                          <p className="font-semibold">{order.productName}</p>
                          <p className="text-sm text-muted-foreground">{order.shopName}</p>
                          {order.nextDueDate && (
                            <p className={`text-xs mt-1 ${days !== null && days < 0 ? "text-destructive" : days !== null && days <= 7 ? "text-orange-600" : "text-muted-foreground"}`}>
                              তারিখ: {formatDate(order.nextDueDate)}
                              {days !== null && days < 0 && ` (${Math.abs(days)} দিন আগে)`}
                              {days !== null && days === 0 && " (আজকে!)"}
                              {days !== null && days > 0 && days <= 7 && ` (${days} দিন বাকি)`}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{formatCurrency(order.monthlyAmount)}</p>
                          <Badge
                            variant="outline"
                            className={`mt-1 text-xs ${days !== null && days < 0 ? "border-destructive text-destructive" : days !== null && days <= 7 ? "border-orange-400 text-orange-600" : ""}`}
                          >
                            {days !== null && days < 0 ? "Overdue" : "Due"}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>এই মাসে কোনো কিস্তি নেই।</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>দোকান অনুযায়ী</CardTitle>
            <CardDescription>প্রতি দোকানে কত বাকি ও কত দেওয়া হয়েছে।</CardDescription>
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
                      <span className="text-muted-foreground">{stat.totalOrders}টি EMI</span>
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
                      <span>দেওয়া: {formatCurrency(stat.totalPaid)}</span>
                      <span>বাকি: {formatCurrency(stat.totalDue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>কোনো দোকানের তথ্য নেই।</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
