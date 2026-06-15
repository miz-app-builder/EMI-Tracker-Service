import { useState } from "react";
import { useListShops, getListShopsQueryKey, useCreateShop, useDeleteShop } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Store, Plus, MapPin, Phone, Trash2, User2, Mail, Globe, GitBranch } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const emptyForm = {
  name: "",
  branch: "",
  phone: "",
  email: "",
  address: "",
  website: "",
  contactPerson: "",
};

export default function Shops() {
  const { data: shops, isLoading } = useListShops({ query: { queryKey: getListShopsQueryKey() } });
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createShop = useCreateShop();
  const deleteShop = useDeleteShop();

  const [formData, setFormData] = useState(emptyForm);
  const set = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    createShop.mutate(
      {
        data: {
          name: formData.name,
          branch: formData.branch || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          website: formData.website || null,
          contactPerson: formData.contactPerson || null,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
          setOpen(false);
          setFormData(emptyForm);
          toast({ title: "দোকান যোগ হয়েছে!" });
        },
        onError: () => {
          toast({ title: "দোকান যোগ ব্যর্থ হয়েছে", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (!confirm("এই দোকানটি মুছে ফেলবেন? এর সাথে সংযুক্ত সব EMI ডেটা থেকে যাবে।")) return;
    deleteShop.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListShopsQueryKey() });
          toast({ title: "দোকান মুছে ফেলা হয়েছে" });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">দোকান / শোরুম</h2>
          <p className="text-muted-foreground mt-1">আপনার দোকান ও শোরুমের তথ্য পরিচালনা করুন।</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="mr-2 h-4 w-4" /> নতুন দোকান যোগ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>নতুন দোকান / শোরুম যোগ করুন</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="name">দোকানের নাম <span className="text-destructive">*</span></Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={set("name")}
                    placeholder="যেমন: ওয়ালটন প্লাজা"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch">শাখার নাম</Label>
                  <Input
                    id="branch"
                    value={formData.branch}
                    onChange={set("branch")}
                    placeholder="যেমন: ধানমন্ডি শাখা"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPerson">ম্যানেজার / সেলস পার্সন</Label>
                  <Input
                    id="contactPerson"
                    value={formData.contactPerson}
                    onChange={set("contactPerson")}
                    placeholder="যোগাযোগের ব্যক্তির নাম"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">ফোন নম্বর</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={set("phone")}
                    placeholder="যেমন: 01700000000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">ইমেইল</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={set("email")}
                    placeholder="যেমন: info@shop.com"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">ঠিকানা</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={set("address")}
                    placeholder="সম্পূর্ণ ঠিকানা"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="website">ওয়েবসাইট / Facebook পেজ</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={set("website")}
                    placeholder="যেমন: https://facebook.com/waltonplaza"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={createShop.isPending}>
                  {createShop.isPending ? "সেভ হচ্ছে..." : "দোকান সেভ করুন"}
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
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))
        ) : shops?.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-lg bg-muted/20">
            <Store className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-medium">কোনো দোকান নেই</h3>
            <p className="text-muted-foreground text-sm mt-1">প্রথম দোকানটি যোগ করুন EMI ট্র্যাক শুরু করতে।</p>
          </div>
        ) : (
          shops?.map((shop) => (
            <Card key={shop.id} className="overflow-hidden group hover:shadow-md transition-shadow">
              <CardHeader className="bg-muted/30 pb-4 border-b">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-md shrink-0 mt-0.5">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg leading-tight">{shop.name}</CardTitle>
                      {shop.branch && (
                        <div className="mt-1.5">
                          <Badge variant="secondary" className="text-xs font-normal gap-1">
                            <GitBranch className="h-3 w-3" />
                            {shop.branch}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => handleDelete(shop.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
                  <p className="text-xs text-muted-foreground italic">কোনো বিস্তারিত তথ্য নেই</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
