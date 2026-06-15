import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateEmiOrder, useListCustomers, getListCustomersQueryKey, useListShops, getListShopsQueryKey, useListProducts, getListProductsQueryKey, getListEmiOrdersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NewEmiOrder() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: customers } = useListCustomers({ query: { queryKey: getListCustomersQueryKey() } });
  const { data: shops } = useListShops({ query: { queryKey: getListShopsQueryKey() } });
  
  const [formData, setFormData] = useState({
    customerId: "",
    shopId: "",
    productId: "",
    productName: "",
    totalPrice: "",
    downPayment: "",
    emiMonths: "",
    monthlyAmount: "",
    purchaseDate: new Date().toISOString().split('T')[0]
  });

  const { data: products } = useListProducts(
    { query: { 
        queryKey: getListProductsQueryKey(formData.shopId ? { shopId: Number(formData.shopId) } : {}),
        enabled: !!formData.shopId
      } 
    }
  );

  const createOrder = useCreateEmiOrder();

  const calculateEMI = () => {
    const total = Number(formData.totalPrice) || 0;
    const down = Number(formData.downPayment) || 0;
    const months = Number(formData.emiMonths) || 0;
    
    if (total > 0 && months > 0) {
      const remaining = Math.max(0, total - down);
      const monthly = Math.ceil(remaining / months);
      setFormData(prev => ({ ...prev, monthlyAmount: monthly.toString() }));
    }
  };

  const handleProductSelect = (val: string) => {
    if (val === "custom") {
      setFormData({ ...formData, productId: "", productName: "", totalPrice: "" });
      return;
    }
    const product = products?.find(p => p.id.toString() === val);
    if (product) {
      setFormData({
        ...formData,
        productId: product.id.toString(),
        productName: product.name,
        totalPrice: product.price?.toString() || ""
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customerId || !formData.shopId || !formData.productName || !formData.totalPrice || !formData.emiMonths || !formData.monthlyAmount || !formData.purchaseDate) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    createOrder.mutate({
      data: {
        customerId: Number(formData.customerId),
        shopId: Number(formData.shopId),
        productId: formData.productId ? Number(formData.productId) : null,
        productName: formData.productName,
        totalPrice: Number(formData.totalPrice),
        downPayment: Number(formData.downPayment) || 0,
        emiMonths: Number(formData.emiMonths),
        monthlyAmount: Number(formData.monthlyAmount),
        purchaseDate: formData.purchaseDate
      }
    }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListEmiOrdersQueryKey() });
        toast({ title: "EMI Order created successfully" });
        setLocation(`/emi-orders/${data.id}`);
      },
      onError: () => {
        toast({ title: "Failed to create order", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/emi-orders")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">New EMI Order</h2>
          <p className="text-muted-foreground mt-1">Create a new installment plan.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-muted/20 border-b">
          <CardTitle>Order Details</CardTitle>
          <CardDescription>Enter the customer and product information for this plan.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Customer & Shop */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerId">Customer <span className="text-destructive">*</span></Label>
                <Select value={formData.customerId} onValueChange={val => setFormData({...formData, customerId: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name} ({c.phone || "No phone"})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shopId">Shop <span className="text-destructive">*</span></Label>
                <Select value={formData.shopId} onValueChange={val => setFormData({...formData, shopId: val, productId: "", productName: ""})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shop" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops?.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Section 2: Product */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" /> Product & Pricing
              </h3>
              
              <div className="grid gap-6 md:grid-cols-2">
                {formData.shopId && (
                  <div className="space-y-2">
                    <Label>Select Existing Product (Optional)</Label>
                    <Select value={formData.productId || (formData.productName ? "custom" : "")} onValueChange={handleProductSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a product or enter manually" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">-- Custom Product --</SelectItem>
                        {products?.map(p => (
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
                    onChange={e => setFormData({...formData, productName: e.target.value})} 
                    placeholder="e.g. Walton Refrigerator 32''" 
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="totalPrice">Total Price (BDT) <span className="text-destructive">*</span></Label>
                  <Input 
                    id="totalPrice" 
                    type="number" 
                    value={formData.totalPrice} 
                    onChange={e => setFormData({...formData, totalPrice: e.target.value})} 
                    onBlur={calculateEMI}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="downPayment">Down Payment (BDT)</Label>
                  <Input 
                    id="downPayment" 
                    type="number" 
                    value={formData.downPayment} 
                    onChange={e => setFormData({...formData, downPayment: e.target.value})} 
                    onBlur={calculateEMI}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseDate">Purchase Date <span className="text-destructive">*</span></Label>
                  <Input 
                    id="purchaseDate" 
                    type="date" 
                    value={formData.purchaseDate} 
                    onChange={e => setFormData({...formData, purchaseDate: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 3: EMI Terms */}
            <div className="space-y-6">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="emiMonths" className="text-primary font-semibold">EMI Duration (Months) <span className="text-destructive">*</span></Label>
                    <Input 
                      id="emiMonths" 
                      type="number" 
                      min="1"
                      value={formData.emiMonths} 
                      onChange={e => setFormData({...formData, emiMonths: e.target.value})} 
                      onBlur={calculateEMI}
                      className="border-primary/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="monthlyAmount" className="text-primary font-semibold">Monthly Amount (BDT) <span className="text-destructive">*</span></Label>
                      <Button type="button" variant="link" size="sm" onClick={calculateEMI} className="h-auto p-0 text-primary">Auto Calculate</Button>
                    </div>
                    <Input 
                      id="monthlyAmount" 
                      type="number" 
                      value={formData.monthlyAmount} 
                      onChange={e => setFormData({...formData, monthlyAmount: e.target.value})} 
                      className="border-primary/30 font-bold"
                    />
                  </div>
                </div>
                
                {formData.totalPrice && formData.emiMonths && formData.monthlyAmount && (
                  <div className="mt-4 pt-4 border-t border-primary/10 text-sm flex justify-between font-medium">
                    <span className="text-muted-foreground">Principal: BDT {(Number(formData.totalPrice) - (Number(formData.downPayment) || 0)).toLocaleString()}</span>
                    <span className="text-primary">Total Installment Value: BDT {(Number(formData.monthlyAmount) * Number(formData.emiMonths)).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button type="button" variant="outline" onClick={() => setLocation("/emi-orders")}>Cancel</Button>
              <Button type="submit" size="lg" disabled={createOrder.isPending}>
                {createOrder.isPending ? "Creating..." : "Create EMI Order"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
