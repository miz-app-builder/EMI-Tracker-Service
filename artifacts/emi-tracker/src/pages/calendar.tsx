import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useGetEmiOrders } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type DayStatus = "overdue" | "due" | "completed";

interface DayEmi {
  id: string;
  productName: string;
  shopName: string;
  monthlyAmount: number;
  status: DayStatus;
  orderId: string;
}

function getStatus(dueDate: Date, today: Date, orderStatus: string): DayStatus {
  if (orderStatus === "completed") return "completed";
  const due = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const tod = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (due < tod) return "overdue";
  return "due";
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<number | null>(() => today.getDate());

  const { data: orders, isLoading } = useGetEmiOrders({});

  // Map: day-of-month → list of EMIs due on that day in viewDate's month
  const dayMap = useMemo(() => {
    const map = new Map<number, DayEmi[]>();
    if (!orders) return map;

    orders.forEach((order: any) => {
      const dueStr = order.nextDueDate || order.startDate;
      if (!dueStr) return;
      const due = new Date(dueStr);

      // Check if due date falls in current view month/year
      if (due.getFullYear() === viewDate.getFullYear() && due.getMonth() === viewDate.getMonth()) {
        const day = due.getDate();
        const status = getStatus(due, today, order.status);
        const entry: DayEmi = {
          id: order.id,
          productName: order.productName || order.product?.name || "Product",
          shopName: order.shopName || order.shop?.name || "Shop",
          monthlyAmount: Number(order.monthlyInstallment ?? order.monthlyAmount ?? 0),
          status,
          orderId: order.id,
        };
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(entry);
      }
    });
    return map;
  }, [orders, viewDate, today]);

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today.getDate());
  };

  // Build calendar grid
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isCurrentMonth =
    viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth();

  const selectedEmis = selectedDay ? (dayMap.get(selectedDay) ?? []) : [];

  const totalDue = [...dayMap.values()].flat().filter(e => e.status === "due").length;
  const totalOverdue = [...dayMap.values()].flat().filter(e => e.status === "overdue").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Calendar View</h2>
          <p className="text-muted-foreground mt-1">See all your EMI due dates at a glance.</p>
        </div>
        <div className="flex gap-2 text-sm">
          {totalOverdue > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {totalOverdue} Overdue
            </Badge>
          )}
          {totalDue > 0 && (
            <Badge variant="outline" className="gap-1 border-primary text-primary">
              <Clock className="h-3 w-3" />
              {totalDue} Due this month
            </Badge>
          )}
        </div>
      </div>

      <Card>
        {/* Month navigation */}
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <CardTitle className="text-lg">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </CardTitle>
              {!isCurrentMonth && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={goToday}>
                  Today
                </Button>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-3 pb-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Loading...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} />;
                const emis = dayMap.get(day) ?? [];
                const isToday = isCurrentMonth && day === today.getDate();
                const isSelected = day === selectedDay;
                const hasOverdue = emis.some(e => e.status === "overdue");
                const hasDue = emis.some(e => e.status === "due");
                const hasCompleted = emis.some(e => e.status === "completed");

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                    className={`
                      relative flex flex-col items-center rounded-lg p-1.5 min-h-[52px] transition-colors
                      ${isSelected ? "bg-primary text-primary-foreground" : isToday ? "bg-primary/10 text-primary" : "hover:bg-muted"}
                      ${emis.length > 0 ? "cursor-pointer" : "cursor-default"}
                    `}
                  >
                    <span className={`text-sm font-medium ${isToday && !isSelected ? "font-bold" : ""}`}>
                      {day}
                    </span>
                    {/* Dots */}
                    {emis.length > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                        {hasOverdue && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-destructive"}`} />
                        )}
                        {hasDue && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`} />
                        )}
                        {hasCompleted && !hasDue && !hasOverdue && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/60" : "bg-muted-foreground/40"}`} />
                        )}
                      </div>
                    )}
                    {emis.length > 1 && (
                      <span className={`text-[9px] font-bold mt-0.5 ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        ×{emis.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-3 border-t border-border justify-center text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-destructive inline-block" /> Overdue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Due
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" /> Completed
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Day detail panel */}
      {selectedDay && (
        <Card className={`border-2 ${selectedEmis.length === 0 ? "border-border" : selectedEmis.some(e => e.status === "overdue") ? "border-destructive/30" : "border-primary/20"}`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              {MONTHS[viewDate.getMonth()]} {selectedDay}, {viewDate.getFullYear()}
              {selectedEmis.length > 0 && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {selectedEmis.length} EMI{selectedEmis.length > 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedEmis.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-muted-foreground gap-2">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm">No EMIs due on this day</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEmis.map((emi) => (
                  <div
                    key={emi.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      emi.status === "overdue"
                        ? "border-destructive/30 bg-destructive/5"
                        : emi.status === "completed"
                        ? "border-border bg-muted/30"
                        : "border-primary/20 bg-primary/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        emi.status === "overdue" ? "bg-destructive" :
                        emi.status === "completed" ? "bg-muted-foreground/40" : "bg-primary"
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{emi.productName}</p>
                        <p className="text-xs text-muted-foreground">{emi.shopName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`font-bold text-sm ${emi.status === "overdue" ? "text-destructive" : "text-primary"}`}>
                          {formatCurrency(emi.monthlyAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{emi.status}</p>
                      </div>
                      {emi.status !== "completed" && (
                        <Link href={`/emi-orders/${emi.orderId}`}>
                          <Button size="sm" variant={emi.status === "overdue" ? "destructive" : "default"} className="h-7 text-xs">
                            Pay Now
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
                {selectedEmis.filter(e => e.status !== "completed").length > 0 && (
                  <div className="pt-2 border-t border-border flex justify-between text-sm">
                    <span className="text-muted-foreground">Total due this day</span>
                    <span className="font-bold text-primary">
                      {formatCurrency(selectedEmis.filter(e => e.status !== "completed").reduce((s, e) => s + e.monthlyAmount, 0))}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
