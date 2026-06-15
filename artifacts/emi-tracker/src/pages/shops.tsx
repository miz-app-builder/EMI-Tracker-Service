import { useState } from "react";
import { useListShops, getListShopsQueryKey, useCreateShop, useUpdateShop, useDeleteShop } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Store, Plus, MapPin, Phone, Trash2, User2, Mail, Globe, Pencil, Building2, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Shop } from "@workspace/api-client-react";

function shopFaviconUrl(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch {
    return null;
  }
}

const emptyForm = {
  name: "",
  branch: "",
  phone: "",
  email: "",
  address: "",
  website: "",
  contactPerson: "",
};

type FormData = typeof emptyForm;

function shopToForm(shop: Shop): FormData {
  return {
    name: shop.name ?? "",
    branch: shop.branch ?? "",
    phone: shop.phone ?? "",
    email: shop.email ?? "",
    address: shop.address ?? "",
    website: shop.website ?? "",
    contactPerson: shop.contactPerson ?? "",
  };
}

function ShopForm({
  formData,
  setFormData,
  onSubmit,
  isPending,
  submitLabel,
}: {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((p) => ({ ...p, [key]: e.target.value }));

  return (
    <form onSubmit={onSubmit} className="space-y-5 pt-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Shop Name <span className="text-destructive">*</span></Label>
          <Input id="name" value={formData.name} onChange={set("name")} placeholder="e.g. Walton Plaza" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="branch">Branch Name</Label>
          <Input id="branch" value={formData.branch} onChange={set("branch")} placeholder="e.g. Dhanmondi Branch" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPerson">Manager / Sales Person</Label>
          <Input id="contactPerson" value={formData.contactPerson} onChange={set("contactPerson")} placeholder="Contact person name" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input id="phone" value={formData.phone} onChange={set("phone")} placeholder="e.g. 01700000000" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={formData.email} onChange={set("email")} placeholder="e.g. info@shop.com" />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" value={formData.address} onChange={set("address")} placeholder="Full address" />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="website">Website / Facebook Page</Label>
          <Input id="website" value={formData.website} onChange={set("website")} placeholder="e.g. https://facebook.com/waltonplaza" />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export default function Shops() {
  const { data: shops, isLoading } = useListShops({ query: { queryKey: getListShopsQueryKey() } });
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editShop, setEditShop] = useState<Shop | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createShop = useCreateShop();
  const updateShop = useUpdateShop();
  const deleteShop = useDeleteShop();

  const [addForm, setAddForm] = useState<FormData>(emptyForm);
  const [editForm, setEditForm] = useState<FormData>(emptyForm);

  const openEdit = (shop: Shop) => {
    setEditShop(shop);
    setEditForm(shopToForm(shop));
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name) return;
    createShop.mutate(
      {
        data: {
          name: addForm.name,
          branch: addForm.branch || null,
          phone: addForm.phone || null,
          email: addForm.email || null,
          address: addForm.address || null,
          website: addForm.website || null,
          contactPerson: addForm.contactPerson || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
          setAddOpen(false);
          setAddForm(emptyForm);
          toast({ title: "Shop added successfully!" });
        },
        onError: () => {
          toast({ title: "Failed to add shop", variant: "destructive" });
        },
      }
    );
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editShop || !editForm.name) return;
    updateShop.mutate(
      {
        id: editShop.id,
        data: {
          name: editForm.name,
          branch: editForm.branch || null,
          phone: editForm.phone || null,
          email: editForm.email || null,
          address: editForm.address || null,
          website: editForm.website || null,
          contactPerson: editForm.contactPerson || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
          setEditShop(null);
          toast({ title: "Shop updated successfully!" });
        },
        onError: () => {
          toast({ title: "Failed to update shop", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this shop? All associated EMI data will remain.")) return;
    deleteShop.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
          toast({ title: "Shop deleted" });
        },
      }
    );
  };

  const filteredShops = shops?.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.branch?.toLowerCase().includes(q) ||
      s.contactPerson?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shops..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="mr-2 h-4 w-4" /> Add Shop
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Shop / Showroom</DialogTitle>
            </DialogHeader>
            <ShopForm
              formData={addForm}
              setFormData={setAddForm}
              onSubmit={handleAdd}
              isPending={createShop.isPending}
              submitLabel="Save Shop"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editShop} onOpenChange={(open) => { if (!open) setEditShop(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Shop</DialogTitle>
          </DialogHeader>
          <ShopForm
            formData={editForm}
            setFormData={setEditForm}
            onSubmit={handleEdit}
            isPending={updateShop.isPending}
            submitLabel="Update"
          />
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 space-y-4">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : filteredShops?.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-lg bg-muted/20">
            <Store className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium">No shops yet</h3>
            <p className="text-muted-foreground text-sm mt-1">Add your first shop to start tracking EMIs.</p>
          </div>
        ) : (
          filteredShops?.map((shop) => (
            <Card key={shop.id} className="overflow-hidden group hover:shadow-md transition-shadow">
              <CardHeader className="bg-muted/30 pb-4 border-b">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-md shrink-0 mt-0.5 flex items-center justify-center w-10 h-10">
                      {shopFaviconUrl(shop.website) ? (
                        <img
                          src={shopFaviconUrl(shop.website)!}
                          alt={shop.name}
                          className="w-6 h-6 object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                            (e.currentTarget.nextSibling as HTMLElement).style.display = "block";
                          }}
                        />
                      ) : null}
                      <Store
                        className="h-5 w-5 text-primary"
                        style={{ display: shopFaviconUrl(shop.website) ? "none" : "block" }}
                      />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg leading-tight">{shop.name}</CardTitle>
                      {shop.branch && (
                        <div className="mt-1.5">
                          <Badge variant="secondary" className="text-xs font-normal gap-1">
                            <Building2 className="h-3 w-3" />
                            {shop.branch}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => openEdit(shop)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(shop.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-2.5">
                {shop.contactPerson && (
                  <div className="flex items-center gap-2 text-sm">
                    <User2 className="h-4 w-4 shrink-0 text-primary/80" />
                    <span className="font-medium text-foreground">{shop.contactPerson}</span>
                  </div>
                )}

                {shop.contactPerson && (shop.phone || shop.email || shop.address || shop.website) && (
                  <Separator className="my-1" />
                )}

                {shop.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{shop.phone}</span>
                  </div>
                )}
                {shop.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{shop.email}</span>
                  </div>
                )}
                {shop.address && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{shop.address}</span>
                  </div>
                )}
                {shop.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <a
                      href={shop.website.startsWith("http") ? shop.website : `https://${shop.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-primary hover:underline text-sm"
                    >
                      {shop.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}

                {!shop.phone && !shop.email && !shop.address && !shop.website && !shop.contactPerson && (
                  <p className="text-xs text-muted-foreground italic">No details added</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
