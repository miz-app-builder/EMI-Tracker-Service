import { useState } from "react";
import { useListEmiOrders, getListEmiOrdersQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Store, Calendar, CreditCard, ArrowRight, TrendingDown, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { QuickPayDialog } from "@/components/QuickPayDialog";

function getDaysOverdue(nextDueDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate);
  return Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export default function OverduePage() {
  const { data: orders, isLoading } = useListEmiOrders(
    { status: "active" },
    { query: { queryKey: getListEmiOrdersQueryKey({ status: "active" }) } }
  );
  const [quickPayOrder, setQuickPayOrder] = useState<{ id: number; productName: string; shopName: string; amount: number } | null>(null);

  const overdueOrders = (orders ?? [])
    .filter((o) => o.nextDueDate && getDaysOverdue(o.nextDueDate) > 0)
    .sort((a, b) => getDaysOverdue(b.nextDueDate!) - getDaysOverdue(a.nextDueDate!));

  const totalOverdueAmount = overdueOrders.reduce(
    (sum, o) => sum + (o.nextMonthlyAmount ?? o.monthlyAmount),
    0
  );
  const totalRemaining = overdueOrders.reduce(
    (sum, o) => sum + (o.remainingAmount ?? 0),
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">


      {/* Summary banner */}
      {!isLoading && overdueOrders.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 rounded-lg border bg-destructive/5 border-destructive/20">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue EMIs</p>
              <p className="text-2xl font-bold text-destructive">{overdueOrders.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg border bg-orange-500/5 border-orange-400/20">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <CreditCard className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Due This Month</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalOverdueAmount)}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-lg border">
            <div className="p-2 bg-muted rounded-lg">
              <TrendingDown className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Remaining</p>
              <p className="text-2xl font-bold">{formatCurrency(totalRemaining)}</p>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : overdueOrders.length === 0 ? (
          /* All clear state */
          <div className="py-16 text-center border rounded-xl bg-green-500/5 border-green-500/20">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-700">All clear!</h3>
            <p className="text-muted-foreground mt-2 text-sm max-w-xs mx-auto">
              No overdue EMIs right now. Keep it up — all payments are on time.
            </p>
            <Link href="/emi-orders">
              <Button variant="outline" className="mt-6 gap-2 border-green-500/30 text-green-700 hover:bg-green-50">
                View All EMIs <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          overdueOrders.map((order) => {
            const daysOverdue = getDaysOverdue(order.nextDueDate!);
            const progress = Math.min(
              100,
              Math.round(((order.installmentsPaid ?? 0) / order.emiMonths) * 100)
            );

            return (
              <Card
                key={order.id}
                className="border-destructive/30 bg-destructive/[0.02] hover:border-destructive/50 transition-colors"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    {/* Left — info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-lg leading-none">{order.productName}</h3>
                        <Badge variant="destructive" className="text-xs">
                          {daysOverdue} day{daysOverdue !== 1 ? "s" : ""} overdue
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Store className="h-3.5 w-3.5" /> {order.shopName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> Due: {formatDate(order.nextDueDate!)}
                        </span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="h-3.5 w-3.5" />
                          {order.installmentsPaid ?? 0}/{order.emiMonths} installments paid
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="h-1.5 w-full max-w-sm bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{progress}% paid</p>
                      </div>
                    </div>

                    {/* Right — amounts + action */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 min-w-[160px]">
                      <div className="text-left sm:text-right space-y-1">
                        <div>
                          <p className="text-xs text-muted-foreground">This installment</p>
                          <p className="font-bold text-lg text-destructive">
                            {formatCurrency(order.nextMonthlyAmount ?? order.monthlyAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total remaining</p>
                          <p className="font-semibold text-sm">
                            {formatCurrency(order.remainingAmount ?? 0)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-2 shrink-0"
                          onClick={() => setQuickPayOrder({
                            id: order.id,
                            productName: order.productName,
                            shopName: order.shopName,
                            amount: order.nextMonthlyAmount ?? order.monthlyAmount,
                          })}
                        >
                          <CreditCard className="h-4 w-4" />
                          Pay Now
                        </Button>
                        <Link href={`/emi-orders/${order.id}`}>
                          <Button size="sm" variant="outline" className="gap-1.5 shrink-0">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
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
