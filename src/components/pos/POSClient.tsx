"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { processSale, holdSale, listParkedSales, recallSale } from "@/lib/actions/pos";
import { searchCustomers as searchCustomersAction } from "@/lib/actions/customers";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, User, Plus, Package, Check, ChevronsUpDown, Percent, Truck, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Product {
  _id: string;
  name: string;
  nameAr?: string;
  sku: string;
  barcode?: string;
  unit: string;
  sellingPrice: number;
  vatRate: number;
  vatInclusivePrice: boolean;
  trackStock: boolean;
  lowStockThreshold: number;
  imageUrls: string[];
  stock: number;
  categoryId?: string;
}

interface CartItem {
  productId: string;
  sku: string;
  name: string;
  nameAr?: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  netAmount: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
}

interface Customer {
  _id: string;
  name: string;
  nameAr?: string;
  phone?: string;
  email?: string;
  vatNumber?: string;
}

interface Branch {
  _id: string;
  name: string;
  isHeadOffice?: boolean;
}

interface Props {
  products: Product[];
  branches: Branch[];
  categories: Array<{ _id: string; name: string }>;
  userId: string;
  tenantId: string;
  sourceProposal?: {
    _id: string;
    proposalNumber: string;
    customerName: string;
    grandTotal: number;
  };
  sourceRetainer?: {
    _id: string;
    retainerNumber: string;
    remainingAmount: number;
  };
  initialCustomer?: Customer | null;
}

function calcLine(unitPrice: number, quantity: number, vatRate: number, vatInclusive: boolean) {
  const net = vatInclusive ? unitPrice / (1 + vatRate) : unitPrice;
  const netAmount = Math.round(net * quantity * 100) / 100;
  const vatAmount = Math.round(netAmount * vatRate * 100) / 100;
  const totalAmount = Math.round((netAmount + vatAmount) * 100) / 100;
  return { netAmount, vatAmount, totalAmount };
}

export function POSClient({
  products: initialProducts,
  branches,
  categories,
  userId,
  tenantId,
  sourceProposal,
  sourceRetainer,
  initialCustomer = null,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [products] = useState(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(branches.find(b => b.isHeadOffice)?._id || branches[0]?._id || "");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialCustomer);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [emailReceipt, setEmailReceipt] = useState(false);
  const [receiptEmail, setReceiptEmail] = useState("");
  const [whatsappReceipt, setWhatsappReceipt] = useState(false);
  const [shippingAmount, setShippingAmount] = useState<string>("0");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parkedSales, setParkedSales] = useState<any[]>([]);
  const [showParkedSales, setShowParkedSales] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  const searchCustomers = useCallback(async (query: string) => {
    setCustomerSearch(query);
    try {
      const results = await searchCustomersAction(tenantId, query);
      setCustomerResults(results);
    } catch {}
  }, [tenantId]);

  useEffect(() => {
    if (showParkedSales) {
      listParkedSales(tenantId, selectedBranch).then(setParkedSales);
    }
  }, [showParkedSales, tenantId, selectedBranch]);

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    
    const matchCategory = !categoryFilter || categoryFilter === "all" || p.categoryId === categoryFilter;
    
    return matchSearch && matchCategory;
  });

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === product._id);
      if (existing) {
        return prev.map(i =>
          i.productId === product._id
            ? { ...i, quantity: i.quantity + 1, ...calcLine(i.unitPrice, i.quantity + 1, i.vatRate, product.vatInclusivePrice) }
            : i
        );
      }
      const { netAmount, vatAmount, totalAmount } = calcLine(product.sellingPrice, 1, product.vatRate, product.vatInclusivePrice);
      return [...prev, {
        productId: product._id,
        sku: product.sku,
        name: product.name,
        nameAr: product.nameAr,
        quantity: 1,
        unitPrice: product.sellingPrice,
        vatRate: product.vatRate,
        netAmount,
        discountAmount: 0,
        vatAmount,
        totalAmount,
      }];
    });
  }, []);

  const updateQty = useCallback((productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.productId !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return null as unknown as CartItem;
      const product = products.find(p => p._id === productId);
      return { ...i, quantity: newQty, ...calcLine(i.unitPrice, newQty, i.vatRate, product?.vatInclusivePrice ?? true) };
    }).filter(Boolean) as CartItem[]);
  }, [products]);

  const removeItem = useCallback((productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
  }, []);

  const subtotal = cart.reduce((s, i) => s + i.netAmount, 0);
  const vatTotal = cart.reduce((s, i) => s + i.vatAmount, 0);
  const itemsTotal = cart.reduce((s, i) => s + i.totalAmount, 0);
  const grandTotal = itemsTotal + (parseFloat(shippingAmount) || 0) - (parseFloat(discountAmount) || 0);
  const changeAmount = cashReceived ? Math.max(0, parseFloat(cashReceived) - grandTotal) : 0;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    const fd = new FormData();
    fd.set("lines", JSON.stringify(cart));
    fd.set("branchId", selectedBranch);
    fd.set("paymentMethod", paymentMethod);
    fd.set("cashReceived", cashReceived);
    fd.set("idempotencyKey", `pos-${userId}-${Date.now()}`);

    fd.set("customerId", selectedCustomer?._id || "");
    fd.set("retainerId", sourceRetainer?._id || "");
    fd.set("shippingAmount", shippingAmount);
    fd.set("discountAmount", discountAmount);

    if (emailReceipt && receiptEmail) {
      fd.set("emailReceipt", "true");
      fd.set("receiptEmail", receiptEmail);
    }
    if (whatsappReceipt && selectedCustomer?.phone) {
      fd.set("whatsappReceipt", "true");
    }
    const result = await processSale(fd);
    if (result.error) {
      showToast(result.error, "error");
      setLoading(false);
      return;
    }

    setCart([]);
    setShowCheckout(false);
    setCashReceived("");
    setShippingAmount("0");
    setDiscountAmount("0");
    setLoading(false);
    showToast(`Invoice created successfully!`, "success");
    router.push(`/pos/receipt/${result.invoiceId}`);
  };

  const handleHold = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    const fd = new FormData();
    fd.set("lines", JSON.stringify(cart));
    fd.set("branchId", selectedBranch);
    fd.set("customerId", selectedCustomer?._id || "");
    fd.set("note", `Parked at ${new Date().toLocaleTimeString()}`);

    await holdSale(fd);
    setCart([]);
    setShowCheckout(false);
    setSelectedCustomer(null);
    setLoading(false);
    showToast("Sale parked successfully!", "success");
  };

  const handleRecall = async (parkedId: string) => {
    setLoading(true);
    try {
      const result = await recallSale(parkedId);
      if (result) {
        setCart(result.lines);
        if (result.customerId) {
          const results = await searchCustomersAction(tenantId, "");
          const customer = results.find(c => c._id === result.customerId);
          if (customer) setSelectedCustomer(customer);
        }
        showToast("Sale recalled successfully!", "success");
      }
    } catch {
      showToast("Failed to recall sale", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 overflow-hidden bg-muted/10">
      {/* LEFT: Products Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Product Name/Barcode"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-11 rounded-lg border border-border bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring outline-none shadow-sm transition-all"
            />
          </div>
          <div className="w-full sm:w-64">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="h-11 bg-card border-border">
                <SelectValue placeholder="Select Branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="px-4 pb-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
              !categoryFilter || categoryFilter === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
            )}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => setCategoryFilter(c._id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                categoryFilter === c._id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        {sourceProposal && (
          <div className="mx-4 mb-2 rounded-lg border border-blue-200 bg-blue-50/50 px-4 py-2.5 text-sm flex items-center justify-between shadow-sm shrink-0">
            <span>
              <strong>Proposal {sourceProposal.proposalNumber}</strong> • {sourceProposal.customerName}
            </span>
            <span className="font-semibold text-blue-700">SAR {sourceProposal.grandTotal.toFixed(2)}</span>
          </div>
        )}
        {sourceRetainer && (
          <div className="mx-4 mb-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-2.5 text-sm flex items-center justify-between shadow-sm shrink-0">
            <span>
              <strong>Retainer {sourceRetainer.retainerNumber}</strong>
            </span>
            <span className="font-semibold text-emerald-700">Remaining: SAR {sourceRetainer.remainingAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex-1 overflow-auto px-4 pb-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
               <Package className="size-10 mb-2 opacity-50" />
               <p className="text-sm font-medium">No Products Found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filtered.map(p => {
                const inStock = p.stock > 0;
                const stockBadgeClass = inStock 
                  ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20" 
                  : "bg-destructive/10 text-destructive border border-destructive/20";
                const stockText = inStock ? `In stock: ${p.stock}` : `Out of Stock: ${p.stock}`;

                return (
                  <button
                    key={p._id}
                    onClick={() => addToCart(p)}
                    className="group flex flex-col bg-card border border-border/80 rounded-xl overflow-hidden hover:shadow-md hover:border-primary/20 transition-all text-start h-[260px] shadow-sm relative cursor-pointer"
                  >
                    <div className="relative w-full h-[140px] p-3 bg-muted/10 flex items-center justify-center border-b border-border/30">
                      <span className={cn("absolute top-2 start-2 text-[9px] font-semibold px-2 py-0.5 rounded border", stockBadgeClass)}>
                        {stockText}
                      </span>
                      {p.imageUrls[0] ? (
                        <Image src={p.imageUrls[0]} alt={p.name} width={120} height={120} unoptimized className="max-w-full max-h-full object-contain mix-blend-multiply" />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground font-bold text-lg">
                          {p.name.charAt(0)}
                        </div>
                      )}
                      <span className="absolute bottom-2 start-2 bg-amber-500/10 text-amber-800 border border-amber-500/20 text-[9px] font-semibold px-1.5 py-0.5 rounded">
                        Default Price
                      </span>
                    </div>
                    <div className="p-3 pt-2 flex flex-col justify-between flex-1 w-full bg-card">
                      <div className="flex flex-col gap-0.5">
                        <h3 className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{p.name}</h3>
                        <span className="text-[10px] text-muted-foreground truncate">{p.sku}</span>
                      </div>
                      <p className="text-xs font-bold text-primary mt-2">SAR {p.sellingPrice.toFixed(2)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart Area Backdrop (mobile only) */}
      {isCartDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-20 lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsCartDrawerOpen(false)}
        />
      )}

      {/* RIGHT: Cart Area */}
      <div 
        className={cn(
          "fixed inset-y-0 end-0 z-30 w-full max-w-[380px] bg-card border-s border-border flex flex-col min-h-0 shadow-lg transition-transform duration-300 lg:static lg:translate-x-0 lg:z-10",
          isCartDrawerOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-4 border-b border-border flex items-center gap-3">
          <button
            onClick={() => setIsCartDrawerOpen(false)}
            className="lg:hidden p-2 -ms-1 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
            aria-label="Close cart"
          >
            <X className="size-5" />
          </button>
          <div className="flex-1 relative">
            <Popover open={showCustomerSearch} onOpenChange={(val) => {
              setShowCustomerSearch(val);
              if (val) searchCustomers("");
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full h-11 justify-between bg-card border-border text-foreground font-semibold hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2 truncate">
                    <User className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {selectedCustomer ? selectedCustomer.name : "Walk In Customer"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-55" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0 shadow-xl" align="start" sideOffset={8}>
                <div className="flex flex-col min-h-0 max-h-[400px]">
                  <div className="flex items-center border-b border-border px-3 sticky top-0 bg-popover z-10">
                    <Search className="me-2 size-4 shrink-0 text-muted-foreground" />
                    <input
                      className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground text-foreground"
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => searchCustomers(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto p-1 bg-popover">
                    <button
                      type="button"
                      className={cn(
                        "relative flex w-full cursor-default select-none items-center rounded-lg py-2.5 px-3 text-[13px] font-semibold outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                        !selectedCustomer || selectedCustomer._id === "walk-in" ? "bg-accent text-accent-foreground" : "text-foreground"
                      )}
                      onClick={() => {
                        setSelectedCustomer(null);
                        setShowCustomerSearch(false);
                        setCustomerSearch("");
                        setCustomerResults([]);
                      }}
                    >
                      <User className="me-2 size-4 opacity-50" />
                      <span className="truncate flex-1 text-start">Walk In Customer</span>
                      {(!selectedCustomer || selectedCustomer._id === "walk-in") && (
                        <Check className="ms-2 size-4 shrink-0" />
                      )}
                    </button>
                    
                    {customerResults.length > 0 && (
                      <div className="mt-1 border-t border-border pt-1">
                        {customerResults.map((customer) => (
                          <button
                            key={customer._id}
                            type="button"
                            className={cn(
                              "relative flex w-full cursor-default select-none items-center rounded-lg py-2.5 px-3 text-[13px] font-semibold outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                              selectedCustomer?._id === customer._id ? "bg-accent text-accent-foreground" : "text-foreground"
                            )}
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowCustomerSearch(false);
                              setCustomerSearch("");
                              setCustomerResults([]);
                            }}
                          >
                            <div className="flex flex-col items-start truncate flex-1">
                              <span className="truncate w-full text-start">{customer.name}</span>
                              {customer.phone && (
                                <span className="text-[10px] font-medium text-muted-foreground">{customer.phone}</span>
                              )}
                            </div>
                            {selectedCustomer?._id === customer._id && (
                              <Check className="ms-2 size-4 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {customerSearch.length >= 2 && customerResults.length === 0 && (
                      <p className="py-6 text-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        No customers found
                      </p>
                    )}
                  </div>
                  <div className="p-2 border-t border-border bg-muted/40">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-[11px] font-black uppercase tracking-widest h-9"
                      onClick={() => router.push("/customers/new")}
                    >
                      <Plus className="size-3.5 me-2" />
                      Add New Customer
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <Popover open={showParkedSales} onOpenChange={setShowParkedSales}>
            <PopoverTrigger asChild>
              <button className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors shrink-0 border border-border">
                <Package width="20" height="20" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 shadow-xl" align="end" sideOffset={8}>
              <div className="flex flex-col min-h-0 max-h-[400px]">
                <div className="p-4 border-b border-border flex items-center justify-between bg-popover sticky top-0 z-10">
                  <h3 className="text-sm font-bold uppercase tracking-tight text-foreground">Parked Sales</h3>
                  <Button 
                    variant="secondary" 
                    size="xs" 
                    disabled={cart.length === 0} 
                    onClick={handleHold}
                    className="font-bold uppercase tracking-widest text-[9px] px-2 h-7"
                  >
                    Park Current
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 bg-popover">
                  {parkedSales.length === 0 ? (
                    <div className="py-12 text-center">
                      <Package className="size-8 text-muted/30 mx-auto mb-2" />
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No Parked Sales</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {parkedSales.map((sale) => (
                        <div key={sale._id} className="p-3 bg-muted/40 rounded-lg border border-border hover:border-primary/30 transition-all group">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[13px] font-bold text-foreground truncate pe-2">{sale.customerName}</span>
                            <span className="text-[11px] font-black text-primary shrink-0">SAR {sale.totalAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {sale.itemCount} items • {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <Button 
                              size="xs" 
                              variant="outline" 
                              className="h-7 px-3 text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white"
                              onClick={() => {
                                handleRecall(sale._id);
                                setShowParkedSales(false);
                              }}
                            >
                              Recall
                            </Button>
                          </div>
                          {sale.note && (
                            <p className="text-[10px] italic text-muted-foreground mt-2 truncate">{sale.note}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex-1 overflow-auto bg-muted/20">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-40"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
              <p className="text-xs font-semibold text-muted-foreground">No Products Added</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center justify-between p-3.5 bg-card rounded-lg border border-border shadow-sm hover:border-border transition-all">
                  <div className="flex-1 min-w-0 pe-3">
                    <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">SAR {item.unitPrice.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-muted/40 rounded-lg border border-border">
                      <button onClick={() => updateQty(item.productId, -1)} className="w-7 h-7 flex items-center justify-center text-foreground hover:bg-muted font-bold transition-all">−</button>
                      <span className="w-7 text-center text-xs font-bold text-foreground">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, 1)} className="w-7 h-7 flex items-center justify-center text-foreground hover:bg-muted font-bold transition-all">+</button>
                    </div>
                    <button onClick={() => removeItem(item.productId)} className="w-7 h-7 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors ms-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                  <div className="text-xs font-bold text-foreground text-end w-16">
                    SAR {item.totalAmount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & Actions */}
        <div className="bg-card border-t border-border">
          <div className="p-4 space-y-2.5 text-xs text-muted-foreground">
            <div className="flex justify-between items-center">
              <span className="font-medium">Sub Total</span>
              <span className="font-bold text-foreground">SAR {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Tax</span>
              <span className="font-bold text-foreground">SAR {vatTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Shipping</span>
              <span className="font-bold text-foreground">SAR {(parseFloat(shippingAmount) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Discount</span>
              <span className="font-bold text-foreground">SAR {(parseFloat(discountAmount) || 0).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <div className="flex justify-between items-center">
              <span className="text-sm font-extrabold text-foreground">Total</span>
              <span className="text-base font-black text-primary">SAR {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {showCheckout ? (
            <div className="p-4 space-y-4 border-t border-border bg-card">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-11 bg-card border-border">
                    <SelectValue placeholder="Select Payment Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mada">Mada</SelectItem>
                    <SelectItem value="visa">Visa</SelectItem>
                    <SelectItem value="mastercard">Mastercard</SelectItem>
                    <SelectItem value="stc_pay">STC Pay</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === "cash" && (
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Cash Received</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm focus:border-primary outline-none"
                  />
                  {cashReceived && parseFloat(cashReceived) >= grandTotal && (
                    <p className="text-xs text-emerald-600 mt-1.5 font-semibold">Change: SAR {changeAmount.toFixed(2)}</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="emailReceipt"
                  checked={emailReceipt}
                  onChange={e => {
                    setEmailReceipt(e.target.checked);
                    if (e.target.checked && selectedCustomer?.email) {
                      setReceiptEmail(selectedCustomer.email);
                    }
                  }}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-card"
                />
                <label htmlFor="emailReceipt" className="text-xs font-semibold text-muted-foreground">Email receipt</label>
              </div>

              {emailReceipt && (
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email address</label>
                  <input
                    type="email"
                    value={receiptEmail}
                    onChange={e => setReceiptEmail(e.target.value)}
                    placeholder="customer@example.com"
                    required
                    className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm focus:border-primary outline-none text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="whatsappReceipt"
                  checked={whatsappReceipt}
                  onChange={e => setWhatsappReceipt(e.target.checked)}
                  disabled={!selectedCustomer?.phone}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary disabled:opacity-50 bg-card"
                />
                <label htmlFor="whatsappReceipt" className={`text-xs font-semibold ${selectedCustomer?.phone ? "text-muted-foreground" : "text-muted/40"}`}>
                  Send receipt via WhatsApp
                </label>
              </div>
              {whatsappReceipt && selectedCustomer?.phone && (
                <p className="text-[10px] font-semibold text-emerald-600">
                  Will send to {selectedCustomer.phone}
                </p>
              )}
              {!selectedCustomer?.phone && (
                <p className="text-[10px] text-muted-foreground/60 leading-normal">
                  Add a phone number to the customer to enable WhatsApp receipts.
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 h-11 rounded-lg border border-border bg-card text-foreground text-sm font-semibold hover:bg-muted/50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="flex-[2] h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-colors disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Confirm & Pay"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex-1 h-11 rounded-lg border border-border bg-card text-foreground text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-muted/50 transition-colors shadow-sm">
                    Shipping <Truck className="size-3.5 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 shadow-xl border-border" align="center" sideOffset={8}>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground">Shipping Amount</h4>
                    <p className="text-xs text-muted-foreground">Add shipping/delivery charges.</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={shippingAmount}
                        onChange={(e) => setShippingAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-9 border-border bg-card text-foreground"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex-1 h-11 rounded-lg border border-border bg-card text-foreground text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-muted/50 transition-colors shadow-sm">
                    Discount <Percent className="size-3.5 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 shadow-xl border-border" align="center" sideOffset={8}>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground">Global Discount</h4>
                    <p className="text-xs text-muted-foreground">Apply a fixed discount to the total.</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-9 border-border bg-card text-foreground"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <button 
                onClick={() => setShowCheckout(true)}
                disabled={cart.length === 0}
                className="flex-[1.5] h-11 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary/95 transition-colors disabled:opacity-50 shadow-sm"
              >
                Place Order
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Floating Bar for Mobile/Tablet */}
      <div className="lg:hidden bg-card border-t border-border p-4 flex items-center justify-between shrink-0 shadow-md z-15">
        <div className="flex flex-col">
          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            {cart.reduce((s, i) => s + i.quantity, 0)} items
          </span>
          <span className="text-base font-extrabold text-foreground">
            SAR {grandTotal.toFixed(2)}
          </span>
        </div>
        <button
          onClick={() => setIsCartDrawerOpen(true)}
          className="h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-colors shadow-sm"
        >
          View Cart
        </button>
      </div>
    </div>
  );
}

