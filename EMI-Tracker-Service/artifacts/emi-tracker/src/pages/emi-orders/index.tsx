import { useState } from "react";
import { useListEmiOrders, getListEmiOrdersQueryKey, useListShops, getListShopsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Search, Store, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

function getDueDateColor(nextDueDate: string | null | undefined, status: string) {
  if (status === "completed" || !nextDueDate) return "";
  const today = new Date();
  const due = new Date(nextDueDate);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "text-destructive font-bold";
  if (diffDays <= 7) return "text-orange-600 font-semibold";
  return "text-muted-foreground";
}

function getDueBadge(nextDueDate: string | null | undefined, status: string) {
  if (status === "completed") return null;
  if (!nextDueDate) return null;
  const today = new Date();
  const due = new Date(nextDueDate);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return <Badge variant="destructive" className="text-xs">Overdue</Badge>;
  if (diffDays <= 7) return <Badge className="text-xs bg-orange-500 hover:bg-orange-500">Due Soon</Badge>;
  return null;
}

export default function EmiOrders() {
  const [selectedShopId, setSelectedShopId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("active");
  const [search, setSearch] = useState("");

  const queryParams = {
    ...(selectedShopId !== "all" ? { shopId: Number(selectedShopId) } : {}),
    ...(selectedStatus !== "all" ? { status: selectedStatus } : {}),
  };

  const { data: orders, isLoading } = useListEmiOrders(queryParams, { query: { queryKey: getListEmiOrdersQueryKey(queryParams) } });
  const { data: shops } = useListShops({ query: { queryKey: getListShopsQueryKey() } });

  const filteredOrders = orders?.filter((o) =>
    o.productName.toLowerCase().includes(search.toLowerCase()) ||
    o.shopName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">আমার EMI</h2>
          <p className="text-muted-foreground mt-1">আমার সকল কিস্তির তালিকা।</p>
        </div>
        <Link href="/emi-orders/new">
          <Button className="shrink-0">
            <Plus className="mr-2 h-4 w-4" /> নতুন EMI
          </Button>
        </Link>
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="পণ্য বা দোকান দিয়ে খুঁজুন..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                <SelectTrigger className="w-[180px] bg-background">
                  <Store className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="সব দোকান" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব দোকান</SelectItem>
                  {shops?.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id.toString()}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px] bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">সব</SelectItem>
                  <SelectItem value="active">চলমান</SelectItem>
                  <SelectItem value="completed">সম্পন্ন</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 flex gap-4 items-center">
                <Skeleton className="h-12 w-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-5 w-24 ml-auto" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredOrders?.length === 0 ? (
          <div className="py-12 text-center border rounded-lg bg-muted/20">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium">কোনো EMI পাওয়া যায়নি</h3>
            <p className="text-muted-foreground text-sm mt-1">প্রথম EMI যোগ করতে উপরের বোতামে ক্লিক করুন।</p>
          </div>
        ) : (
          filteredOrders?.map((order) => (
            <Link key={order.id} href={`/emi-orders/${order.id}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer mb-3 group">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center shrink-0 ${order.status === "completed" ? "bg-green-500/10" : "bg-primary/10"}`}>
                        {order.status === "completed"
                          ? <CheckCircle2 className="h-6 w-6 text-green-600" />
                          : <FileText className="h-6 w-6 text-primary" />}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-lg leading-none">{order.productName}</h3>
                          <Badge
                            variant={order.status === "completed" ? "outline" : "default"}
                            className={order.status === "completed" ? "bg-green-500/10 text-green-700 border-green-500/20" : ""}
                          >
                            {order.status === "completed" ? "সম্পন্ন" : "চলমান"}
                          </Badge>
                          {getDueBadge(order.nextDueDate, order.status)}
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Store className="h-3 w-3" /> {order.shopName}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> কেনা: {formatDate(order.purchaseDate)}
                          </span>
                          <span>{order.emiMonths} মাস • {formatCurrency(order.monthlyAmount)}/মাস</span>
                          <span>
                            {order.installmentsPaid ?? 0}/{order.emiMonths} কিস্তি দেওয়া
                          </span>
                        </div>
                        {order.status === "active" && order.nextDueDate && (
                          <div className={`flex items-center gap-1 text-xs pt-1 ${getDueDateColor(order.nextDueDate, order.status)}`}>
                            <AlertCircle className="h-3 w-3" />
                            পরবর্তী কিস্তি: {formatDate(order.nextDueDate)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-4 sm:gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 mt-1 sm:mt-0 min-w-[160px]">
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-muted-foreground">মোট দাম</p>
                        <p className="font-bold text-base">{formatCurrency(order.totalPrice)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">বাকি আছে</p>
                        <p className={`font-bold text-lg ${(order.remainingAmount ?? 0) > 0 ? "text-destructive" : "text-green-600"}`}>
                          {formatCurrency(order.remainingAmount ?? 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
