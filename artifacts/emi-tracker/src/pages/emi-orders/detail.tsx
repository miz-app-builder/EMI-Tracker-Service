import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useGetEmiOrder, getGetEmiOrderQueryKey, useCreateEmiPayment, useUpdateEmiOrder, getListEmiOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CreditCard, Calendar, CalendarDays, Store, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";
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
    return { label: `${Math.abs(diffDays)} দিন বাকি শেষ হয়ে গেছে`, color: "bg-destructive/10 text-destructive border-destructive/30" };
  if (diffDays === 0)
    return { label: "আজকেই শেষ তারিখ!", color: "bg-orange-500/10 text-orange-700 border-orange-400/30" };
  if (diffDays <= 7)
    return { label: `মাত্র ${diffDays} দিন বাকি`, color: "bg-orange-500/10 text-orange-700 border-orange-400/30" };
  return { label: `${diffDays} দিন বাকি`, color: "bg-primary/5 text-primary border-primary/20" };
}

export default function EmiOrderDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const orderId = Number(id);

  const { data: order, isLoading } = useGetEmiOrder(orderId, {
    query: { enabled: !!orderId, queryKey: getGetEmiOrderQueryKey(orderId) },
  });

  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPayment = useCreateEmiPayment();
  const updateOrder = useUpdateEmiOrder();

  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Cash",
    notes: "",
  });

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData.amount) return;

    createPayment.mutate(
      {
        id: orderId,
        data: {
          amount: Number(paymentData.amount),
          paymentDate: paymentData.paymentDate,
          paymentMethod: paymentData.paymentMethod,
          notes: paymentData.notes,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetEmiOrderQueryKey(orderId) });
          queryClient.invalidateQueries({ queryKey: getListEmiOrdersQueryKey() });
          setOpen(false);
          setPaymentData({ amount: "", paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "Cash", notes: "" });
          toast({ title: "কিস্তি যোগ হয়েছে!" });
        },
        onError: () => {
          toast({ title: "কিস্তি যোগ ব্যর্থ হয়েছে", variant: "destructive" });
        },
      }
    );
  };

  const handleStatusComplete = () => {
    if (!confirm("এই EMI সম্পন্ন হিসেবে চিহ্নিত করবেন?")) return;
    updateOrder.mutate(
      { id: orderId, data: { status: "completed" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetEmiOrderQueryKey(orderId) });
          queryClient.invalidateQueries({ queryKey: getListEmiOrdersQueryKey() });
          toast({ title: "EMI সম্পন্ন হিসেবে চিহ্নিত হয়েছে" });
        },
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

  const progress = Math.min(100, Math.round(((order.totalPaid ?? 0) / order.totalPrice) * 100));
  const nextDueBadge = getNextDueBadge(order.nextDueDate, order.status);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
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
                {order.status === "completed" ? "সম্পন্ন" : "চলমান"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              Order #{order.id} • কেনা: {formatDate(order.purchaseDate)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {order.status === "active" && (
            <>
              <Button variant="outline" onClick={handleStatusComplete} className="text-green-600 border-green-200 hover:bg-green-50">
                <CheckCircle2 className="mr-2 h-4 w-4" /> সম্পন্ন করুন
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => setPaymentData((p) => ({ ...p, amount: (order.nextMonthlyAmount ?? order.monthlyAmount).toString() }))}
                  >
                    <CreditCard className="mr-2 h-4 w-4" /> কিস্তি দিন
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>কিস্তি রেকর্ড করুন</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">পরিমাণ (টাকা) <span className="text-destructive">*</span></Label>
                      <Input
                        id="amount"
                        type="number"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                        required
                        className="font-bold text-lg"
                      />
                      <p className="text-xs text-muted-foreground">
                        প্রস্তাবিত কিস্তি: <span className="font-semibold text-primary">{formatCurrency(order.nextMonthlyAmount ?? order.monthlyAmount)}</span>
                        {order.nextMonthlyAmount && order.nextMonthlyAmount !== order.monthlyAmount && (
                          <span className="ml-1 text-muted-foreground">(মূল: {formatCurrency(order.monthlyAmount)})</span>
                        )}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="paymentDate">তারিখ</Label>
                        <Input
                          id="paymentDate"
                          type="date"
                          value={paymentData.paymentDate}
                          onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paymentMethod">পদ্ধতি</Label>
                        <Select
                          value={paymentData.paymentMethod}
                          onValueChange={(val) => setPaymentData({ ...paymentData, paymentMethod: val })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">নগদ (Cash)</SelectItem>
                            <SelectItem value="Bank Transfer">ব্যাংক ট্রান্সফার</SelectItem>
                            <SelectItem value="Mobile Banking">মোবাইল ব্যাংকিং (bKash/Nagad)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">নোট (ঐচ্ছিক)</Label>
                      <Textarea
                        id="notes"
                        value={paymentData.notes}
                        onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                        placeholder="Transaction ID, মন্তব্য ইত্যাদি..."
                      />
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={createPayment.isPending}>
                        {createPayment.isPending ? "সেভ হচ্ছে..." : "কিস্তি সেভ করুন"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {/* Next due date banner */}
      {order.status === "active" && order.nextDueDate && nextDueBadge && (
        <div className={`flex items-center gap-3 p-4 rounded-lg border ${nextDueBadge.color}`}>
          <Clock className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">পরবর্তী কিস্তির তারিখ: {formatDate(order.nextDueDate)}</p>
            <p className="text-sm opacity-80">
          {nextDueBadge.label} — পরবর্তী কিস্তি: <span className="font-bold">{formatCurrency(order.nextMonthlyAmount ?? order.monthlyAmount)}</span>
          {order.nextMonthlyAmount && order.nextMonthlyAmount !== order.monthlyAmount && (
            <span className="ml-1 opacity-70">(মূল: {formatCurrency(order.monthlyAmount)})</span>
          )}
        </p>
          </div>
        </div>
      )}
      {order.status === "completed" && (
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-green-500/10 text-green-700 border-green-500/30">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p className="font-semibold">এই EMI সম্পূর্ণ পরিশোধ হয়ে গেছে।</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3 border-b">
            <CardTitle>আর্থিক সারসংক্ষেপ</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">মোট দাম</p>
                <p className="font-bold text-xl">{formatCurrency(order.totalPrice)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ডাউন পেমেন্ট</p>
                <p className="font-semibold text-lg">{formatCurrency(order.downPayment)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">মোট দেওয়া হয়েছে</p>
                <p className="font-semibold text-lg text-primary">{formatCurrency(order.totalPaid ?? 0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">এখনো বাকি</p>
                <p className={`font-bold text-xl ${(order.remainingAmount ?? 0) > 0 ? "text-destructive" : "text-green-600"}`}>
                  {formatCurrency(order.remainingAmount ?? 0)}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-primary">পরিশোধের অগ্রগতি</span>
                <span>{progress}%</span>
              </div>
              <div className="h-3 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full ${progress === 100 ? "bg-green-500" : "bg-primary"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {order.installmentsPaid ?? 0} / {order.emiMonths} টি কিস্তি দেওয়া হয়েছে
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-6 pt-6 border-t">
              <div className="flex gap-3">
                <div className="p-2 bg-muted rounded-md h-fit">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">EMI মেয়াদ</p>
                  <p className="font-medium">{order.emiMonths} মাস</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-2 bg-primary/10 rounded-md h-fit">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">পরবর্তী কিস্তি</p>
                  <p className="font-bold text-primary">{formatCurrency(order.nextMonthlyAmount ?? order.monthlyAmount)}</p>
                  {order.nextMonthlyAmount && order.nextMonthlyAmount !== order.monthlyAmount && (
                    <p className="text-xs text-muted-foreground">মূল: {formatCurrency(order.monthlyAmount)}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle>বিস্তারিত</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              <div className="p-4 flex gap-3 items-start">
                <Store className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">শোরুম / দোকান</p>
                  <p className="font-medium">{order.shopName}</p>
                </div>
              </div>
              <div className="p-4 flex gap-3 items-start">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">পণ্য</p>
                  <p className="font-medium">{order.productName}</p>
                </div>
              </div>
              <div className="p-4 flex gap-3 items-start">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">কেনার তারিখ</p>
                  <p className="font-medium">{formatDate(order.purchaseDate)}</p>
                </div>
              </div>
              {order.dueDayOfMonth && (
                <div className="p-4 flex gap-3 items-start">
                  <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">মাসিক due তারিখ</p>
                    <p className="font-medium">প্রতি মাসের <span className="font-bold text-primary">{order.dueDayOfMonth}</span> তারিখ</p>
                  </div>
                </div>
              )}
              {order.status === "active" && order.nextDueDate && (
                <div className="p-4 flex gap-3 items-start bg-orange-50 dark:bg-orange-950/20">
                  <AlertCircle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-orange-600 uppercase font-medium tracking-wider mb-1">পরের কিস্তি</p>
                    <p className="font-bold text-orange-700">{formatDate(order.nextDueDate)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>পেমেন্ট ইতিহাস</CardTitle>
          <CardDescription>এ পর্যন্ত দেওয়া সকল কিস্তির রেকর্ড।</CardDescription>
        </CardHeader>
        <CardContent>
          {order.payments && order.payments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>তারিখ</TableHead>
                    <TableHead>পদ্ধতি</TableHead>
                    <TableHead>নোট</TableHead>
                    <TableHead className="text-right">পরিমাণ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.downPayment > 0 && (
                    <TableRow className="bg-secondary/20">
                      <TableCell>{formatDate(order.purchaseDate)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Initial</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground italic">ডাউন পেমেন্ট</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.downPayment)}</TableCell>
                    </TableRow>
                  )}
                  {order.payments.map((payment, idx) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        <div>{formatDate(payment.paymentDate)}</div>
                        <div className="text-xs text-muted-foreground">{idx + 1}নং কিস্তি</div>
                      </TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {payment.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(payment.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center border rounded-lg border-dashed">
              <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="font-medium text-muted-foreground">এখনো কোনো কিস্তি দেওয়া হয়নি</p>
              {order.downPayment > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  ডাউন পেমেন্ট {formatCurrency(order.downPayment)} কেনার সময় দেওয়া হয়েছে।
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
