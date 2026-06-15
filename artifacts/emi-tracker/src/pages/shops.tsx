import { useState } from "react";
import { useListShops, getListShopsQueryKey, useCreateShop, useDeleteShop } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Store, Plus, MapPin, Phone, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Shops() {
  const { data: shops, isLoading } = useListShops({ query: { queryKey: getListShopsQueryKey() } });
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createShop = useCreateShop();
  const deleteShop = useDeleteShop();

  const [formData, setFormData] = useState({ name: "", phone: "", address: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    createShop.mutate({ data: formData }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
        setOpen(false);
        setFormData({ name: "", phone: "", address: "" });
        toast({ title: "Shop created successfully" });
      },
      onError: () => {
        toast({ title: "Failed to create shop", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this shop?")) return;
    deleteShop.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
        toast({ title: "Shop deleted" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Shops</h2>
          <p className="text-muted-foreground mt-1">Manage your showroom locations.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0"><Plus className="mr-2 h-4 w-4" /> Add Shop</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Shop</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Shop Name <span className="text-destructive">*</span></Label>
                <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Main Branch" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="e.g. 01700000000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Full address" />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createShop.isPending}>
                  {createShop.isPending ? "Saving..." : "Save Shop"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : shops?.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-lg bg-muted/20">
            <Store className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium">No shops found</h3>
            <p className="text-muted-foreground text-sm mt-1">Add your first shop to start tracking.</p>
          </div>
        ) : (
          shops?.map((shop) => (
            <Card key={shop.id} className="overflow-hidden group">
              <CardHeader className="bg-muted/30 pb-4 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-md">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{shop.name}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(shop.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{shop.phone || "No phone added"}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{shop.address || "No address added"}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
