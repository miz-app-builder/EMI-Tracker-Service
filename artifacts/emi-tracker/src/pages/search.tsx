import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useListEmiOrders, useListShops } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";
import {
  Search, Store, FileText, X, ArrowRight, AlertCircle, CheckCircle2, Clock,
} from "lucide-react";

function highlight(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") return (
    <Badge variant="outline" className="gap-1 text-green-600 border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-700 dark:text-green-400 text-xs">
      <CheckCircle2 className="h-3 w-3" /> Completed
    </Badge>
  );
  if (status === "overdue") return (
    <Badge variant="destructive" className="gap-1 text-xs">
      <AlertCircle className="h-3 w-3" /> Overdue
    </Badge>
  );
  return (
    <Badge variant="outline" className="gap-1 text-primary border-primary/30 bg-primary/5 text-xs">
      <Clock className="h-3 w-3" /> Active
    </Badge>
  );
}

function getOrderStatus(order: any): string {
  if (order.status === "completed") return "completed";
  if (order.nextDueDate) {
    const due = new Date(order.nextDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (due < today) return "overdue";
  }
  return "active";
}

export default function SearchPage() {
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const { data: orders, isLoading: loadingOrders } = useListEmiOrders({});
  const { data: shops, isLoading: loadingShops } = useListShops({});
  const isLoading = loadingOrders || loadingShops;

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") navigate("/dashboard");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const q = query.trim().toLowerCase();

  const matchedOrders = useMemo(() => {
    if (!q || !orders) return [];
    return orders.filter((o: any) =>
      o.productName?.toLowerCase().includes(q) ||
      o.shopName?.toLowerCase().includes(q) ||
      o.modelNumber?.toLowerCase().includes(q)
    );
  }, [orders, q]);

  const matchedShops = useMemo(() => {
    if (!q || !shops) return [];
    return shops.filter((s: any) =>
      s.name?.toLowerCase().includes(q) ||
      s.description?.toLowerCase().includes(q)
    );
  }, [shops, q]);

  const totalResults = matchedOrders.length + matchedShops.length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Shop, product, model number..."
          className="pl-11 pr-10 h-12 text-base rounded-xl border-border focus-visible:ring-primary/30"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!query && (
        <div className="flex flex-col items-center py-16 text-muted-foreground gap-3">
          <Search className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-base font-medium">কিছু খুঁজুন</p>
          <p className="text-sm text-center max-w-xs">
            Product name, shop name, বা model number লিখুন
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Esc চাপলে ফিরে যাবে
          </p>
        </div>
      )}

      {query && isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      )}

      {query && !isLoading && totalResults === 0 && (
        <div className="flex flex-col items-center py-14 text-muted-foreground gap-3">
          <Search className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-base font-medium">কোনো ফলাফল নেই</p>
          <p className="text-sm">
            "<span className="font-medium text-foreground">{query}</span>" এর জন্য কিছু পাওয়া যায়নি
          </p>
        </div>
      )}

      {query && !isLoading && matchedOrders.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
            <FileText className="h-4 w-4" />
            EMI Orders
            <span className="ml-auto font-normal normal-case tracking-normal text-muted-foreground/70">
              {matchedOrders.length} টি
            </span>
          </div>
          <div className="space-y-1.5">
            {matchedOrders.map((order: any) => {
              const status = getOrderStatus(order);
              return (
                <Link key={order.id} href={`/emi-orders/${order.id}`}>
                  <div className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer group">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {highlight(order.productName ?? "", query)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                        <Store className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{highlight(order.shopName ?? "", query)}</span>
                        {order.modelNumber && (
                          <>
                            <span>·</span>
                            <span className="truncate">{highlight(order.modelNumber, query)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-primary">
                          {formatCurrency(order.remainingAmount ?? 0)}
                        </p>
                        <p className="text-xs text-muted-foreground">বাকি</p>
                      </div>
                      <StatusBadge status={status} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {query && !isLoading && matchedShops.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
            <Store className="h-4 w-4" />
            Shops
            <span className="ml-auto font-normal normal-case tracking-normal text-muted-foreground/70">
              {matchedShops.length} টি
            </span>
          </div>
          <div className="space-y-1.5">
            {matchedShops.map((shop: any) => (
              <Link key={shop.id} href="/shops">
                <div className="flex items-center gap-4 px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer group">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Store className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {highlight(shop.name ?? "", query)}
                    </p>
                    {shop.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {highlight(shop.description, query)}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
