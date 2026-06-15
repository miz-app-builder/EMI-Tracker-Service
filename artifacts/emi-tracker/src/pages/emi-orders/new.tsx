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
import { ArrowLeft, Calculator, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/format";

export default function NewEmiOrder() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: shops } = useListShops({ query: { queryKey: getListShopsQueryKey() } });

  const [formData, setFormData] = useState({
    shopId: "",
    productId: "",
    productName: "",
    totalPrice: "",
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

  const handleProductSelect = (val: string) => {
    if (val === "custom") {
      setFormData({ ...formData, productId: "", productName: "", totalPrice: "" });
      return;
    }
    const product = products?.find((p) => p.id.toString() === val);
    if (product) {
      setFormData({
        ...formData,
        productId: product.id.toString(),
        productName: product.name,
        totalPrice: product.price?.toString() || "",
      });
    }
  };

  // Preview next due date
  const previewNextDue = () => {
    if (!formData.purchaseDate) return null;
    const d = new Date(formData.purchaseDate);
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString("bn-BD", { day: "numeric", month: "long", year: "numeric" });
  };

  // Auto-calculate monthly amount (same logic as server)
  const principal = Math.max(0, (Number(formData.totalPrice) || 0) - (Number(formData.downPayment) || 0));
  const months = Number(formData.emiMonths) || 0;
  const autoMonthlyAmount = months > 0 ? Math.ceil(principal / months) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.shopId || !formData.productName || !formData.totalPrice || !formData.emiMonths || !formData.purchaseDate) {
      toast({ title: "সব required field পূরণ করুন", variant: "destructive" });
      return;
    }

    createOrder.mutate(
      {
        data: {
          shopId: Number(formData.shopId),
          productId: formData.productId ? Number(formData.productId) : null,
          productName: formData.productName,
          totalPrice: Number(formData.totalPrice),
          downPayment: Number(formData.downPayment) || 0,
          emiMonths: Number(formData.emiMonths),
          dueDayOfMonth: formData.dueDayOfMonth ? Number(formData.dueDayOfMonth) : null,
          purchaseDate: formData.purchaseDate,
        },
      },
      {
        onSuccess: (data) => {
          queryClient.invalidateQueries({ queryKey: getListEmiOrdersQueryKey() });
          toast({ title: "EMI Order তৈরি হয়েছে!" });
          setLocation(`/emi-orders/${data.id}`);
        },
        onError: () => {
          toast({ title: "Order তৈরি ব্যর্থ হয়েছে", variant: "destructive" });
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
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">নতুন EMI যোগ করুন</h2>
          <p className="text-muted-foreground mt-1">কোথা থেকে কী কিনেছেন এবং কত মাসের কিস্তি।</p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-muted/20 border-b">
          <CardTitle>EMI বিবরণ</CardTitle>
          <CardDescription>দোকান, পণ্য এবং কিস্তির তথ্য দিন।</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Shop */}
            <div className="space-y-2">
              <Label htmlFor="shopId">দোকান / শোরুম <span className="text-destructive">*</span></Label>
              <Select
                value={formData.shopId}
                onValueChange={(val) => setFormData({ ...formData, shopId: val, productId: "", productName: "" })}
              >
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="দোকান বেছে নিন" />
                </SelectTrigger>
                <SelectContent>
                  {shops?.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">দোকান না থাকলে প্রথমে Shops পেজ থেকে যোগ করুন।</p>
            </div>

            <Separator />

            {/* Product */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" /> পণ্য ও মূল্য
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
                {formData.shopId && products && products.length > 0 && (
                  <div className="space-y-2">
                    <Label>পুরনো পণ্য বেছে নিন (ঐচ্ছিক)</Label>
                    <Select
                      value={formData.productId || (formData.productName ? "custom" : "")}
                      onValueChange={handleProductSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="পণ্য বেছে নিন বা নিচে লিখুন" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">-- নতুন পণ্য --</SelectItem>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="productName">পণ্যের নাম <span className="text-destructive">*</span></Label>
                  <Input
                    id="productName"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    placeholder="যেমন: LG AC 1.5 Ton"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="totalPrice">মোট দাম (টাকা) <span className="text-destructive">*</span></Label>
                  <Input
                    id="totalPrice"
                    type="number"
                    value={formData.totalPrice}
                    onChange={(e) => setFormData({ ...formData, totalPrice: e.target.value })}
                    placeholder="০"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="downPayment">ডাউন পেমেন্ট (টাকা)</Label>
                  <Input
                    id="downPayment"
                    type="number"
                    value={formData.downPayment}
                    onChange={(e) => setFormData({ ...formData, downPayment: e.target.value })}
                    placeholder="০"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">কেনার তারিখ <span className="text-destructive">*</span></Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* EMI Terms */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" /> কিস্তির শর্ত
              </h3>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="emiMonths" className="text-primary font-semibold">
                      কত মাসের কিস্তি <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="emiMonths"
                      type="number"
                      min="1"
                      value={formData.emiMonths}
                      onChange={(e) => setFormData({ ...formData, emiMonths: e.target.value })}
                      className="border-primary/30"
                      placeholder="যেমন: 12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDayOfMonth" className="font-semibold">
                      প্রতি মাসের কত তারিখে? (ঐচ্ছিক)
                    </Label>
                    <Input
                      id="dueDayOfMonth"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.dueDayOfMonth}
                      onChange={(e) => setFormData({ ...formData, dueDayOfMonth: e.target.value })}
                      placeholder="যেমন: 10 (না দিলে কেনার তারিখ)"
                    />
                    <p className="text-xs text-muted-foreground">
                      না দিলে কেনার তারিখ (
                      {formData.purchaseDate
                        ? new Date(formData.purchaseDate).getDate()
                        : "—"}
                      ) অনুযায়ী due date হবে।
                    </p>
                  </div>
                </div>

                {/* Auto-calculated preview */}
                {formData.totalPrice && formData.emiMonths && (
                  <div className="pt-4 border-t border-primary/10 space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">EMI মূল পরিমাণ (ডাউন বাদে):</span>
                      <span className="font-semibold">{formatCurrency(principal)}</span>
                    </div>
                    <div className="flex items-center justify-between bg-primary/10 rounded-md px-3 py-2">
                      <span className="font-semibold text-primary">মাসিক কিস্তি (Auto):</span>
                      <span className="font-bold text-primary text-lg">
                        {autoMonthlyAmount > 0 ? formatCurrency(autoMonthlyAmount) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">মোট EMI মূল্য:</span>
                      <span className="font-bold">
                        {autoMonthlyAmount > 0 ? formatCurrency(autoMonthlyAmount * months) : "—"}
                      </span>
                    </div>
                    {previewNextDue() && (
                      <div className="flex items-center justify-between pt-1 border-t border-primary/10">
                        <span className="text-muted-foreground">প্রথম কিস্তির তারিখ:</span>
                        <span className="font-semibold text-orange-600">{previewNextDue()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => setLocation("/emi-orders")}>
                বাতিল
              </Button>
              <Button type="submit" size="lg" disabled={createOrder.isPending}>
                {createOrder.isPending ? "তৈরি হচ্ছে..." : "EMI যোগ করুন"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
