import { useState } from "react";
import { useListProducts, getListProductsQueryKey, useCreateProduct, useListShops, getListShopsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Search, Store } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export default function Products() {
  const [selectedShopId, setSelectedShopId] = useState<string>("all");
  
  const { data: products, isLoading } = useListProducts(
    selectedShopId !== "all" ? { shopId: Number(selectedShopId) } : undefined,
    { query: { queryKey: getListProductsQueryKey(selectedShopId !== "all" ? { shopId: Number(selectedShopId) } : {}) } }
  );
  const { data: shops } = useListShops({ query: { queryKey: getListShopsQueryKey() } });
  
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createProduct = useCreateProduct();

  const [formData, setFormData] = useState({ name: "", shopId: "", price: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.shopId) return;
    
    createProduct.mutate({ 
      data: {
        name: formData.name,
        shopId: Number(formData.shopId),
        price: formData.price ? Number(formData.price) : null
      } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        setOpen(false);
        setFormData({ name: "", shopId: "", price: "" });
        toast({ title: "Product created successfully" });
      },
      onError: () => {
        toast({ title: "Failed to create product", variant: "destructive" });
      }
    });
  };

  const filteredProducts = products?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Products</h2>
          <p className="text-muted-foreground mt-1">Manage showroom inventory.</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedShopId} onValueChange={setSelectedShopId}>
            <SelectTrigger className="w-[180px]">
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

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search products..." 
              className="pl-9 w-[200px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shrink-0"><Plus className="mr-2 h-4 w-4" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name <span className="text-destructive">*</span></Label>
                  <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Samsung 43 inch TV" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopId">Shop <span className="text-destructive">*</span></Label>
                  <Select value={formData.shopId} onValueChange={val => setFormData({...formData, shopId: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a shop" />
                    </SelectTrigger>
                    <SelectContent>
                      {shops?.map(shop => (
                        <SelectItem key={shop.id} value={shop.id.toString()}>{shop.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Base Price</Label>
                  <Input id="price" type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="e.g. 45000" />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createProduct.isPending}>
                    {createProduct.isPending ? "Saving..." : "Save Product"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-1/3 mt-2" />
              </CardContent>
            </Card>
          ))
        ) : filteredProducts?.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-lg bg-muted/20">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium">No products found</h3>
            <p className="text-muted-foreground text-sm mt-1">Add your first product to inventory.</p>
          </div>
        ) : (
          filteredProducts?.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-base leading-tight">{product.name}</h3>
                  </div>
                  <Badge variant="secondary" className="mt-2 font-normal text-xs">{product.shopName}</Badge>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Base Price</p>
                  <p className="font-bold text-lg text-primary">
                    {product.price ? formatCurrency(product.price) : "Not set"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
