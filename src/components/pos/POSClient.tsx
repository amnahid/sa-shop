"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { processSale, holdSale } from "@/lib/actions/pos";
import { useToast } from "@/components/ui/toast";

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
}

function calcLine(unitPrice: number, quantity: number, vatRate: number, vatInclusive: boolean) {
  const net = vatInclusive ? unitPrice / (1 + vatRate) : unitPrice;
  const netAmount = Math.round(net * quantity * 100) / 100;
  const vatAmount = Math.round(netAmount * vatRate * 100) / 100;
  const totalAmount = Math.round((netAmount + vatAmount) * 100) / 100;
  return { netAmount, vatAmount, totalAmount };
}

export function POSClient({ products: initialProducts, branches, categories, userId, tenantId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [products, setProducts] = useState(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(branches.find(b => b.isHeadOffice)?._id || branches[0]?._id || "");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [emailReceipt, setEmailReceipt] = useState(false);
  const [receiptEmail, setReceiptEmail] = useState("");

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
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
  const grandTotal = cart.reduce((s, i) => s + i.totalAmount, 0);
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

    await holdSale(fd);
    setCart([]);
    setShowCheckout(false);
    setLoading(false);
    showToast("Sale held successfully!", "success");
  };

  const searchCustomers = async (query: string) => {
    setCustomerSearch(query);
    if (query.length < 2) {
      setCustomerResults([]);
      return;
    }
    try {
      const { searchCustomers } = await import("@/lib/actions/customers");
      const results = await searchCustomers(tenantId, query);
      setCustomerResults(results);
    } catch {}
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b bg-background flex items-center gap-4 flex-wrap">
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {branches.map(b => (
              <option key={b._id} value={b._id}>{b.name}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search product or scan barcode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] h-9 rounded-md border border-input bg-background px-3 text-sm"
          />

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No products found</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtered.map(p => (
                <button
                  key={p._id}
                  onClick={() => addToCart(p)}
                  className="flex flex-col items-center justify-center p-3 border rounded-lg bg-card hover:bg-accent transition-colors text-center"
                >
                  <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center mb-2 text-lg">
                    {p.imageUrls[0] ? (
                      <img src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-cover rounded-md" />
                    ) : (
                      p.name.charAt(0)
                    )}
                  </div>
                  <span className="text-sm font-medium line-clamp-2">{p.name}</span>
                  <span className="text-sm text-muted-foreground">
                    SAR {p.sellingPrice.toFixed(2)}
                  </span>
                  {p.trackStock && (
                    <span className={`text-xs mt-1 ${p.stock <= p.lowStockThreshold ? "text-red-500" : "text-green-600"}`}>
                      {p.stock} in stock
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="w-96 border-l bg-card flex flex-col min-h-0">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold">Current Sale</h2>
            {selectedCustomer ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{selectedCustomer.name}</span>
                <button onClick={() => setSelectedCustomer(null)} className="text-xs text-red-500 hover:text-red-700 ml-1">×</button>
              </div>
            ) : (
              <button onClick={() => setShowCustomerSearch(!showCustomerSearch)} className="text-xs text-primary hover:underline">
                + Customer
              </button>
            )}
          </div>
          {showCustomerSearch && (
            <div className="mt-2 relative">
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={customerSearch}
                onChange={e => searchCustomers(e.target.value)}
                className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
                autoFocus
              />
              {customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-md z-10 max-h-40 overflow-auto">
                  {customerResults.map(c => (
                    <button
                      key={c._id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setShowCustomerSearch(false);
                        setCustomerSearch("");
                        setCustomerResults([]);
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted border-b last:border-b-0"
                    >
                      <span className="font-medium">{c.name}</span>
                      {c.phone && <span className="text-muted-foreground ml-2">{c.phone}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {cart.length === 0 && <p className="text-sm text-muted-foreground mt-1">No items</p>}
        </div>

        <div className="flex-1 min-h-0 overflow-auto p-4 space-y-2">
          {cart.map(item => (
            <div key={item.productId} className="flex items-center justify-between p-2 bg-background rounded-md">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">SAR {item.unitPrice.toFixed(2)} × {item.quantity}</p>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => updateQty(item.productId, -1)}
                  className="w-7 h-7 rounded border flex items-center justify-center text-sm hover:bg-muted"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQty(item.productId, 1)}
                  className="w-7 h-7 rounded border flex items-center justify-center text-sm hover:bg-muted"
                >
                  +
                </button>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="w-7 h-7 rounded border flex items-center justify-center text-sm hover:bg-muted text-red-500 ml-1"
                >
                  ×
                </button>
              </div>
              <div className="text-sm font-medium text-right w-20">
                SAR {item.totalAmount.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t p-4 space-y-2 shrink-0">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>SAR {subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>VAT (15%)</span>
            <span>SAR {vatTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t pt-2">
            <span>Total</span>
            <span>SAR {grandTotal.toFixed(2)}</span>
          </div>

          {showCheckout ? (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-sm font-medium">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="cash">Cash</option>
                  <option value="mada">Mada</option>
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="stc_pay">STC Pay</option>
                </select>
              </div>

              {paymentMethod === "cash" && (
                <div>
                  <label className="text-sm font-medium">Cash Received</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                  {cashReceived && parseFloat(cashReceived) >= grandTotal && (
                    <p className="text-sm text-green-600 mt-1">Change: SAR {changeAmount.toFixed(2)}</p>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2">
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
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="emailReceipt" className="text-sm">Email receipt</label>
              </div>

              {emailReceipt && (
                <div>
                  <label className="text-sm font-medium">Email address</label>
                  <input
                    type="email"
                    value={receiptEmail}
                    onChange={e => setReceiptEmail(e.target.value)}
                    placeholder="customer@example.com"
                    required
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 h-9 rounded-md border border-input bg-background text-sm font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Pay"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                className="px-3 h-9 rounded-md border border-input bg-background text-sm font-medium disabled:opacity-50"
              >
                Clear
              </button>
              <button
                onClick={handleHold}
                disabled={cart.length === 0 || loading}
                className="px-3 h-9 rounded-md border border-input bg-background text-sm font-medium disabled:opacity-50"
              >
                Hold
              </button>
              <button
                onClick={() => setShowCheckout(true)}
                disabled={cart.length === 0}
                className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                Checkout SAR {grandTotal.toFixed(2)}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
