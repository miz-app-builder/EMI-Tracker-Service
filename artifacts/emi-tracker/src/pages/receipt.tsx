import { useParams, useLocation } from "wouter";
import { useGetEmiOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { Printer, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ReceiptPage() {
  const { id, paymentId } = useParams<{ id: string; paymentId: string }>();
  const [, navigate] = useLocation();

  const orderId = Number(id);
  const paymentIdNum = Number(paymentId);

  const { data: order, isLoading } = useGetEmiOrder(orderId, {
    query: { enabled: !!orderId && !isNaN(orderId) },
  });

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center text-muted-foreground">
        <p className="text-lg font-medium">Order not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/emi-orders")}>
          Back
        </Button>
      </div>
    );
  }

  const payment = order.payments?.find((p) => p.id === paymentIdNum);
  const installmentNumber = order.payments
    ? order.payments.findIndex((p) => p.id === paymentIdNum) + 1
    : 0;

  if (!payment) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center text-muted-foreground">
        <p className="text-lg font-medium">Payment not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`/emi-orders/${orderId}`)}>
          Back
        </Button>
      </div>
    );
  }

  const totalPaid = order.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;
  const remaining = (order.effectivePrice ?? order.totalPrice) - order.downPayment - totalPaid;

  const isMobile = ["bKash", "Nagad", "Rocket"].includes(payment.paymentMethod);

  return (
    <>
      {/* Print styles injected inline */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 12mm;
        }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

          /* Force light mode for print */
          html {
            color-scheme: light !important;
            background: white !important;
          }
          body {
            background: white !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Override ALL dark-mode CSS variables to light values */
          :root, [class*="dark"] {
            --background: 0 0% 100% !important;
            --foreground: 222 47% 11% !important;
            --card: 0 0% 100% !important;
            --card-foreground: 222 47% 11% !important;
            --muted: 210 40% 96% !important;
            --muted-foreground: 215 16% 47% !important;
            --border: 214 32% 91% !important;
            --primary: 172 66% 34% !important;
            --primary-foreground: 0 0% 100% !important;
          }

          /* Hide layout chrome */
          .no-print { display: none !important; }
          aside, header { display: none !important; }

          /* Reset main scroll container for print */
          main { height: auto !important; overflow: visible !important; }
          .overflow-y-auto, .overflow-auto { overflow: visible !important; }

          /* Receipt card */
          .receipt-card {
            border: 1px solid #cbd5e1 !important;
            box-shadow: none !important;
            max-width: 170mm !important;
            width: 170mm !important;
            margin: 0 auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            overflow: visible !important;
            border-radius: 8px !important;
            background: white !important;
            color: #0f172a !important;
          }

          /* Reduce spacing to fit single page */
          .receipt-card .px-6 { padding-left: 16px !important; padding-right: 16px !important; }
          .receipt-card .py-5 { padding-top: 8px !important; padding-bottom: 8px !important; }
          .receipt-card .space-y-5 > * + * { margin-top: 8px !important; }
          .receipt-card .space-y-2\\.5 > * + * { margin-top: 5px !important; }
          .receipt-card .text-3xl { font-size: 1.3rem !important; }
          .receipt-card .text-xl { font-size: 0.95rem !important; }
          .receipt-card .text-lg { font-size: 0.9rem !important; }
          .receipt-card .p-4 { padding: 10px !important; }
          .receipt-card .p-3 { padding: 6px !important; }
          .receipt-card .gap-3 { gap: 6px !important; }
          .receipt-card .py-2 { padding-top: 6px !important; padding-bottom: 6px !important; }

          /* Force text colors */
          .receipt-card .text-muted-foreground { color: #64748b !important; }
          .receipt-card .text-foreground { color: #0f172a !important; }
          .receipt-card .text-primary { color: #0d9488 !important; }
          .receipt-card .bg-muted\\/50 { background-color: #f1f5f9 !important; }
          .receipt-card .bg-teal-50 { background-color: #f0fdfa !important; }
          .receipt-card .text-teal-700 { color: #0f766e !important; }
          .receipt-card .text-green-600 { color: #16a34a !important; }
          .receipt-card .text-orange-500 { color: #f97316 !important; }
          .receipt-card .border-border { border-color: #e2e8f0 !important; }
        }
      `}</style>

      {/* Screen nav */}
      <div className="no-print flex items-center gap-3 mb-6 max-w-xl mx-auto">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate(`/emi-orders/${orderId}`)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex-1" />
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="h-4 w-4" /> Print Receipt
        </Button>
      </div>

      {/* Receipt card */}
      <div className="receipt-card max-w-xl mx-auto bg-white dark:bg-card text-foreground rounded-2xl border shadow-lg overflow-hidden">

        {/* Header */}
        <div className="bg-teal-600 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black">৳</span>
              <div>
                <p className="font-bold text-lg leading-tight">EMI Tracker</p>
                <p className="text-teal-100 text-xs">Payment Receipt</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-teal-100 text-xs uppercase tracking-wider">Receipt #</p>
              <p className="font-mono font-bold text-lg">
                {String(orderId).padStart(3, "0")}-{String(payment.id).padStart(4, "0")}
              </p>
            </div>
          </div>
        </div>

        {/* Paid stamp */}
        <div className="flex justify-center -mt-1 pb-2 bg-teal-50 dark:bg-teal-900/20">
          <div className="flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full px-4 py-1 text-sm font-bold border border-green-300 dark:border-green-700 mt-3">
            <CheckCircle2 className="h-4 w-4" />
            PAID
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Product & Shop */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Product</p>
            <p className="text-xl font-bold text-foreground">{order.productName}</p>
            <p className="text-sm text-muted-foreground">{order.shopName}</p>
            {order.modelNumber && (
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Model: {order.modelNumber}</p>
            )}
          </div>

          <hr className="border-dashed border-border" />

          {/* Payment details */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment Details</p>

            <Row label="Installment" value={`#${installmentNumber} of ${order.numberOfInstallments}`} />
            <Row label="Payment Date" value={formatDate(payment.paymentDate)} />
            <Row label="Method" value={payment.paymentMethod} />

            {isMobile && payment.accountNumber && (
              <Row label={`${payment.paymentMethod} Number`} value={payment.accountNumber} />
            )}
            {!isMobile && payment.bankName && (
              <Row label="Bank" value={payment.bankName} />
            )}
            {!isMobile && payment.accountNumber && (
              <Row label="Account" value={payment.accountNumber} />
            )}
            {payment.transactionId && (
              <Row
                label="Transaction ID"
                value={<span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{payment.transactionId}</span>}
              />
            )}
            {payment.notes && (
              <Row label="Note" value={payment.notes} />
            )}
          </div>

          <hr className="border-dashed border-border" />

          {/* Amount highlight */}
          <div className="bg-teal-50 dark:bg-teal-900/20 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Amount Paid</p>
              <p className="text-3xl font-black text-teal-700 dark:text-teal-400 mt-0.5">
                {formatCurrency(payment.amount)}
              </p>
            </div>
            <div className="text-right text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">Total: </span>
                <span className="font-semibold">{formatCurrency(order.effectivePrice ?? order.totalPrice)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Paid so far: </span>
                <span className="font-semibold text-green-600">{formatCurrency(totalPaid + order.downPayment)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining: </span>
                <span className={`font-semibold ${remaining <= 0 ? "text-green-600" : "text-orange-500"}`}>
                  {remaining <= 0 ? "Fully Paid" : formatCurrency(remaining)}
                </span>
              </div>
            </div>
          </div>

          {/* Summary bar */}
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Purchase Date</p>
              <p className="font-semibold mt-0.5">{formatDate(order.purchaseDate)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Down Payment</p>
              <p className="font-semibold mt-0.5">{formatCurrency(order.downPayment)}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Monthly</p>
              <p className="font-semibold mt-0.5">{formatCurrency(order.monthlyAmount)}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-2 border-t border-dashed">
            <p>Generated by <span className="font-semibold text-teal-600">EMI Tracker</span></p>
            <p className="mt-0.5">Printed on {new Date().toLocaleDateString("en-GB")}</p>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right text-foreground">{value}</span>
    </div>
  );
}
