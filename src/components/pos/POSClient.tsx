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
import { Search, User, Plus, Package, Check, ChevronsUpDown, Percent, Truck } from "lucide-react";
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
  const [shippingAmount, setShippingAmount] = useState<string>("0");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [parkedSales, setParkedSales] = useState<any[]>([]);
  const [showParkedSales, setShowParkedSales] = useState(false);

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
    <div className="flex h-full min-h-0 overflow-hidden bg-[#f2f3f8]">
      {/* LEFT: Products Area */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by Product Name/Barcode"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-11 rounded-md border border-input bg-white px-4 text-sm text-gray-700 focus:border-primary outline-none shadow-sm"
            />
          </div>
          <div className="w-64">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-64">
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="h-11">
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

        {sourceProposal && (
          <div className="mx-4 mb-2 rounded-md border border-info/20 bg-soft-info px-4 py-2 text-sm flex items-center justify-between shadow-sm">
            <span>
              <strong>Proposal {sourceProposal.proposalNumber}</strong> • {sourceProposal.customerName}
            </span>
            <span className="font-semibold">SAR {sourceProposal.grandTotal.toFixed(2)}</span>
          </div>
        )}
        {sourceRetainer && (
          <div className="mx-4 mb-2 rounded-md border border-success/20 bg-soft-success px-4 py-2 text-sm flex items-center justify-between shadow-sm">
            <span>
              <strong>Retainer {sourceRetainer.retainerNumber}</strong>
            </span>
            <span className="font-semibold">Remaining: SAR {sourceRetainer.remainingAmount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex-1 overflow-auto px-4 pb-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
               <p>No Product Added / Found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtered.map(p => {
                const inStock = p.stock > 0;
                const stockBadgeClass = inStock ? "bg-[#0abb75] text-white" : "bg-[#ef486a] text-white";
                const stockText = inStock ? `In stock : ${p.stock}` : `Out of Stock : ${p.stock}`;

                return (
                  <button
                    key={p._id}
                    onClick={() => addToCart(p)}
                    className="group flex flex-col bg-white border border-gray-100 rounded-md overflow-hidden hover:shadow-md transition-all text-start h-[300px] shadow-sm"
                  >
                    <div className="relative w-full h-[180px] p-4 bg-white flex items-center justify-center">
                      <span className={cn("absolute top-2 start-2 text-[10px] font-medium px-2 py-0.5 rounded-[3px]", stockBadgeClass)}>
                        {stockText}
                      </span>
                      {p.imageUrls[0] ? (
                        <Image src={p.imageUrls[0]} alt={p.name} width={200} height={200} unoptimized className="max-w-full max-h-full object-contain" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold text-xl">
                          {p.name.charAt(0)}
                        </div>
                      )}
                      <span className="absolute bottom-2 start-2 bg-[#ffc519] text-[#111723] text-[10px] font-semibold px-2 py-0.5 rounded-[3px]">
                        Default
                      </span>
                    </div>
                    <div className="p-4 pt-2 flex flex-col justify-between flex-1 w-full bg-white">
                      <h3 className="text-sm font-bold text-[#111723] leading-snug line-clamp-2">{p.name}</h3>
                      <p className="text-[13px] text-gray-600 mt-2">SAR {p.sellingPrice.toFixed(2)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart Area */}
      <div className="w-[400px] bg-white border-l border-gray-200 flex flex-col min-h-0 shadow-lg z-10 relative">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="flex-1 relative">
            <Popover open={showCustomerSearch} onOpenChange={(val) => {
              setShowCustomerSearch(val);
              if (val) searchCustomers("");
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full h-11 justify-between bg-white border-gray-400 text-gray-700 font-bold hover:bg-white hover:border-gray-500"
                >
                  <div className="flex items-center gap-2 truncate">
                    <User className="size-4 text-gray-400 shrink-0" />
                    <span className="truncate">
                      {selectedCustomer ? selectedCustomer.name : "Walk In Customer"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ms-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0 shadow-xl" align="start" sideOffset={8}>
                <div className="flex flex-col min-h-0 max-h-[400px]">
                  <div className="flex items-center border-b border-gray-100 px-3 sticky top-0 bg-white z-10">
                    <Search className="me-2 size-4 shrink-0 text-gray-400" />
                    <input
                      className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-400"
                      placeholder="Search customers..."
                      value={customerSearch}
                      onChange={(e) => searchCustomers(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto p-1">
                    <button
                      type="button"
                      className={cn(
                        "relative flex w-full cursor-default select-none items-center rounded-sm py-2.5 px-3 text-[13px] font-bold outline-none transition-colors hover:bg-soft-primary hover:text-primary",
                        !selectedCustomer || selectedCustomer._id === "walk-in" ? "bg-soft-primary text-primary" : "text-gray-700"
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
                      <div className="mt-1 border-t border-gray-50 pt-1">
                        {customerResults.map((customer) => (
                          <button
                            key={customer._id}
                            type="button"
                            className={cn(
                              "relative flex w-full cursor-default select-none items-center rounded-sm py-2.5 px-3 text-[13px] font-bold outline-none transition-colors hover:bg-soft-primary hover:text-primary",
                              selectedCustomer?._id === customer._id ? "bg-soft-primary text-primary" : "text-gray-700"
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
                                <span className="text-[10px] font-medium text-gray-400">{customer.phone}</span>
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
                      <p className="py-6 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                        No customers found
                      </p>
                    )}
                  </div>
                  <div className="p-2 border-t border-gray-100 bg-gray-50/50">
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
              <button className="w-11 h-11 rounded-md bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors shrink-0">
                <Package width="20" height="20" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 shadow-xl" align="end" sideOffset={8}>
              <div className="flex flex-col min-h-0 max-h-[400px]">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                  <h3 className="text-sm font-bold uppercase tracking-tight">Parked Sales</h3>
                  <Button 
                    variant="soft" 
                    size="xs" 
                    disabled={cart.length === 0} 
                    onClick={handleHold}
                    className="font-bold uppercase tracking-widest text-[9px] px-2"
                  >
                    Park Current
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {parkedSales.length === 0 ? (
                    <div className="py-12 text-center">
                      <Package className="size-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No Parked Sales</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {parkedSales.map((sale) => (
                        <div key={sale._id} className="p-3 bg-gray-50 rounded-md border border-gray-100 hover:border-primary/30 transition-colors group">
                          <div className="flex justify-between items-start mb-1">
                            <span className="text-[13px] font-bold text-gray-800 truncate pe-2">{sale.customerName}</span>
                            <span className="text-[11px] font-black text-primary shrink-0">SAR {sale.totalAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-[10px] font-medium text-gray-400">
                              {sale.itemCount} items • {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <Button 
                              size="xs" 
                              variant="outline" 
                              className="h-7 px-3 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white"
                              onClick={() => {
                                handleRecall(sale._id);
                                setShowParkedSales(false);
                              }}
                            >
                              Recall
                            </Button>
                          </div>
                          {sale.note && (
                            <p className="text-[10px] italic text-gray-500 mt-2 truncate">{sale.note}</p>
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

        <div className="flex-1 overflow-auto bg-[#f9fafb]">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
              <p className="text-sm font-medium text-gray-600">No Product Added</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-100 shadow-sm">
                  <div className="flex-1 min-w-0 pe-3">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-1">SAR {item.unitPrice.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-gray-50 rounded border border-input">
                      <button onClick={() => updateQty(item.productId, -1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200">−</button>
                      <span className="w-8 text-center text-sm font-medium text-gray-800">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200">+</button>
                    </div>
                    <button onClick={() => removeItem(item.productId)} className="w-8 h-8 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 ms-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                  <div className="text-sm font-bold text-gray-800 text-end w-20">
                    SAR {item.totalAmount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & Actions */}
        <div className="bg-white border-t border-gray-100">
          <div className="p-5 space-y-3 text-[13px] text-gray-600">
            <div className="flex justify-between items-center">
              <span className="font-medium">Sub Total</span>
              <span className="font-bold text-gray-900">SAR {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Tax</span>
              <span className="font-bold text-gray-900">SAR {vatTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Shipping</span>
              <span className="font-bold text-gray-900">SAR {(parseFloat(shippingAmount) || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Discount</span>
              <span className="font-bold text-gray-900">SAR {(parseFloat(discountAmount) || 0).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="px-5 py-4 border-t border-gray-100 bg-[#f8f9fa]">
            <div className="flex justify-between items-center">
              <span className="text-lg font-extrabold text-[#111723]">Total</span>
              <span className="text-lg font-extrabold text-[#111723]">SAR {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {showCheckout ? (
            <div className="p-5 space-y-4 border-t border-gray-100 bg-white">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-11 bg-white">
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
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Cash Received</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-11 rounded-md border border-input bg-white px-3 text-sm focus:border-primary outline-none"
                  />
                  {cashReceived && parseFloat(cashReceived) >= grandTotal && (
                    <p className="text-[13px] text-[#0abb75] mt-1.5 font-medium">Change: SAR {changeAmount.toFixed(2)}</p>
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
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <label htmlFor="emailReceipt" className="text-sm font-medium text-gray-600">Email receipt</label>
              </div>

              {emailReceipt && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Email address</label>
                  <input
                    type="email"
                    value={receiptEmail}
                    onChange={e => setReceiptEmail(e.target.value)}
                    placeholder="customer@example.com"
                    required
                    className="w-full h-11 rounded-md border border-input bg-white px-3 text-sm focus:border-primary outline-none"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 h-11 rounded-md border border-input bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="flex-[2] h-11 rounded-md bg-[#377dff] text-white text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Confirm & Pay"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex-1 h-11 rounded-md border border-input bg-white text-gray-700 text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors">
                    Shipping <Truck className="size-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 shadow-xl">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Shipping Amount</h4>
                    <p className="text-sm text-muted-foreground">Add shipping/delivery charges.</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={shippingAmount}
                        onChange={(e) => setShippingAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-9"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex-1 h-11 rounded-md border border-input bg-white text-gray-700 text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors">
                    Discount <Percent className="size-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 shadow-xl">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Global Discount</h4>
                    <p className="text-sm text-muted-foreground">Apply a fixed discount to the total.</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-9"
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <button 
                onClick={() => setShowCheckout(true)}
                disabled={cart.length === 0}
                className="flex-[1.5] h-11 rounded-md bg-[#377dff] text-white text-[13px] font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                Place Order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

