import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { formatCurrency } from "@/lib/format";
import { useListEmiOrders } from "@workspace/api-client-react";
import {
  Calculator, ArrowRight, TrendingUp, PlusCircle, Percent,
  Zap, CheckCircle2, TrendingDown, CalendarCheck,
} from "lucide-react";

function parseNum(val: string): number {
  const n = parseFloat(val.replace(/,/g, ""));
  return isNaN(n) || n < 0 ? 0 : n;
}

function CurrencyInput({
  label, value, onChange, max, hint,
}: {
  label: string; value: string; onChange: (v: string) => void; max?: number; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">৳</span>
        <Input type="number" min={0} max={max} value={value} onChange={(e) => onChange(e.target.value)} className="pl-7" placeholder="0" />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({ label, value, highlight, warn, positive }: { label: string; value: string; highlight?: boolean; warn?: boolean; positive?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-1.5 ${highlight ? "font-bold" : "text-sm"}`}>
      <span className={highlight ? "text-base text-foreground" : warn ? "text-orange-600" : positive ? "text-green-600" : "text-muted-foreground"}>{label}</span>
      <span className={highlight ? "text-primary text-base" : warn ? "text-orange-600 font-semibold" : positive ? "text-green-600 font-semibold" : ""}>{value}</span>
    </div>
  );
}

type RateMode = "monthly" | "yearly";
type Tab = "emi" | "payoff";

// ─── EMI Calculator ───────────────────────────────────────────────────────────

function EmiCalculatorTab() {
  const [totalPrice, setTotalPrice] = useState("50000");
  const [downPayment, setDownPayment] = useState("10000");
  const [discount, setDiscount] = useState("0");
  const [months, setMonths] = useState(12);
  const [rateInput, setRateInput] = useState("0");
  const [rateMode, setRateMode] = useState<RateMode>("yearly");

  const calc = useMemo(() => {
    const tp = parseNum(totalPrice);
    const dp = parseNum(downPayment);
    const dc = parseNum(discount);
    const rateVal = Math.max(0, parseNum(rateInput));
    const monthlyRate = rateMode === "monthly" ? rateVal / 100 : rateVal / 100 / 12;
    const annualRate = rateMode === "monthly" ? rateVal * 12 : rateVal;
    const isZeroRate = monthlyRate === 0;
    const effectivePrice = Math.max(0, tp - dc);
    const principal = Math.max(0, effectivePrice - dp);

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

    const schedule = (() => {
      const rows = [];
      let balance = principal;
      for (let i = 0; i < Math.min(months, 12); i++) {
        let interestPart = 0;
        let principalPart = 0;
        if (isZeroRate) { principalPart = monthly; }
        else {
          interestPart = Math.round(balance * monthlyRate);
          principalPart = monthly - interestPart;
        }
        balance = Math.max(0, balance - principalPart);
        rows.push({ month: i + 1, emi: monthly, principal: principalPart, interest: interestPart, cumulative: dp + monthly * (i + 1), remaining: balance });
      }
      return rows;
    })();

    return { tp, dp, dc, effectivePrice, principal, monthly, totalEmiPaid, totalCost, totalInterest, isZeroRate, monthlyRate, annualRate, rateVal, schedule };
  }, [totalPrice, downPayment, discount, months, rateInput, rateMode]);

  const newOrderParams = new URLSearchParams({ totalPrice: calc.tp.toString(), downPayment: calc.dp.toString(), discount: calc.dc.toString(), emiMonths: months.toString(), monthlyAmount: calc.monthly.toString() }).toString();
  const equivalentHint = calc.isZeroRate ? "0% — shop is offering interest-free EMI" : rateMode === "monthly" ? `${calc.rateVal}% monthly = ${calc.annualRate.toFixed(2)}% yearly` : `${calc.rateVal}% yearly = ${(calc.monthlyRate * 100).toFixed(2)}% monthly`;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Calculator className="h-4 w-4 text-primary" />Enter Details</CardTitle>
            <CardDescription>Fill in the purchase details to calculate EMI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <CurrencyInput label="Total Price" value={totalPrice} onChange={setTotalPrice} hint="The full price of the product" />
            <CurrencyInput label="Down Payment" value={downPayment} onChange={setDownPayment} max={calc.tp} hint="Amount paid upfront (optional)" />
            <CurrencyInput label="Discount" value={discount} onChange={setDiscount} max={calc.tp} hint="Any discount on the total price (optional)" />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Interest Rate</Label>
                {calc.isZeroRate ? (
                  <Badge variant="outline" className="border-green-500 text-green-600 text-xs">0% EMI</Badge>
                ) : (
                  <Badge variant="outline" className="border-orange-400 text-orange-600 text-xs">{calc.rateVal}% {rateMode === "monthly" ? "per month" : "per year"}</Badge>
                )}
              </div>
              <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                {(["monthly", "yearly"] as RateMode[]).map((m) => (
                  <button key={m} type="button" onClick={() => setRateMode(m)} className={`flex-1 py-1.5 font-medium transition-colors ${rateMode === m ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                    {m === "monthly" ? "Monthly (%)" : "Yearly (%)"}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Input type="number" min={0} max={rateMode === "monthly" ? 20 : 100} step={0.5} value={rateInput} onChange={(e) => setRateInput(e.target.value)} className="pr-8" placeholder="0" />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">{equivalentHint}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">EMI Duration</Label>
                <span className="text-sm font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">{months} month{months !== 1 ? "s" : ""}</span>
              </div>
              <Slider min={1} max={36} step={1} value={[months]} onValueChange={([v]) => setMonths(v)} className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>1 mo</span><span>6</span><span>12</span><span>18</span><span>24</span><span>36 mo</span></div>
            </div>

            <Link href={`/emi-orders/new?${newOrderParams}`}>
              <Button className="w-full gap-2 mt-2" disabled={calc.monthly === 0}>
                <PlusCircle className="h-4 w-4" />Add as EMI Order<ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className={calc.isZeroRate ? "border-primary/20 bg-primary/5" : "bg-orange-500/5 border-orange-400/20"}>
            <CardContent className="pt-6 pb-4">
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground mb-1">Monthly Installment</p>
                <p className={`text-5xl font-extrabold ${calc.isZeroRate ? "text-primary" : "text-orange-600"}`}>{formatCurrency(calc.monthly)}</p>
                <p className="text-sm text-muted-foreground mt-1">per month × {months} months</p>
              </div>
              {!calc.isZeroRate && calc.totalInterest > 0 && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-orange-600 bg-orange-100/50 rounded-lg py-1.5 px-3">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  <span>Extra interest: <strong>{formatCurrency(calc.totalInterest)}</strong> ({rateMode === "monthly" ? `${calc.rateVal}%/mo` : `${calc.rateVal}%/yr`})</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-0.5">
              <Row label="Total Price" value={formatCurrency(calc.tp)} />
              {calc.dc > 0 && <Row label="− Discount" value={`− ${formatCurrency(calc.dc)}`} />}
              <Row label="Effective Price" value={formatCurrency(calc.effectivePrice)} />
              {calc.dp > 0 && <Row label="− Down Payment" value={`− ${formatCurrency(calc.dp)}`} />}
              <Row label="Principal (EMI Amount)" value={formatCurrency(calc.principal)} />
              <Separator className="my-2" />
              {!calc.isZeroRate && <Row label={`+ Interest (${rateMode === "monthly" ? `${calc.rateVal}% × ${months} mo` : `${calc.rateVal}% p.a.`})`} value={`+ ${formatCurrency(calc.totalInterest)}`} warn />}
              <Row label={`${formatCurrency(calc.monthly)} × ${months} months`} value={formatCurrency(calc.totalEmiPaid)} />
              <Row label="Total Cost (incl. down payment)" value={formatCurrency(calc.totalCost)} highlight />
            </CardContent>
          </Card>
        </div>
      </div>

      {calc.monthly > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Payment Schedule {months > 12 && <span className="text-sm font-normal text-muted-foreground ml-2">(first 12 months shown)</span>}</CardTitle>
            <CardDescription>{calc.isZeroRate ? "Month-by-month installment breakdown" : "Amortization schedule — interest + principal breakdown per month"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Month</th>
                    <th className="text-right py-2 pr-3 font-medium text-muted-foreground">EMI</th>
                    {!calc.isZeroRate && (<><th className="text-right py-2 pr-3 font-medium text-muted-foreground">Principal</th><th className="text-right py-2 pr-3 font-medium text-orange-500">Interest</th></>)}
                    <th className="text-right py-2 pr-3 font-medium text-muted-foreground">Total Paid</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.schedule.map((row) => (
                    <tr key={row.month} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 pr-3 font-medium">Month {row.month}</td>
                      <td className="py-2 pr-3 text-right font-semibold text-primary">{formatCurrency(row.emi)}</td>
                      {!calc.isZeroRate && (<><td className="py-2 pr-3 text-right">{formatCurrency(row.principal)}</td><td className="py-2 pr-3 text-right text-orange-600">{formatCurrency(row.interest)}</td></>)}
                      <td className="py-2 pr-3 text-right">{formatCurrency(row.cumulative)}</td>
                      <td className="py-2 text-right"><span className={row.remaining === 0 ? "text-green-600 font-semibold" : ""}>{row.remaining === 0 ? "✓ Paid off" : formatCurrency(row.remaining)}</span></td>
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

// ─── Early Payoff Calculator ──────────────────────────────────────────────────

function EarlyPayoffTab() {
  const { data: orders } = useListEmiOrders({});
  const [selectedOrderId, setSelectedOrderId] = useState<string>("manual");
  const [remainingBalance, setRemainingBalance] = useState("30000");
  const [monthsRemaining, setMonthsRemaining] = useState("12");
  const [targetMonths, setTargetMonths] = useState(6);

  const activeOrders = useMemo(() =>
    (orders ?? []).filter((o: any) => o.status !== "completed"),
    [orders]
  );

  function handleOrderSelect(val: string) {
    setSelectedOrderId(val);
    if (val === "manual") return;
    const order = activeOrders.find((o: any) => String(o.id) === val);
    if (!order) return;
    const remaining = Math.max(0, (order.effectivePrice ?? order.totalPrice) - order.downPayment - (order.paidAmount ?? 0));
    const monthsLeft = order.remainingInstallments ?? order.numberOfInstallments;
    setRemainingBalance(String(Math.round(remaining)));
    setMonthsRemaining(String(monthsLeft));
    setTargetMonths(Math.max(1, Math.floor(monthsLeft / 2)));
  }

  const calc = useMemo(() => {
    const balance = parseNum(remainingBalance);
    const mRemaining = Math.max(1, Math.round(parseNum(monthsRemaining)));
    const mTarget = Math.max(1, Math.min(targetMonths, mRemaining));

    if (balance <= 0 || mRemaining <= 0) return null;

    const originalMonthly = Math.ceil(balance / mRemaining);
    const newMonthly = Math.ceil(balance / mTarget);
    const monthsSaved = mRemaining - mTarget;
    const extraPerMonth = newMonthly - originalMonthly;

    // Month-by-month table
    const schedule = [];
    let bal = balance;
    for (let i = 1; i <= mTarget; i++) {
      const payment = i < mTarget ? newMonthly : bal;
      bal = Math.max(0, bal - newMonthly);
      schedule.push({ month: i, payment: Math.round(Math.min(newMonthly, payment + (i === mTarget ? Math.max(0, bal) : 0))), remaining: bal });
    }

    return { balance, mRemaining, mTarget, monthsSaved, originalMonthly, newMonthly, extraPerMonth };
  }, [remainingBalance, monthsRemaining, targetMonths]);

  const maxTarget = Math.max(1, Math.round(parseNum(monthsRemaining)));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Zap className="h-4 w-4 text-primary" />Early Payoff Details</CardTitle>
            <CardDescription>আগে EMI শেষ করতে চাইলে প্রতি মাসে কত দিতে হবে calculate করুন।</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Auto-fill from order */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Active EMI থেকে auto-fill (optional)</Label>
              <Select value={selectedOrderId} onValueChange={handleOrderSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an order…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">— Manual input —</SelectItem>
                  {activeOrders.map((o: any) => (
                    <SelectItem key={o.id} value={String(o.id)}>
                      {o.productName} · {o.shopName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Select করলে remaining balance ও months auto-fill হবে।</p>
            </div>

            <Separator />

            <CurrencyInput
              label="Remaining Balance"
              value={remainingBalance}
              onChange={setRemainingBalance}
              hint="এখনো কত টাকা বাকি আছে"
            />

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Months Remaining (original)</Label>
              <Input
                type="number"
                min={1}
                max={120}
                value={monthsRemaining}
                onChange={(e) => {
                  setMonthsRemaining(e.target.value);
                  const v = Math.max(1, parseInt(e.target.value) || 1);
                  setTargetMonths(Math.min(targetMonths, v));
                }}
                placeholder="12"
              />
              <p className="text-xs text-muted-foreground">আসল plan অনুযায়ী আর কত মাস ছিল</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Pay off in</Label>
                <span className="text-sm font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                  {targetMonths} month{targetMonths !== 1 ? "s" : ""}
                </span>
              </div>
              <Slider
                min={1}
                max={maxTarget}
                step={1}
                value={[Math.min(targetMonths, maxTarget)]}
                onValueChange={([v]) => setTargetMonths(v)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 mo (fastest)</span>
                <span>{maxTarget} mo (original)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Result */}
        <div className="space-y-4">
          {calc ? (
            <>
              {/* New monthly */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6 pb-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">New Monthly Payment</p>
                  <p className="text-5xl font-extrabold text-primary">{formatCurrency(calc.newMonthly)}</p>
                  <p className="text-sm text-muted-foreground mt-1">per month × {calc.mTarget} months</p>
                  {calc.extraPerMonth > 0 && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-orange-600 bg-orange-100/50 rounded-lg py-1.5 px-3 mt-3">
                      <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                      <span>Extra <strong>{formatCurrency(calc.extraPerMonth)}/month</strong> vs original plan</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Savings */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Comparison</CardTitle></CardHeader>
                <CardContent className="space-y-0.5">
                  <Row label="Remaining Balance" value={formatCurrency(calc.balance)} />
                  <Separator className="my-2" />
                  <Row label="Original plan" value={`${formatCurrency(calc.originalMonthly)}/mo × ${calc.mRemaining} mo`} />
                  <Row label="Early payoff plan" value={`${formatCurrency(calc.newMonthly)}/mo × ${calc.mTarget} mo`} highlight />
                  <Separator className="my-2" />
                  <Row
                    label="⏱ Months saved"
                    value={calc.monthsSaved > 0 ? `${calc.monthsSaved} month${calc.monthsSaved !== 1 ? "s" : ""} earlier` : "Same timeline"}
                    positive={calc.monthsSaved > 0}
                  />
                  <Row
                    label="💸 Extra per month"
                    value={calc.extraPerMonth > 0 ? `+${formatCurrency(calc.extraPerMonth)}` : "Same"}
                    warn={calc.extraPerMonth > 0}
                  />
                </CardContent>
              </Card>

              {/* Summary badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 p-4 text-center">
                  <CalendarCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Finish in</p>
                  <p className="font-bold text-green-700 dark:text-green-400 text-lg">{calc.mTarget} months</p>
                </div>
                <div className="rounded-xl border bg-primary/5 border-primary/20 p-4 text-center">
                  <TrendingDown className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Saved</p>
                  <p className="font-bold text-primary text-lg">{calc.monthsSaved} mo{calc.monthsSaved !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Zap className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>Remaining balance ও months দিলে result দেখাবে।</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Month-by-month schedule */}
      {calc && calc.mTarget <= 36 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Month-by-Month Schedule
            </CardTitle>
            <CardDescription>প্রতি মাসে কত দিতে হবে এবং কত বাকি থাকবে।</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Month</th>
                    <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Payment</th>
                    <th className="text-right py-2 font-medium text-muted-foreground">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: calc.mTarget }, (_, i) => {
                    const month = i + 1;
                    const bal = Math.max(0, calc.balance - calc.newMonthly * month);
                    const payment = month < calc.mTarget ? calc.newMonthly : calc.balance - calc.newMonthly * (calc.mTarget - 1);
                    return (
                      <tr key={month} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2 pr-4 font-medium">Month {month}</td>
                        <td className="py-2 pr-4 text-right font-semibold text-primary">{formatCurrency(Math.max(0, payment))}</td>
                        <td className="py-2 text-right">
                          {bal <= 0
                            ? <span className="text-green-600 font-semibold">✓ Paid off</span>
                            : formatCurrency(bal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const [tab, setTab] = useState<Tab>("emi");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">EMI Calculator</h2>
        <p className="text-muted-foreground mt-1">EMI plan করুন বা আগে শেষ করার option দেখুন।</p>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl border border-border overflow-hidden w-fit">
        <button
          type="button"
          onClick={() => setTab("emi")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${tab === "emi" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
        >
          <Calculator className="h-4 w-4" /> EMI Calculator
        </button>
        <button
          type="button"
          onClick={() => setTab("payoff")}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${tab === "payoff" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
        >
          <Zap className="h-4 w-4" /> Early Payoff
        </button>
      </div>

      {tab === "emi" ? <EmiCalculatorTab /> : <EarlyPayoffTab />}
    </div>
  );
}
