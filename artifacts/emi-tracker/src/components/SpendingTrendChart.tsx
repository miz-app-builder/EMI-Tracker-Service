import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useGetMonthlySpending, getGetMonthlySpendingQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";

function formatAmount(value: number) {
  if (value >= 100000) return `৳${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `৳${(value / 1000).toFixed(1)}K`;
  return `৳${value}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p className="text-primary font-bold">
        ৳{Number(payload[0].value).toLocaleString("en-IN")}
      </p>
    </div>
  );
}

export function SpendingTrendChart() {
  const { data, isLoading } = useGetMonthlySpending({
    query: { queryKey: getGetMonthlySpendingQueryKey() },
  });

  const hasData = data && data.some((d) => d.totalPaid > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Monthly Spending Trend</CardTitle>
          <CardDescription className="text-xs mt-0.5">EMI payments made over the last 12 months</CardDescription>
        </div>
        <TrendingUp className="h-4 w-4 text-primary opacity-70" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[180px] w-full" />
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground gap-2">
            <TrendingUp className="h-8 w-8 opacity-20" />
            <p className="text-sm">No payment data yet</p>
            <p className="text-xs opacity-70">Payments will appear here once recorded</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={formatAmount}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area
                type="monotone"
                dataKey="totalPaid"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#spendingGradient)"
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
