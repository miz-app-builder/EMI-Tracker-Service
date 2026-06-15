import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateEmiOrder, useListShops, getListShopsQueryKey, useListProducts, getListProductsQueryKey, getListEmiOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calculator, CalendarDays, User2, Phone, Mail, Store, MapPin, Globe, Building2, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";

function shopFaviconUrl(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  } catch { return null; }
}

export default function NewEmiOrder() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: shops } = useListShops({ query: { queryKey: getListShopsQueryKey() } });

  const [formData, setFormData] = useState({
    shopId: "",
    productId: "",
    productName: "",
    modelNumber: "",
    warrantyInfo: "",
    customerId: "",
    totalPrice: "",
    discount: "",
    downPayment: "",
    emiMonths: "",
    dueDayOfMonth: "",
    purchaseDate: new Date().toISOString().split("T")[0],
  });

  const { data: products } = useListProducts(
    formData.shopId ? { shopId: Number(formData.shopId) } : undefined,
    { query: { queryKey: getListProductsQueryKey(formData.shopId ? { shopId: Number(formData.shopId) } : {}), enabled: !!formData.shopId } }
  );

  const createOrder = useCreateEmiOrder();

  const selectedShop = shops?.find((s) => s.id.toString() === formData.shopId) ?? null;

  const handleProductSelect = (val: string) => {
    if (val === "custom") {
      setFormData({ ...formData, productId: "", productName: "", totalPrice: "" });
      return;
    }
    const product = products?.find((p) => p.id.toString() === val);
    if (product) {
      setFormData({ ...formData, productId: product.id.toString(), productName: product.name, totalPrice: product.price?.toString() || "" });
    }
  };

  const previewNextDue = () => {
    if (!formData.purchaseDate) return null;
    const d = new Date(formData.purchaseDate);
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
  };

  const discountAmt = Number(formData.discount) || 0;
  const effectivePrice = Math.max(0, (Number(formData.totalPrice) || 0) - discountAmt);
  const principal = Math.max(0, effectivePrice - (Number(formData.downPayment) || 0));
  const months = Number(formData.emiMonths) || 0;
  const autoMonthlyAmount = months > 0 ? Math.ceil(principal / months) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shopId || !formData.productName || !formData.totalPrice || !formData.emiMonths || !formData.purchaseDate) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    createOrder.mutate(
      {
        data: {
          shopId: Number(formData.shopId),
          productId: formData.productId ? Number(formData.productId) : null,
          productName: formData.productName,
          modelNumber: formData.modelNumber || null,
          warrantyInfo: formData.warrantyInfo || null,
          customerId: formData.customerId || null,
          totalPrice: Number(formData.totalPrice),
          discount: discountAmt || 0,
          downPayment: Number(formData.downPayment) || 0,
          emiMonths: Number(formData.emiMonths),
          dueDayOfMonth: formData.dueDayOfMonth ? Number(formData.dueDayOfMonth) : null,
          purchaseDate: formData.purchaseDate,
        },
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListEmiOrdersQueryKey() });
          toast({ title: "EMI order created!" });
          setLocation(`/emi-orders/${data.id}`);
        },
        onError: () => {
          toast({ title: "Failed to create order", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/emi-orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* User info card */}
      {user && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 rounded-lg border bg-muted/30 text-sm">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <User2 className="h-4 w-4 text-primary shrink-0" />
            <span>{user.name || "—"}</span>
          </div>
          {user.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{user.phone}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0" />
            <span>{user.email}</span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="bg-muted/20 border-b">
          <CardTitle>EMI Details</CardTitle>
          <CardDescription>Enter shop, product, and installment information.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Shop selector */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="shopId">Shop / Showroom <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.shopId}
                  onValueChange={(val) => setFormData({ ...formData, shopId: val, productId: "", productName: "", customerId: "" })}
                >
                  <SelectTrigger className="max-w-sm">
                    <SelectValue placeholder="Select a shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops?.map((s) => (
                      <SelectItem key={s.id} value={s.id.toString()}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">If the shop is not listed, add it from the Shops page first.</p>
              </div>

              {/* Shop preview */}
              {selectedShop && (
                <div className="rounded-lg border bg-muted/20 p-4 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-md shrink-0">
                      {shopFaviconUrl(selectedShop.website) ? (
                        <img
                          src={shopFaviconUrl(selectedShop.website)!}
                          alt={selectedShop.name}
                          className="w-5 h-5 object-contain"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <Store className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground leading-tight">{selectedShop.name}</p>
                      {selectedShop.branch && (
                        <Badge variant="secondary" className="text-xs font-normal gap-1 mt-0.5">
                          <Building2 className="h-3 w-3" />{selectedShop.branch}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-muted-foreground pl-1">
                    {selectedShop.contactPerson && (
                      <div className="flex items-center gap-2">
                        <User2 className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                        <span className="font-medium text-foreground">{selectedShop.contactPerson}</span>
                      </div>
                    )}
                    {selectedShop.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{selectedShop.phone}</span>
                      </div>
                    )}
                    {selectedShop.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{selectedShop.email}</span>
                      </div>
                    )}
                    {selectedShop.address && (
                      <div className="flex items-start gap-2 sm:col-span-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{selectedShop.address}</span>
                      </div>
                    )}
                    {selectedShop.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 shrink-0" />
                        <a
                          href={selectedShop.website.startsWith("http") ? selectedShop.website : `https://${selectedShop.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline truncate"
                        >
                          {selectedShop.website.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer ID — shown after shop is selected */}
              {selectedShop && (
                <div className="space-y-2">
                  <Label htmlFor="customerId" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary/70" />
                    Customer ID (assigned by shop, optional)
                  </Label>
                  <Input
                    id="customerId"
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    placeholder="e.g. CUST-00123"
                    className="max-w-sm"
                  />
                  <p className="text-xs text-muted-foreground">Enter the Customer ID the shop assigned to you.</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Product */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" /> Product & Price
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
                {formData.shopId && products && products.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select existing product (optional)</Label>
                    <Select
                      value={formData.productId || (formData.productName ? "custom" : "")}
                      onValueChange={handleProductSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a product or enter below" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">-- New Product --</SelectItem>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="productName">Product Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="productName"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="e.g. LG AC 1.5 Ton"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="modelNumber">Model Number (optional)</Label>
                  <Input
                    id="modelNumber"
                    value={formData.modelNumber}
                    onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                    placeholder="e.g. LG-A18LFNZAA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warrantyInfo">Guarantee / Warranty (optional)</Label>
                  <Input
                    id="warrantyInfo"
                    value={formData.warrantyInfo}
                    onChange={(e) => setFormData({ ...formData, warrantyInfo: e.target.value })}
                    placeholder="e.g. 2 year compressor warranty"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="totalPrice">Total Price (BDT) <span className="text-destructive">*</span></Label>
                  <Input id="totalPrice" type="number" value={formData.totalPrice} onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount (BDT)</Label>
                  <Input id="discount" type="number" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: e.target.value })} placeholder="0" />
                  {discountAmt > 0 && Number(formData.totalPrice) > 0 && (
                    <p className="text-xs text-green-600 font-medium">Effective price: {formatCurrency(effectivePrice)}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="downPayment">Down Payment (BDT)</Label>
                  <Input id="downPayment" type="number" value={formData.downPayment} onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })} placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Purchase Date <span className="text-destructive">*</span></Label>
                  <Input id="purchaseDate" type="date" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} />
                </div>
              </div>
            </div>

            <Separator />

            {/* EMI Terms */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" /> Installment Terms
              </h3>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="emiMonths" className="text-primary font-semibold">
                      Number of Months <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="emiMonths"
                      type="number"
                      min="1"
                      value={formData.emiMonths}
                      onChange={(e) => setFormData({ ...formData, emiMonths: e.target.value })}
                      className="border-primary/30"
                      placeholder="e.g. 12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDayOfMonth" className="font-semibold">
                      Due Day of Month (optional)
                    </Label>
                    <Input
                      id="dueDayOfMonth"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.dueDayOfMonth}
                      onChange={(e) => setFormData({ ...formData, dueDayOfMonth: e.target.value })}
                      placeholder="e.g. 10 (defaults to purchase day)"
                    />
                    <p className="text-xs text-muted-foreground">
                      If left blank, due date follows purchase day ({formData.purchaseDate ? new Date(formData.purchaseDate).getDate() : "—"}).
                    </p>
                  </div>
                </div>

                {formData.totalPrice && formData.emiMonths && (
                  <div className="pt-4 border-t border-primary/10 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">EMI Principal (after down payment):</span>
                      <span className="font-semibold">{formatCurrency(principal)}</span>
                    </div>
                    <div className="flex items-center justify-between bg-primary/10 rounded-md px-3 py-2">
                      <span className="font-semibold text-primary">Monthly Installment (Auto):</span>
                      <span className="font-bold text-primary text-lg">
                        {autoMonthlyAmount > 0 ? formatCurrency(autoMonthlyAmount) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total EMI Amount:</span>
                      <span className="font-bold">{autoMonthlyAmount > 0 ? formatCurrency(autoMonthlyAmount * months) : "—"}</span>
                    </div>
                    {previewNextDue() && (
                      <div className="flex items-center justify-between pt-1 border-t border-primary/10">
                        <span className="text-muted-foreground">First Installment Date:</span>
                        <span className="font-semibold text-orange-600">{previewNextDue()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => setLocation("/emi-orders")}>
                Cancel
              </Button>
              <Button type="submit" size="lg" disabled={createOrder.isPending}>
                {createOrder.isPending ? "Creating..." : "Add EMI"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
