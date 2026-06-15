import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/format";
import { Calculator, ArrowRight, TrendingUp, PlusCircle } from "lucide-react";

function parseNum(val: string): number {
  const n = parseFloat(val.replace(/,/g, ""));
  return isNaN(n) || n < 0 ? 0 : n;
}

function CurrencyInput({
  label, value, onChange, max, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">৳</span>
        <Input
          type="number"
          min={0}
          max={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-7"
          placeholder="0"
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${highlight ? "font-bold text-primary" : "text-sm"}`}>
      <span className={highlight ? "text-base" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function CalculatorPage() {
  const [totalPrice, setTotalPrice] = useState("50000");
  const [downPayment, setDownPayment] = useState("10000");
  const [discount, setDiscount] = useState("0");
  const [months, setMonths] = useState(12);

  const calc = useMemo(() => {
    const tp = parseNum(totalPrice);
    const dp = parseNum(downPayment);
    const dc = parseNum(discount);
    const effectivePrice = Math.max(0, tp - dc);
    const emiTotal = Math.max(0, effectivePrice - dp);
    const monthly = months > 0 ? Math.ceil(emiTotal / months) : 0;
    const totalCost = dp + monthly * months;
    const extraPaid = Math.max(0, totalCost - effectivePrice);

    const schedule = Array.from({ length: Math.min(months, 12) }, (_, i) => {
      const paid = dp + monthly * (i + 1);
      const remaining = Math.max(0, emiTotal - monthly * (i + 1));
      return { month: i + 1, amount: monthly, cumulative: paid, remaining };
    });

    return { tp, dp, dc, effectivePrice, emiTotal, monthly, totalCost, extraPaid, schedule };
  }, [totalPrice, downPayment, discount, months]);

  const newOrderParams = new URLSearchParams({
    totalPrice: calc.tp.toString(),
    downPayment: calc.dp.toString(),
    discount: calc.dc.toString(),
    emiMonths: months.toString(),
    monthlyAmount: calc.monthly.toString(),
  }).toString();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">EMI Calculator</h2>
        <p className="text-muted-foreground mt-1">Calculate your monthly installment before making a purchase.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4 text-primary" />
              Enter Details
            </CardTitle>
            <CardDescription>Fill in the purchase details to calculate EMI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <CurrencyInput
              label="Total Price"
              value={totalPrice}
              onChange={setTotalPrice}
              hint="The full price of the product"
            />
            <CurrencyInput
              label="Down Payment"
              value={downPayment}
              onChange={setDownPayment}
              max={calc.tp}
              hint="Amount paid upfront (optional)"
            />
            <CurrencyInput
              label="Discount"
              value={discount}
              onChange={setDiscount}
              max={calc.tp}
              hint="Any discount on the total price (optional)"
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">EMI Duration</Label>
                <span className="text-sm font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {months} month{months !== 1 ? "s" : ""}
                </span>
              </div>
              <Slider
                min={1}
                max={36}
                step={1}
                value={[months]}
                onValueChange={([v]) => setMonths(v)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 month</span>
                <span>6</span>
                <span>12</span>
                <span>18</span>
                <span>24</span>
                <span>36 months</span>
              </div>
            </div>

            <Link href={`/emi-orders/new?${newOrderParams}`}>
              <Button className="w-full gap-2 mt-2" disabled={calc.monthly === 0}>
                <PlusCircle className="h-4 w-4" />
                Add as EMI Order
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Result Panel */}
        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 pb-4">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground mb-1">Monthly Installment</p>
                <p className="text-5xl font-extrabold text-primary">
                  {formatCurrency(calc.monthly)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">per month × {months} months</p>
              </div>

              {calc.extraPaid > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-orange-600 bg-orange-50 rounded-lg py-1.5 px-3">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>You pay <strong>{formatCurrency(calc.extraPaid)}</strong> extra due to rounding</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-0.5">
              <Row label="Total Price" value={formatCurrency(calc.tp)} />
              {calc.dc > 0 && <Row label="− Discount" value={`− ${formatCurrency(calc.dc)}`} />}
              <Row label="Effective Price" value={formatCurrency(calc.effectivePrice)} />
              {calc.dp > 0 && <Row label="− Down Payment" value={`− ${formatCurrency(calc.dp)}`} />}
              <Row label="EMI Total" value={formatCurrency(calc.emiTotal)} />
              <Separator className="my-2" />
              <Row label="Monthly × Months" value={`${formatCurrency(calc.monthly)} × ${months}`} />
              <Row label="Total Cost" value={formatCurrency(calc.totalCost)} highlight />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Schedule */}
      {calc.monthly > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Payment Schedule
              {months > 12 && <span className="text-sm font-normal text-muted-foreground ml-2">(first 12 months shown)</span>}
            </CardTitle>
            <CardDescription>Month-by-month installment breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Month</th>
                    <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Installment</th>
                    <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Total Paid</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.schedule.map((row) => (
                    <tr key={row.month} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 pr-4 font-medium">Month {row.month}</td>
                      <td className="py-2 pr-4 text-right text-primary font-semibold">{formatCurrency(row.amount)}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(row.cumulative)}</td>
                      <td className="py-2 text-right">
                        <span className={row.remaining === 0 ? "text-green-600 font-semibold" : ""}>
                          {row.remaining === 0 ? "✓ Paid off" : formatCurrency(row.remaining)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
