import { useState, useMemo } from "react";
import {
  useListEmiOrders,
  useCreateEmiPayment,
  getListEmiOrdersQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetDueThisMonthQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, Loader2, CheckSquare, Square, AlertCircle, Clock, CheckCircle2,
} from "lucide-react";

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "bKash", "Nagad", "Rocket"];
const TODAY = new Date().toISOString().split("T")[0];

function getOrderStatus(order: any): "overdue" | "due" | "completed" {
  if (order.status === "completed") return "completed";
  if (order.nextDueDate) {
    const due = new Date(order.nextDueDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (due < today) return "overdue";
  }
  return "due";
}

type RowState = {
  selected: boolean;
  amount: string;
  paymentMethod: string;
};

export default function BulkPayPage() {
  const { data: orders, isLoading } = useListEmiOrders({});
  const createPayment = useCreateEmiPayment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [globalMethod, setGlobalMethod] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(TODAY);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeOrders = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter((o: any) => o.status !== "completed")
      .sort((a: any, b: any) => {
        const sa = getOrderStatus(a), sb = getOrderStatus(b);
        if (sa === "overdue" && sb !== "overdue") return -1;
        if (sa !== "overdue" && sb === "overdue") return 1;
        return 0;
      });
  }, [orders]);

  function getRow(id: number, order: any): RowState {
    return rows[id] ?? {
      selected: false,
      amount: String(order.nextMonthlyAmount ?? order.monthlyAmount ?? ""),
      paymentMethod: globalMethod,
    };
  }

  function setRow(id: number, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...getRow(id, activeOrders.find((o: any) => o.id === id)), ...patch } }));
  }

  const selectedOrders = activeOrders.filter((o: any) => getRow(o.id, o).selected);
  const totalAmount = selectedOrders.reduce((sum: number, o: any) => sum + Number(getRow(o.id, o).amount || 0), 0);

  function toggleAll() {
    const allSelected = activeOrders.length > 0 && activeOrders.every((o: any) => getRow(o.id, o).selected);
    setRows((prev) => {
      const next = { ...prev };
      activeOrders.forEach((o: any) => {
        next[o.id] = {
          ...getRow(o.id, o),
          selected: !allSelected,
          paymentMethod: globalMethod,
        };
      });
      return next;
    });
  }

  function applyGlobalMethod(method: string) {
    setGlobalMethod(method);
    setRows((prev) => {
      const next = { ...prev };
      activeOrders.forEach((o: any) => {
        if (prev[o.id]) next[o.id] = { ...prev[o.id], paymentMethod: method };
      });
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    for (const order of selectedOrders) {
      const row = getRow(order.id, order);
      const amount = Number(row.amount);
      if (!amount || amount <= 0) { failCount++; continue; }
      try {
        await new Promise<void>((resolve, reject) =>
          createPayment.mutate(
            {
              id: order.id,
              data: {
                amount,
                paymentDate,
                paymentMethod: row.paymentMethod,
                bankName: null,
                accountNumber: null,
                transactionId: null,
                notes: null,
              },
            },
            { onSuccess: () => resolve(), onError: () => reject() }
          )
        );
        successCount++;
      } catch {
        failCount++;
      }
    }

    await queryClient.invalidateQueries({ queryKey: getListEmiOrdersQueryKey() });
    await queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    await queryClient.invalidateQueries({ queryKey: getGetDueThisMonthQueryKey() });

    setSubmitting(false);
    setConfirmOpen(false);

    if (successCount > 0 && failCount === 0) {
      toast({ title: `${successCount}টি payment সফলভাবে রেকর্ড হয়েছে!`, description: `মোট ${formatCurrency(totalAmount)}` });
    } else if (successCount > 0) {
      toast({ title: `${successCount}টি সফল, ${failCount}টি ব্যর্থ`, variant: "destructive" });
    } else {
      toast({ title: "Payment রেকর্ড করা যায়নি", variant: "destructive" });
    }

    setRows({});
  }

  const allSelected = activeOrders.length > 0 && activeOrders.every((o: any) => getRow(o.id, o).selected);
  const someSelected = activeOrders.some((o: any) => getRow(o.id, o).selected);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Bulk Payment</h2>
          <p className="text-muted-foreground mt-1">একসাথে একাধিক EMI payment রেকর্ড করুন।</p>
        </div>
        {someSelected && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">{selectedOrders.length}টি selected</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(totalAmount)}</p>
            </div>
            <Button onClick={() => setConfirmOpen(true)} className="gap-2">
              <CreditCard className="h-4 w-4" />
              Pay Selected
            </Button>
          </div>
        )}
      </div>

      {/* Global controls */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAll}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                {allSelected
                  ? <CheckSquare className="h-5 w-5 text-primary" />
                  : <Square className="h-5 w-5 text-muted-foreground" />
                }
                {allSelected ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <span className="text-sm text-muted-foreground">Payment date:</span>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-8 w-40 text-sm"
              />
              <span className="text-sm text-muted-foreground">Method (all):</span>
              <Select value={globalMethod} onValueChange={applyGlobalMethod}>
                <SelectTrigger className="h-8 w-36 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : activeOrders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-base font-medium">কোনো active EMI নেই</p>
            <p className="text-sm">সব EMI completed!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {activeOrders.map((order: any) => {
            const row = getRow(order.id, order);
            const status = getOrderStatus(order);
            return (
              <Card
                key={order.id}
                className={`transition-all border-2 ${
                  row.selected
                    ? "border-primary/50 bg-primary/5"
                    : "border-border hover:border-border/80"
                }`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <Checkbox
                      checked={row.selected}
                      onCheckedChange={(checked) => setRow(order.id, { selected: !!checked })}
                      className="h-5 w-5 shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-foreground truncate">{order.productName}</p>
                        {status === "overdue" ? (
                          <Badge variant="destructive" className="gap-1 text-xs shrink-0">
                            <AlertCircle className="h-3 w-3" /> Overdue
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs text-primary border-primary/30 shrink-0">
                            <Clock className="h-3 w-3" /> Due
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{order.shopName}</p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap justify-end">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-muted-foreground font-medium">৳</span>
                        <Input
                          type="number"
                          value={row.amount}
                          onChange={(e) => setRow(order.id, { amount: e.target.value })}
                          className="h-9 w-28 font-semibold text-sm"
                          min={1}
                          onClick={() => !row.selected && setRow(order.id, { selected: true })}
                        />
                      </div>
                      <Select
                        value={row.paymentMethod}
                        onValueChange={(v) => setRow(order.id, { paymentMethod: v })}
                      >
                        <SelectTrigger className="h-9 w-32 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky footer summary */}
      {someSelected && (
        <div className="sticky bottom-4 z-10">
          <Card className="border-primary/30 bg-card/95 backdrop-blur shadow-lg">
            <CardContent className="py-3 px-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Selected</p>
                    <p className="font-bold text-foreground">{selectedOrders.length} EMI</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="font-bold text-primary text-lg">{formatCurrency(totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-bold text-foreground">{paymentDate}</p>
                  </div>
                </div>
                <Button onClick={() => setConfirmOpen(true)} size="lg" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Pay {selectedOrders.length} EMI
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment নিশ্চিত করুন
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              {selectedOrders.map((order: any) => {
                const row = getRow(order.id, order);
                return (
                  <div key={order.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground truncate flex-1 mr-2">{order.productName}</span>
                    <span className="font-semibold text-primary shrink-0">{formatCurrency(Number(row.amount))}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-muted-foreground">মোট</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(totalAmount)}</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {paymentDate} তারিখে রেকর্ড হবে
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              বাতিল
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
              ) : (
                <><CreditCard className="h-4 w-4" /> Confirm Payment</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
