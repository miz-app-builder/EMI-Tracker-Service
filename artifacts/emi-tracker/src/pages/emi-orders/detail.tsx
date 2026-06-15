import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetEmiOrder, getGetEmiOrderQueryKey,
  useCreateEmiPayment, useDeleteEmiPayment, useUpdateEmiPayment,
  useUpdateEmiOrder, getListEmiOrdersQueryKey,
} from "@workspace/api-client-react";
import type { EmiPayment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SmsPastePanel } from "@/components/SmsPastePanel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, CreditCard, Calendar, CalendarDays, Store, FileText,
  CheckCircle2, AlertCircle, Clock, Hash, ShieldCheck, Pencil, Trash2, Receipt,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function getNextDueBadge(nextDueDate: string | null | undefined, status: string) {
  if (status === "completed" || !nextDueDate) return null;
  const today = new Date();
  const due = new Date(nextDueDate);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)
    return { label: `${Math.abs(diffDays)} day(s) overdue`, color: "bg-destructive/10 text-destructive border-destructive/30" };
  if (diffDays === 0)
    return { label: "Due today!", color: "bg-orange-500/10 text-orange-700 border-orange-400/30" };
  if (diffDays <= 7)
    return { label: `Only ${diffDays} day(s) left`, color: "bg-orange-500/10 text-orange-700 border-orange-400/30" };
  return { label: `${diffDays} day(s) remaining`, color: "bg-primary/5 text-primary border-primary/20" };
}

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "bKash", "Nagad", "Rocket"];

type PaymentFormData = {
  amount: string;
  paymentDate: string;
  paymentMethod: string;
  bankName: string;
  accountNumber: string;
  transactionId: string;
  notes: string;
};

function emptyPaymentForm(defaults?: Partial<PaymentFormData>): PaymentFormData {
  return {
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Cash",
    bankName: "",
    accountNumber: "",
    transactionId: "",
    notes: "",
    ...defaults,
  };
}

function paymentToForm(p: EmiPayment): PaymentFormData {
  return {
    amount: String(p.amount),
    paymentDate: p.paymentDate,
    paymentMethod: p.paymentMethod,
    bankName: p.bankName ?? "",
    accountNumber: p.accountNumber ?? "",
    transactionId: p.transactionId ?? "",
    notes: p.notes ?? "",
  };
}

function PaymentFormFields({
  data,
  setData,
  minDate,
}: {
  data: PaymentFormData;
  setData: React.Dispatch<React.SetStateAction<PaymentFormData>>;
  minDate?: string;
}) {
  const set = (key: keyof PaymentFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setData((p) => ({ ...p, [key]: e.target.value }));

  const isBankTransfer = data.paymentMethod === "Bank Transfer";
  const isMobile = ["bKash", "Nagad", "Rocket"].includes(data.paymentMethod);

  return (
    <div className="space-y-4">
      <SmsPastePanel
        onApply={(parsed) =>
          setData((p) => ({
            ...p,
            ...(parsed.paymentMethod ? { paymentMethod: parsed.paymentMethod, bankName: "", accountNumber: "", transactionId: "" } : {}),
            ...(parsed.amount !== null ? { amount: String(parsed.amount) } : {}),
            ...(parsed.accountNumber ? { accountNumber: parsed.accountNumber } : {}),
            ...(parsed.transactionId ? { transactionId: parsed.transactionId } : {}),
          }))
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pf-amount">Amount (BDT) <span className="text-destructive">*</span></Label>
          <Input id="pf-amount" type="number" value={data.amount} onChange={set("amount")} required className="font-bold text-lg" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pf-date">Date</Label>
          <Input id="pf-date" type="date" value={data.paymentDate} onChange={set("paymentDate")} required min={minDate} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Method</Label>
        <Select value={data.paymentMethod} onValueChange={(v) => setData((p) => ({ ...p, paymentMethod: v, bankName: "", accountNumber: "", transactionId: "" }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isBankTransfer && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bank Transfer Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pf-bank">Bank Name</Label>
              <Input id="pf-bank" value={data.bankName} onChange={set("bankName")} placeholder="e.g. Dutch-Bangla Bank" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-acc">Account Number</Label>
              <Input id="pf-acc" value={data.accountNumber} onChange={set("accountNumber")} placeholder="e.g. 1234567890" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pf-txn">Transaction ID / Reference</Label>
            <Input id="pf-txn" value={data.transactionId} onChange={set("transactionId")} placeholder="e.g. TXN123456789" />
          </div>
        </div>
      )}

      {isMobile && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{data.paymentMethod} Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="pf-mob">{data.paymentMethod} Number</Label>
              <Input id="pf-mob" type="tel" value={data.accountNumber} onChange={set("accountNumber")} placeholder="01XXXXXXXXX" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pf-txn2">Transaction ID</Label>
              <Input id="pf-txn2" value={data.transactionId} onChange={set("transactionId")} placeholder="e.g. ABC1234567890" />
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="pf-notes">Note (optional)</Label>
        <Textarea id="pf-notes" value={data.notes} onChange={set("notes")} placeholder="Any comments..." />
      </div>
    </div>
  );
}

export default function EmiOrderDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const orderId = Number(id);

  const { data: order, isLoading } = useGetEmiOrder(orderId, {
    query: { enabled: !!orderId, queryKey: getGetEmiOrderQueryKey(orderId) },
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ── Mutations ──
  const createPayment = useCreateEmiPayment();
  const deletePayment = useDeleteEmiPayment();
  const updatePayment = useUpdateEmiPayment();
  const updateOrder   = useUpdateEmiOrder();

  // ── Add Payment dialog ──
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<PaymentFormData>(emptyPaymentForm());

  // ── Edit Payment dialog ──
  const [editPayment, setEditPayment] = useState<EmiPayment | null>(null);
  const [editForm, setEditForm] = useState<PaymentFormData>(emptyPaymentForm());

  // ── Confirm dialog ──
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
    open: false, title: "", message: "", onConfirm: () => {},
  });
  const openConfirm = (title: string, message: string, onConfirm: () => void) =>
    setConfirmDialog({ open: true, title, message, onConfirm });
  const closeConfirm = () => setConfirmDialog((p) => ({ ...p, open: false }));

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetEmiOrderQueryKey(orderId) });
    queryClient.invalidateQueries({ queryKey: getListEmiOrdersQueryKey() });
  }

  // ── Handlers ──
  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.amount) return;
    if (order.purchaseDate && addForm.paymentDate < order.purchaseDate) {
      toast({ title: "Invalid payment date", description: `Payment date cannot be before purchase date (${formatDate(order.purchaseDate)}).`, variant: "destructive" });
      return;
    }
    if (nextDueMonthStart && addForm.paymentDate < nextDueMonthStart) {
      toast({ title: "Too early", description: `This installment can only be paid from ${formatDate(nextDueMonthStart)}.`, variant: "destructive" });
      return;
    }
    createPayment.mutate(
      {
        id: orderId,
        data: {
          amount: Number(addForm.amount),
          paymentDate: addForm.paymentDate,
          paymentMethod: addForm.paymentMethod,
          bankName: addForm.bankName || null,
          accountNumber: addForm.accountNumber || null,
          transactionId: addForm.transactionId || null,
          notes: addForm.notes || null,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setAddOpen(false);
          setAddForm(emptyPaymentForm());
          toast({ title: "Payment recorded!" });
        },
        onError: () => toast({ title: "Failed to record payment", variant: "destructive" }),
      }
    );
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPayment || !editForm.amount) return;
    if (order.purchaseDate && editForm.paymentDate < order.purchaseDate) {
      toast({ title: "Invalid payment date", description: `Payment date cannot be before purchase date (${formatDate(order.purchaseDate)}).`, variant: "destructive" });
      return;
    }
    updatePayment.mutate(
      {
        paymentId: editPayment.id,
        data: {
          amount: Number(editForm.amount),
          paymentDate: editForm.paymentDate,
          paymentMethod: editForm.paymentMethod,
          bankName: editForm.bankName || null,
          accountNumber: editForm.accountNumber || null,
          transactionId: editForm.transactionId || null,
          notes: editForm.notes || null,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setEditPayment(null);
          toast({ title: "Payment updated!" });
        },
        onError: () => toast({ title: "Failed to update payment", variant: "destructive" }),
      }
    );
  };

  const handleDelete = (payment: EmiPayment) => {
    openConfirm(
      "Delete Payment",
      `Delete this payment of ${formatCurrency(payment.amount)}? This cannot be undone.`,
      () => {
        deletePayment.mutate(
          { paymentId: payment.id },
          {
            onSuccess: () => { invalidate(); toast({ title: "Payment deleted" }); },
            onError: () => toast({ title: "Failed to delete payment", variant: "destructive" }),
          }
        );
      }
    );
  };

  const handleStatusComplete = () => {
    openConfirm(
      "Mark as Completed",
      "Mark this EMI as completed? This will change the order status to completed.",
      () => {
        updateOrder.mutate(
          { id: orderId, data: { status: "completed" } },
          {
            onSuccess: () => { invalidate(); toast({ title: "EMI marked as completed" }); },
          }
        );
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 md:col-span-2" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!order) return <div>Order not found</div>;

  const emiTotal = Math.max(1, order.totalPrice - (order.discount ?? 0) - order.downPayment);
  const progress = Math.min(100, Math.round(((order.totalPaid ?? 0) / emiTotal) * 100));
  const nextDueBadge = getNextDueBadge(order.nextDueDate, order.status);

  const TODAY = new Date().toISOString().split("T")[0];
  const nextDueMonthStart = order.nextDueDate ? order.nextDueDate.substring(0, 7) + "-01" : null;
  const canPayThisMonth = !nextDueMonthStart || TODAY >= nextDueMonthStart;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/emi-orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">{order.productName}</h2>
              <Badge
                variant={order.status === "completed" ? "outline" : "default"}
                className={order.status === "completed" ? "bg-green-500/10 text-green-700 border-green-500/20" : ""}
              >
                {order.status === "completed" ? "Completed" : "Active"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Order #{order.id} • Purchased: {formatDate(order.purchaseDate)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {order.status === "active" && (
            <>
              <Button variant="outline" onClick={handleStatusComplete} className="text-green-600 border-green-200 hover:bg-green-50">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete
              </Button>
              <div className="flex flex-col items-end gap-1">
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                  <Button
                    disabled={!canPayThisMonth}
                    onClick={() => {
                      if (!canPayThisMonth) return;
                      setAddForm(emptyPaymentForm({ amount: String(order.nextMonthlyAmount ?? order.monthlyAmount) }));
                      setAddOpen(true);
                    }}
                  >
                    <CreditCard className="mr-2 h-4 w-4" /> Pay Installment
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Payment</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAdd} className="space-y-4 pt-2">
                      <p className="text-xs text-muted-foreground">
                        Suggested: <span className="font-semibold text-primary">{formatCurrency(order.nextMonthlyAmount ?? order.monthlyAmount)}</span>
                        {order.nextMonthlyAmount && order.nextMonthlyAmount !== order.monthlyAmount && (
                          <span className="ml-1">(original: {formatCurrency(order.monthlyAmount)})</span>
                        )}
                      </p>
                      <PaymentFormFields data={addForm} setData={setAddForm} minDate={nextDueMonthStart ?? undefined} />
                      <div className="flex justify-end pt-2">
                        <Button type="submit" disabled={createPayment.isPending}>
                          {createPayment.isPending ? "Saving..." : "Save Payment"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                {!canPayThisMonth && nextDueMonthStart && (
                  <p className="text-xs text-muted-foreground">Available from {formatDate(nextDueMonthStart)}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Edit Payment dialog ── */}
      <Dialog open={!!editPayment} onOpenChange={(open) => { if (!open) setEditPayment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <PaymentFormFields data={editForm} setData={setEditForm} />
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={updatePayment.isPending}>
                {updatePayment.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Confirm dialog ── */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => { if (!open) closeConfirm(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirmDialog.title}</DialogTitle>
            <DialogDescription>{confirmDialog.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={closeConfirm}>Cancel</Button>
            <Button variant="destructive" onClick={() => { confirmDialog.onConfirm(); closeConfirm(); }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Status banners ── */}
      {order.status === "active" && order.nextDueDate && nextDueBadge && (
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${nextDueBadge.color}`}>
          <Clock className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Next installment due: {formatDate(order.nextDueDate)}</p>
            <p className="text-sm opacity-80">
              {nextDueBadge.label} — Next payment: <span className="font-bold">{formatCurrency(order.nextMonthlyAmount ?? order.monthlyAmount)}</span>
              {order.nextMonthlyAmount && order.nextMonthlyAmount !== order.monthlyAmount && (
                <span className="ml-1 opacity-70">(original: {formatCurrency(order.monthlyAmount)})</span>
              )}
            </p>
          </div>
        </div>
      )}
      {order.status === "completed" && (
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-500/10 text-green-700 border-green-500/30">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="font-semibold">This EMI has been fully paid off.</p>
        </div>
      )}

      {/* ── Summary + Details cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3 border-b">
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Price</p>
                <p className="font-bold text-xl">{formatCurrency(order.totalPrice)}</p>
                {(order.discount ?? 0) > 0 && (
                  <p className="text-xs text-green-600 font-medium">Discount: -{formatCurrency(order.discount ?? 0)}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Down Payment</p>
                <p className="font-semibold text-lg">{formatCurrency(order.downPayment)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="font-semibold text-lg text-primary">{formatCurrency(order.totalPaid ?? 0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Still Owed</p>
                <p className={`font-bold text-xl ${(order.remainingAmount ?? 0) > 0 ? "text-destructive" : "text-green-600"}`}>
                  {formatCurrency(order.remainingAmount ?? 0)}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-primary">Payment Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full ${progress === 100 ? "bg-green-500" : "bg-primary"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {order.installmentsPaid ?? 0} / {order.emiMonths} installments paid
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-6 pt-6 border-t">
              <div className="flex gap-3">
                <div className="p-2 bg-muted rounded-md h-fit">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">EMI Duration</p>
                  <p className="font-medium">{order.emiMonths} months</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-2 bg-primary/10 rounded-md h-fit">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Installment</p>
                  <p className="font-bold text-primary">{formatCurrency(order.nextMonthlyAmount ?? order.monthlyAmount)}</p>
                  {order.nextMonthlyAmount && order.nextMonthlyAmount !== order.monthlyAmount && (
                    <p className="text-xs text-muted-foreground">Original: {formatCurrency(order.monthlyAmount)}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              <div className="p-4 flex gap-3 items-start">
                <Store className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">Shop / Showroom</p>
                  <p className="font-medium">{order.shopName}</p>
                </div>
              </div>
              <div className="p-4 flex gap-3 items-start">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">Product</p>
                  <p className="font-medium">{order.productName}</p>
                </div>
              </div>
              {order.modelNumber && (
                <div className="p-4 flex gap-3 items-start">
                  <Hash className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">Model Number</p>
                    <p className="font-medium font-mono">{order.modelNumber}</p>
                  </div>
                </div>
              )}
              {order.warrantyInfo && (
                <div className="p-4 flex gap-3 items-start">
                  <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">Guarantee / Warranty</p>
                    <p className="font-medium">{order.warrantyInfo}</p>
                  </div>
                </div>
              )}
              {order.customerId && (
                <div className="p-4 flex gap-3 items-start">
                  <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">Customer ID</p>
                    <p className="font-medium font-mono">{order.customerId}</p>
                  </div>
                </div>
              )}
              <div className="p-4 flex gap-3 items-start">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">Purchase Date</p>
                  <p className="font-medium">{formatDate(order.purchaseDate)}</p>
                </div>
              </div>
              {order.dueDayOfMonth && (
                <div className="p-4 flex gap-3 items-start">
                  <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">Monthly Due Day</p>
                    <p className="font-medium">Day <span className="font-bold text-primary">{order.dueDayOfMonth}</span> of each month</p>
                  </div>
                </div>
              )}
              {order.status === "active" && order.nextDueDate && (
                <div className="p-4 flex gap-3 items-start bg-orange-50 dark:bg-orange-950/20">
                  <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-orange-600 uppercase font-medium tracking-wider mb-1">Next Installment</p>
                    <p className="font-bold text-orange-700">{formatDate(order.nextDueDate)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Payment History ── */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>All installments recorded so far. Hover a row to edit or delete.</CardDescription>
        </CardHeader>
        <CardContent>
          {order.payments && order.payments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Down payment row — no edit/delete */}
                  {order.downPayment > 0 && (
                    <TableRow className="bg-secondary/20">
                      <TableCell>{formatDate(order.purchaseDate)}</TableCell>
                      <TableCell><Badge variant="outline">Initial</Badge></TableCell>
                      <TableCell className="text-muted-foreground italic">Down Payment</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.downPayment)}</TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                  {order.payments.map((payment, idx) => (
                    <TableRow key={payment.id} className="group">
                      <TableCell className="font-medium">
                        <div>{formatDate(payment.paymentDate)}</div>
                        <div className="text-xs text-muted-foreground">Installment #{idx + 1}</div>
                      </TableCell>
                      <TableCell>
                        <div>{payment.paymentMethod}</div>
                        {payment.accountNumber && (
                          <div className="text-xs text-muted-foreground">{payment.accountNumber}</div>
                        )}
                        {payment.bankName && (
                          <div className="text-xs text-muted-foreground">{payment.bankName}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[180px]">
                        {payment.transactionId && (
                          <div className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded inline-block mb-1">
                            {payment.transactionId}
                          </div>
                        )}
                        {payment.notes && <div className="truncate">{payment.notes}</div>}
                        {!payment.transactionId && !payment.notes && "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-teal-600"
                            title="View Receipt"
                            onClick={() => setLocation(`/emi-orders/${orderId}/payments/${payment.id}/receipt`)}
                          >
                            <Receipt className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setEditPayment(payment);
                              setEditForm(paymentToForm(payment));
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(payment)}
                            disabled={deletePayment.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center border rounded-lg border-dashed">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="font-medium text-muted-foreground">No installments recorded yet</p>
              {order.downPayment > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Down payment of {formatCurrency(order.downPayment)} was made at time of purchase.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
