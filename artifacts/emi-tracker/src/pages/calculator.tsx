import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/format";
import { Calculator, ArrowRight, TrendingUp, PlusCircle, Percent } from "lucide-react";

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

function Row({ label, value, highlight, warn }: { label: string; value: string; highlight?: boolean; warn?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${highlight ? "font-bold" : "text-sm"}`}>
      <span className={highlight ? "text-base text-foreground" : warn ? "text-orange-600" : "text-muted-foreground"}>{label}</span>
      <span className={highlight ? "text-primary text-base" : warn ? "text-orange-600 font-semibold" : ""}>{value}</span>
    </div>
  );
}

export default function CalculatorPage() {
  const [totalPrice, setTotalPrice] = useState("50000");
  const [downPayment, setDownPayment] = useState("10000");
  const [discount, setDiscount] = useState("0");
  const [months, setMonths] = useState(12);
  const [annualRate, setAnnualRate] = useState("0");

  const calc = useMemo(() => {
    const tp = parseNum(totalPrice);
    const dp = parseNum(downPayment);
    const dc = parseNum(discount);
    const rate = Math.min(parseNum(annualRate), 100);

    const effectivePrice = Math.max(0, tp - dc);
    const principal = Math.max(0, effectivePrice - dp);
    const monthlyRate = rate / 100 / 12;
    const isZeroRate = rate === 0 || monthlyRate === 0;

    let monthly = 0;
    if (principal > 0 && months > 0) {
      if (isZeroRate) {
        monthly = Math.ceil(principal / months);
      } else {
        const r = monthlyRate;
        const n = months;
        monthly = Math.round(principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
      }
    }

    const totalEmiPaid = monthly * months;
    const totalCost = dp + totalEmiPaid;
    const totalInterest = Math.max(0, totalEmiPaid - principal);

    // Payment schedule with amortization
    const schedule = Array.from({ length: Math.min(months, 12) }, (_, i) => {
      if (isZeroRate) {
        const paidEmi = monthly * (i + 1);
        return {
          month: i + 1,
          emi: monthly,
          principal: monthly,
          interest: 0,
          cumulative: dp + paidEmi,
          remaining: Math.max(0, principal - paidEmi),
        };
      }
      // Amortization schedule
      let balance = principal;
      let interestThisMonth = 0;
      let principalThisMonth = 0;
      for (let m = 0; m <= i; m++) {
        interestThisMonth = Math.round(balance * monthlyRate);
        principalThisMonth = monthly - interestThisMonth;
        balance = Math.max(0, balance - principalThisMonth);
      }
      const cumulativeEmi = monthly * (i + 1);
      return {
        month: i + 1,
        emi: monthly,
        principal: principalThisMonth,
        interest: interestThisMonth,
        cumulative: dp + cumulativeEmi,
        remaining: Math.max(0, balance),
      };
    });

    return {
      tp, dp, dc, effectivePrice, principal,
      monthly, totalEmiPaid, totalCost, totalInterest,
      isZeroRate, rate, schedule,
    };
  }, [totalPrice, downPayment, discount, months, annualRate]);

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

            {/* Interest Rate */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Annual Interest Rate</Label>
                {calc.isZeroRate ? (
                  <Badge variant="outline" className="border-green-500 text-green-600 text-xs">0% EMI</Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs">{calc.rate}% per year</Badge>
                )}
              </div>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={annualRate}
                  onChange={(e) => setAnnualRate(e.target.value)}
                  className="pr-8"
                  placeholder="0"
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                {calc.isZeroRate
                  ? "0% — shop is offering interest-free EMI"
                  : `Monthly rate: ${(calc.rate / 12).toFixed(2)}% — shop charges interest`}
              </p>
            </div>

            {/* EMI Duration */}
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
                <span>1 mo</span>
                <span>6</span>
                <span>12</span>
                <span>18</span>
                <span>24</span>
                <span>36 mo</span>
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
          <Card className={`border-primary/20 ${calc.isZeroRate ? "bg-primary/5" : "bg-orange-500/5 border-orange-400/20"}`}>
            <CardContent className="pt-6 pb-4">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground mb-1">Monthly Installment</p>
                <p className={`text-5xl font-extrabold ${calc.isZeroRate ? "text-primary" : "text-orange-600"}`}>
                  {formatCurrency(calc.monthly)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">per month × {months} months</p>
              </div>

              {!calc.isZeroRate && calc.totalInterest > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-orange-600 bg-orange-100/50 rounded-lg py-1.5 px-3">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  <span>You pay <strong>{formatCurrency(calc.totalInterest)}</strong> extra as interest ({calc.rate}% p.a.)</span>
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
              <Row label="Principal (EMI Amount)" value={formatCurrency(calc.principal)} />
              <Separator className="my-2" />
              {!calc.isZeroRate && (
                <Row label={`+ Interest (${calc.rate}% p.a. × ${months} mo)`} value={`+ ${formatCurrency(calc.totalInterest)}`} warn />
              )}
              <Row label="Monthly × Months" value={`${formatCurrency(calc.monthly)} × ${months}`} />
              <Row label="Total EMI Paid" value={formatCurrency(calc.totalEmiPaid)} />
              <Row label="Total Cost (incl. down payment)" value={formatCurrency(calc.totalCost)} highlight />
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
            <CardDescription>
              {calc.isZeroRate
                ? "Month-by-month installment breakdown"
                : "Amortization schedule — interest + principal per month"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Month</th>
                    <th className="text-right py-2 pr-3 font-medium text-muted-foreground">EMI</th>
                    {!calc.isZeroRate && (
                      <>
                        <th className="text-right py-2 pr-3 font-medium text-muted-foreground">Principal</th>
                        <th className="text-right py-2 pr-3 font-medium text-orange-500">Interest</th>
                      </>
                    )}
                    <th className="text-right py-2 pr-3 font-medium text-muted-foreground">Total Paid</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.schedule.map((row) => (
                    <tr key={row.month} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 pr-3 font-medium">Month {row.month}</td>
                      <td className="py-2 pr-3 text-right font-semibold text-primary">{formatCurrency(row.emi)}</td>
                      {!calc.isZeroRate && (
                        <>
                          <td className="py-2 pr-3 text-right text-foreground">{formatCurrency(row.principal)}</td>
                          <td className="py-2 pr-3 text-right text-orange-600">{formatCurrency(row.interest)}</td>
                        </>
                      )}
                      <td className="py-2 pr-3 text-right">{formatCurrency(row.cumulative)}</td>
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
