import { useState } from "react";
import { Bell, AlertCircle, Clock, CheckCircle2, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  useGetDueThisMonth,
  getGetDueThisMonthQueryKey,
} from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";

function getDaysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: orders } = useGetDueThisMonth({
    query: { queryKey: getGetDueThisMonthQueryKey() },
  });

  const overdue = (orders ?? []).filter((o) => {
    const d = getDaysUntil(o.nextDueDate);
    return d !== null && d < 0;
  });

  const dueSoon = (orders ?? []).filter((o) => {
    const d = getDaysUntil(o.nextDueDate);
    return d !== null && d >= 0 && d <= 7;
  });

  const totalCount = overdue.length + dueSoon.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white leading-none">
              {totalCount > 9 ? "9+" : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 shadow-lg" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-foreground" />
            <span className="font-semibold text-sm">Notifications</span>
          </div>
          {totalCount > 0 && (
            <span className="text-xs font-bold bg-destructive text-white px-1.5 py-0.5 rounded-full">
              {totalCount}
            </span>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-70" />
              <p className="text-sm font-medium">All clear!</p>
              <p className="text-xs opacity-60">No overdue or upcoming payments</p>
            </div>
          ) : (
            <div className="py-1">
              {overdue.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-destructive/5">
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-xs font-semibold text-destructive uppercase tracking-wide">
                      Overdue ({overdue.length})
                    </span>
                  </div>
                  {overdue.map((order) => {
                    const days = getDaysUntil(order.nextDueDate);
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between px-4 py-3 border-b border-border/50 hover:bg-muted/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{order.productName}</p>
                          <p className="text-xs text-muted-foreground truncate">{order.shopName}</p>
                          <p className="text-xs text-destructive mt-0.5 font-medium">
                            {formatCurrency(order.monthlyAmount)} &nbsp;·&nbsp;{" "}
                            {Math.abs(days!)} day{Math.abs(days!) !== 1 ? "s" : ""} ago
                          </p>
                        </div>
                        <Link href={`/emi-orders/${order.id}`} onClick={() => setOpen(false)}>
                          <Button size="sm" variant="destructive" className="ml-3 h-7 px-2.5 text-xs gap-1 shrink-0">
                            Pay
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}

              {dueSoon.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-orange-500/5">
                    <Clock className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                      Due Soon ({dueSoon.length})
                    </span>
                  </div>
                  {dueSoon.map((order) => {
                    const days = getDaysUntil(order.nextDueDate);
                    return (
                      <div
                        key={order.id}
                        className="flex items-center justify-between px-4 py-3 border-b border-border/50 hover:bg-muted/40 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{order.productName}</p>
                          <p className="text-xs text-muted-foreground truncate">{order.shopName}</p>
                          <p className="text-xs text-orange-600 mt-0.5 font-medium">
                            {formatCurrency(order.monthlyAmount)} &nbsp;·&nbsp;{" "}
                            {days === 0 ? "Today!" : `in ${days} day${days !== 1 ? "s" : ""}`}
                          </p>
                        </div>
                        <Link href={`/emi-orders/${order.id}`} onClick={() => setOpen(false)}>
                          <Button size="sm" variant="outline" className="ml-3 h-7 px-2.5 text-xs gap-1 shrink-0 border-orange-300 text-orange-600 hover:bg-orange-50">
                            Pay
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {totalCount > 0 && (
          <div className="border-t px-4 py-2.5">
            <Link href="/overdue" onClick={() => setOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground hover:text-foreground gap-1">
                View all overdue EMIs
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
