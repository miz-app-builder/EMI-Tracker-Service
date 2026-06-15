import { useState } from "react";
import { useListEmiOrders, getListEmiOrdersQueryKey, useListShops, getListShopsQueryKey, useUpdateEmiOrder } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Search, Store, Calendar, CheckCircle2, Circle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function EmiOrders() {
  const [selectedShopId, setSelectedShopId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  
  const queryParams = {
    ...(selectedShopId !== "all" ? { shopId: Number(selectedShopId) } : {}),
    ...(selectedStatus !== "all" ? { status: selectedStatus } : {})
  };
  
  const { data: orders, isLoading } = useListEmiOrders({ query: { queryKey: getListEmiOrdersQueryKey(queryParams) } });
  const { data: shops } = useListShops({ query: { queryKey: getListShopsQueryKey() } });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const updateOrder = useUpdateEmiOrder();

  const handleStatusToggle = (e: React.MouseEvent, id: number, currentStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newStatus = currentStatus === "active" ? "completed" : "active";
    updateOrder.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListEmiOrdersQueryKey() });
        toast({ title: `Order marked as ${newStatus}` });
      }
    });
  };

  const filteredOrders = orders?.filter(o => 
    o.customerName?.toLowerCase().includes(search.toLowerCase()) || 
    o.productName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">EMI Orders</h2>
          <p className="text-muted-foreground mt-1">Manage active and completed installment plans.</p>
        </div>
        
        <Link href="/emi-orders/new">
          <Button className="shrink-0"><Plus className="mr-2 h-4 w-4" /> New Order</Button>
        </Link>
      </div>

      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by customer or product..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedShopId} onValueChange={setSelectedShopId}>
                <SelectTrigger className="w-[180px] bg-background">
                  <Store className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Shops" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Shops</SelectItem>
                  {shops?.map(shop => (
                    <SelectItem key={shop.id} value={shop.id.toString()}>{shop.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[150px] bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 flex gap-4 items-center">
                <Skeleton className="h-12 w-12 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-5 w-20 ml-auto" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : filteredOrders?.length === 0 ? (
          <div className="py-12 text-center border rounded-lg bg-muted/20">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium">No EMI orders found</h3>
            <p className="text-muted-foreground text-sm mt-1">Create your first order to start tracking installments.</p>
          </div>
        ) : (
          filteredOrders?.map((order) => (
            <Link key={order.id} href={`/emi-orders/${order.id}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer mb-3 group">
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground shrink-0 mt-1 sm:mt-0">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-lg leading-none">{order.customerName}</h3>
                        <Badge variant={order.status === "completed" ? "outline" : "default"} className={order.status === "completed" ? "bg-green-500/10 text-green-700 border-green-500/20" : ""}>
                          {order.status === "completed" ? "Completed" : "Active"}
                        </Badge>
                        <Badge variant="secondary" className="font-normal text-xs">{order.shopName}</Badge>
                      </div>
                      <p className="font-medium text-muted-foreground">{order.productName}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(order.purchaseDate)}</span>
                        <span>{order.emiMonths} months • {formatCurrency(order.monthlyAmount)}/mo</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-4 sm:gap-1 pt-4 sm:pt-0 border-t sm:border-t-0 mt-2 sm:mt-0 min-w-[200px]">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-muted-foreground mb-0.5">Total Value</p>
                      <p className="font-bold text-base">{formatCurrency(order.totalPrice)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-0.5">Remaining</p>
                      <p className={`font-bold text-lg ${order.remainingAmount && order.remainingAmount > 0 ? "text-destructive" : "text-green-600 dark:text-green-500"}`}>
                        {formatCurrency(order.remainingAmount || 0)}
                      </p>
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
