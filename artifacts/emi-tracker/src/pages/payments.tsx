import { useState } from "react";
import { useListEmiPayments, getListEmiPaymentsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export default function Payments() {
  const { data: payments, isLoading } = useListEmiPayments({ query: { queryKey: getListEmiPaymentsQueryKey() } });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">All Payments</h2>
        <p className="text-muted-foreground mt-1">Global ledger of all received installments.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Chronological list of all payments across all shops.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : payments?.length === 0 ? (
            <div className="py-12 text-center border rounded-lg bg-muted/20">
              <CreditCard className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-medium">No payments found</h3>
              <p className="text-muted-foreground text-sm mt-1">Payments will appear here once recorded on EMI orders.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>
                        <Link href={`/emi-orders/${payment.emiOrderId}`}>
                          <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20 transition-colors">
                            #{payment.emiOrderId}
                          </Badge>
                        </Link>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
