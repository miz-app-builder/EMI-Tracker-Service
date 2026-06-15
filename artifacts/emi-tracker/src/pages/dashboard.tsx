import { useGetDashboardSummary, getGetDashboardSummaryQueryKey, useGetDueThisMonth, getGetDueThisMonthQueryKey, useGetShopStats, getGetShopStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { Activity, DollarSign, Wallet, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: dueThisMonth, isLoading: loadingDue } = useGetDueThisMonth({ query: { queryKey: getGetDueThisMonthQueryKey() } });
  const { data: shopStats, isLoading: loadingStats } = useGetShopStats({ query: { queryKey: getGetShopStatsQueryKey() } });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-muted-foreground mt-1">Overview of your showroom installment business.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Orders</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold text-primary">{summary?.totalActiveOrders || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Out of {summary?.totalOrders || 0} total orders</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due Amount</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{formatCurrency(summary?.totalDueAmount || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Remaining to be collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-32" /> : (
              <div className="text-2xl font-bold">{formatCurrency(summary?.thisMonthCollected || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Total paid: {formatCurrency(summary?.totalPaidAmount || 0)}</p>
          </CardContent>
        </Card>

        <Card className={summary?.overdueOrders ? "border-destructive/30 bg-destructive/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Orders</CardTitle>
            <AlertCircle className={`h-4 w-4 ${summary?.overdueOrders ? "text-destructive" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
              <div className={`text-2xl font-bold ${summary?.overdueOrders ? "text-destructive" : ""}`}>{summary?.overdueOrders || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Orders Due This Month</CardTitle>
            <CardDescription>Upcoming installments that need to be collected.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDue ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : dueThisMonth && dueThisMonth.length > 0 ? (
              <div className="space-y-4">
                {dueThisMonth.map((order) => (
                  <Link key={order.id} href={`/emi-orders/${order.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors mb-2">
                      <div>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-sm text-muted-foreground">{order.productName} • {order.shopName}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{formatCurrency(order.monthlyAmount)}</p>
                        <Badge variant="outline" className="mt-1">Due</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No orders due this month.</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Shop Performance</CardTitle>
            <CardDescription>Total due vs collected per shop.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
               <div className="space-y-4">
                 {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full" />)}
               </div>
            ) : shopStats && shopStats.length > 0 ? (
              <div className="space-y-6">
                {shopStats.map((stat) => (
                  <div key={stat.shopId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{stat.shopName}</span>
                      <span className="text-muted-foreground">{stat.totalOrders} orders</span>
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
                      <span>Collected: {formatCurrency(stat.totalPaid)}</span>
                      <span>Due: {formatCurrency(stat.totalDue)}</span>
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
    </div>
  );
}
