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
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CreditCard, Calendar, Store, User, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function EmiOrderDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const orderId = Number(id);
  
  const { data: order, isLoading } = useGetEmiOrder(orderId, { query: { enabled: !!orderId, queryKey: getGetEmiOrderQueryKey(orderId) } });
  
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createPayment = useCreateEmiPayment();
  const updateOrder = useUpdateEmiOrder();

  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: "Cash",
    notes: ""
  });

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData.amount) return;

    createPayment.mutate({
      data: {
        emiOrderId: orderId,
        amount: Number(paymentData.amount),
        paymentDate: paymentData.paymentDate,
        paymentMethod: paymentData.paymentMethod,
        notes: paymentData.notes
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEmiOrderQueryKey(orderId) });
        queryClient.invalidateQueries({ queryKey: getListEmiOrdersQueryKey() });
        setOpen(false);
        setPaymentData({
          amount: "",
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: "Cash",
          notes: ""
        });
        toast({ title: "Payment added successfully" });
      },
      onError: () => {
        toast({ title: "Failed to add payment", variant: "destructive" });
      }
    });
  };

  const handleStatusComplete = () => {
    if (!confirm("Are you sure you want to mark this order as completed?")) return;
    
    updateOrder.mutate({ id: orderId, data: { status: "completed" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetEmiOrderQueryKey(orderId) });
        queryClient.invalidateQueries({ queryKey: getListEmiOrdersQueryKey() });
        toast({ title: "Order marked as completed" });
      }
    });
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

  if (!order) {
    return <div>Order not found</div>;
  }

  const progress = Math.min(100, Math.round(((order.totalPaid || 0) / order.totalPrice) * 100));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setLocation("/emi-orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">{order.productName}</h2>
              <Badge variant={order.status === "completed" ? "outline" : "default"} className={order.status === "completed" ? "bg-green-500/10 text-green-700 border-green-500/20" : ""}>
                {order.status === "completed" ? "Completed" : "Active"}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">Order #{order.id} • Purchased on {formatDate(order.purchaseDate)}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {order.status === "active" && (
            <>
              <Button variant="outline" onClick={handleStatusComplete} className="text-green-600 border-green-200 hover:bg-green-50">
                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Complete
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setPaymentData(p => ({...p, amount: order.monthlyAmount.toString()}))}>
                    <CreditCard className="mr-2 h-4 w-4" /> Add Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record EMI Payment</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (BDT) <span className="text-destructive">*</span></Label>
                      <Input 
                        id="amount" 
                        type="number" 
                        value={paymentData.amount} 
                        onChange={e => setPaymentData({...paymentData, amount: e.target.value})} 
                        required 
                        className="font-bold text-lg"
                      />
                      <p className="text-xs text-muted-foreground">Standard monthly EMI is {formatCurrency(order.monthlyAmount)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="paymentDate">Date</Label>
                        <Input 
                          id="paymentDate" 
                          type="date" 
                          value={paymentData.paymentDate} 
                          onChange={e => setPaymentData({...paymentData, paymentDate: e.target.value})} 
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Method</Label>
                        <Select value={paymentData.paymentMethod} onValueChange={val => setPaymentData({...paymentData, paymentMethod: val})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Mobile Banking">Mobile Banking</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Textarea 
                        id="notes" 
                        value={paymentData.notes} 
                        onChange={e => setPaymentData({...paymentData, notes: e.target.value})} 
                        placeholder="Transaction ID, remarks, etc."
                      />
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={createPayment.isPending}>
                        {createPayment.isPending ? "Saving..." : "Save Payment"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

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
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Down Payment</p>
                <p className="font-semibold text-lg">{formatCurrency(order.downPayment)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="font-semibold text-lg text-primary">{formatCurrency(order.totalPaid || 0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Remaining Due</p>
                <p className="font-bold text-xl text-destructive">{formatCurrency(order.remainingAmount || 0)}</p>
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
            </div>

            <div className="mt-8 grid grid-cols-2 gap-6 pt-6 border-t">
              <div className="flex gap-3">
                <div className="p-2 bg-muted rounded-md h-fit">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">EMI Plan</p>
                  <p className="font-medium">{order.emiMonths} Months</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-2 bg-primary/10 rounded-md h-fit">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Amount</p>
                  <p className="font-bold text-primary">{formatCurrency(order.monthlyAmount)}</p>
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
                <User className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">Customer</p>
                  <p className="font-medium">{order.customerName}</p>
                </div>
              </div>
              <div className="p-4 flex gap-3 items-start">
                <Store className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase font-medium tracking-wider mb-1">Showroom</p>
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
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Record of all installments received for this order.</CardDescription>
        </CardHeader>
        <CardContent>
          {order.payments && order.payments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Show down payment as first row if it exists */}
                  {order.downPayment > 0 && (
                    <TableRow className="bg-secondary/20">
                      <TableCell>{formatDate(order.purchaseDate)}</TableCell>
                      <TableCell><Badge variant="outline">Initial</Badge></TableCell>
                      <TableCell className="text-muted-foreground italic">Down Payment</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(order.downPayment)}</TableCell>
                    </TableRow>
                  )}
                  {/* Actual payments */}
                  {order.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate">
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
              <p className="font-medium text-muted-foreground">No payments recorded yet</p>
              {order.downPayment > 0 && (
                <p className="text-sm text-muted-foreground mt-1">Down payment of {formatCurrency(order.downPayment)} was made at purchase.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
