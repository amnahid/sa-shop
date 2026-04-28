"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { processSale, holdSale } from "@/lib/actions/pos";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

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
  const [products, setProducts] = useState(initialProducts);
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
    fd.set("retainerId", sourceRetainer?._id || "");
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
              className="w-full h-11 rounded-md border border-gray-200 bg-white px-4 text-sm text-gray-700 focus:border-primary outline-none shadow-sm"
            />
          </div>
          <div className="w-64">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full h-11 rounded-md border border-gray-200 bg-white px-4 text-sm text-gray-700 focus:border-primary outline-none shadow-sm appearance-none"
            >
              <option value="">All categories</option>
              {categories.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="w-64">
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="w-full h-11 rounded-md border border-gray-200 bg-white px-4 text-sm text-gray-700 focus:border-primary outline-none shadow-sm appearance-none"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b._id} value={b._id}>{b.name}</option>
              ))}
            </select>
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
                    className="group flex flex-col bg-white border border-gray-100 rounded-md overflow-hidden hover:shadow-md transition-all text-left h-[300px] shadow-sm"
                  >
                    <div className="relative w-full h-[180px] p-4 bg-white flex items-center justify-center">
                      <span className={cn("absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-[3px]", stockBadgeClass)}>
                        {stockText}
                      </span>
                      {p.imageUrls[0] ? (
                        <img src={p.imageUrls[0]} alt={p.name} className="max-w-full max-h-full object-contain" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold text-xl">
                          {p.name.charAt(0)}
                        </div>
                      )}
                      <span className="absolute bottom-2 left-2 bg-[#ffc519] text-[#111723] text-[10px] font-semibold px-2 py-0.5 rounded-[3px]">
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
            <select className="w-full h-11 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-600 focus:border-primary outline-none appearance-none cursor-pointer">
              <option>Walk In Customer</option>
              {selectedCustomer && <option value={selectedCustomer._id}>{selectedCustomer.name}</option>}
            </select>
          </div>
          <button className="w-11 h-11 rounded-md bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          </button>
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
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-1">SAR {item.unitPrice.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-gray-50 rounded border border-gray-200">
                      <button onClick={() => updateQty(item.productId, -1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200">−</button>
                      <span className="w-8 text-center text-sm font-medium text-gray-800">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, 1)} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200">+</button>
                    </div>
                    <button onClick={() => removeItem(item.productId)} className="w-8 h-8 rounded-md flex items-center justify-center text-red-500 hover:bg-red-50 ml-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                  <div className="text-sm font-bold text-gray-800 text-right w-20">
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
              <span className="font-bold text-gray-900">SAR 0.00</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Discount</span>
              <span className="font-bold text-gray-900">SAR 0.00</span>
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
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full h-11 rounded-md border border-gray-200 bg-white px-3 text-sm focus:border-primary outline-none"
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
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Cash Received</label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={e => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-11 rounded-md border border-gray-200 bg-white px-3 text-sm focus:border-primary outline-none"
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
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
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
                    className="w-full h-11 rounded-md border border-gray-200 bg-white px-3 text-sm focus:border-primary outline-none"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 h-11 rounded-md border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
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
              <button className="flex-1 h-11 rounded-md border border-gray-200 bg-white text-gray-700 text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors">
                Shipping <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <button className="flex-1 h-11 rounded-md border border-gray-200 bg-white text-gray-700 text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-colors">
                Discount <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
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
