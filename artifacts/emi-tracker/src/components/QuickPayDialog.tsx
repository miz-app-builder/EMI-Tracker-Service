import { useState } from "react";
import {
  useCreateEmiPayment,
  getListEmiOrdersQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetDueThisMonthQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { SmsPastePanel } from "@/components/SmsPastePanel";

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

function emptyForm(amountDue?: number): PaymentFormData {
  return {
    amount: amountDue ? String(amountDue) : "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "Cash",
    bankName: "",
    accountNumber: "",
    transactionId: "",
    notes: "",
  };
}

interface QuickPayDialogProps {
  orderId: number;
  productName: string;
  shopName: string;
  amountDue: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function QuickPayDialog({
  orderId,
  productName,
  shopName,
  amountDue,
  open,
  onOpenChange,
  onSuccess,
}: QuickPayDialogProps) {
  const [form, setForm] = useState<PaymentFormData>(() => emptyForm(amountDue));
  const createPayment = useCreateEmiPayment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const set = (key: keyof PaymentFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  const isBankTransfer = form.paymentMethod === "Bank Transfer";
  const isMobile = ["bKash", "Nagad", "Rocket"].includes(form.paymentMethod);

  function handleOpenChange(val: boolean) {
    if (!val) setForm(emptyForm(amountDue));
    onOpenChange(val);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return;
    createPayment.mutate(
      {
        id: orderId,
        data: {
          amount: Number(form.amount),
          paymentDate: form.paymentDate,
          paymentMethod: form.paymentMethod,
          bankName: form.bankName || null,
          accountNumber: form.accountNumber || null,
          transactionId: form.transactionId || null,
          notes: form.notes || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEmiOrdersQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDueThisMonthQueryKey() });
          toast({ title: "Payment recorded!", description: `${formatCurrency(Number(form.amount))} for ${productName}` });
          handleOpenChange(false);
          onSuccess?.();
        },
        onError: () => toast({ title: "Failed to record payment", variant: "destructive" }),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Record Payment
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{productName}</span>
            {" — "}{shopName}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <SmsPastePanel
            onApply={(parsed) =>
              setForm((p) => ({
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
              <Label htmlFor="qp-amount">
                Amount (BDT) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="qp-amount"
                type="number"
                value={form.amount}
                onChange={set("amount")}
                required
                min={1}
                className="font-bold text-lg"
                placeholder={String(amountDue)}
              />
              {amountDue > 0 && (
                <p className="text-xs text-muted-foreground">
                  Due: {formatCurrency(amountDue)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="qp-date">Date</Label>
              <Input
                id="qp-date"
                type="date"
                value={form.paymentDate}
                onChange={set("paymentDate")}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Method</Label>
            <Select
              value={form.paymentMethod}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, paymentMethod: v, bankName: "", accountNumber: "", transactionId: "" }))
              }
            >
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
                  <Label htmlFor="qp-bank">Bank Name</Label>
                  <Input id="qp-bank" value={form.bankName} onChange={set("bankName")} placeholder="e.g. Dutch-Bangla Bank" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qp-acc">Account Number</Label>
                  <Input id="qp-acc" value={form.accountNumber} onChange={set("accountNumber")} placeholder="e.g. 1234567890" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="qp-txn">Transaction ID / Reference</Label>
                <Input id="qp-txn" value={form.transactionId} onChange={set("transactionId")} placeholder="e.g. TXN123456789" />
              </div>
            </div>
          )}

          {isMobile && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{form.paymentMethod} Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="qp-mob">{form.paymentMethod} Number</Label>
                  <Input id="qp-mob" type="tel" value={form.accountNumber} onChange={set("accountNumber")} placeholder="01XXXXXXXXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qp-txn2">Transaction ID</Label>
                  <Input id="qp-txn2" value={form.transactionId} onChange={set("transactionId")} placeholder="e.g. ABC1234567890" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="qp-notes">Note (optional)</Label>
            <Textarea id="qp-notes" value={form.notes} onChange={set("notes")} placeholder="Any comments..." rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPayment.isPending}>
              {createPayment.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Recording…</>
              ) : (
                <><CreditCard className="h-4 w-4 mr-2" /> Record Payment</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
