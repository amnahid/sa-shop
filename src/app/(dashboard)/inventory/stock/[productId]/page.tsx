

import mongoose from "mongoose";
import Link from "next/link";
import { Product, StockLevel, StockMovement, Branch } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";

interface Props {
  params: Promise<{ productId: string }>;
}

export default async function ProductStockPage({ params }: Props) {
  const { productId } = await params;

  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;

  const tenantId = membership.tenantId;

  const product = await Product.findOne({ _id: productId, tenantId });
  if (!product) {
    return <div>Product not found</div>;
  }

  const branches = await Branch.find({ tenantId, active: true }).sort({ name: 1 });

  const stockLevels = await StockLevel.find({
    tenantId,
    productId: new mongoose.Types.ObjectId(productId),
    branchId: { $in: branches.map(b => b._id) },
  });

  const movements = await StockMovement.find({
    tenantId,
    productId: new mongoose.Types.ObjectId(productId),
  }).sort({ createdAt: -1 }).limit(50);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
          <p className="text-muted-foreground">SKU: {product.sku}</p>
        </div>
        <Link href="/inventory/stock" className="text-primary hover:underline">← Back to Stock</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Stock by Branch</h2>
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2 text-sm font-medium">Branch</th>
                <th className="text-right p-2 text-sm font-medium">Quantity</th>
                <th className="text-right p-2 text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {branches.map(branch => {
                const stock = stockLevels.find(s => s.branchId.toString() === branch._id.toString());
                const qty = stock ? parseFloat(stock.quantity.toString()) : 0;
                const isLow = qty > 0 && qty <= product.lowStockThreshold;
                const isZero = qty === 0;

                return (
                  <tr key={branch._id.toString()} className="border-t">
                    <td className="p-2">{branch.name}</td>
                    <td className="p-2 text-right font-medium">{qty}</td>
                    <td className="p-2 text-right">
                      {isZero ? (
                        <span className="text-red-600 text-sm">Out of stock</span>
                      ) : isLow ? (
                        <span className="text-yellow-600 text-sm">Low</span>
                      ) : (
                        <span className="text-green-600 text-sm">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Product Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Unit</dt>
              <dd>{product.unit}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Price</dt>
              <dd>SAR {parseFloat(product.sellingPrice.toString()).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">VAT Rate</dt>
              <dd>{(product.vatRate * 100).toFixed(0)}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Track Stock</dt>
              <dd>{product.trackStock ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Low Threshold</dt>
              <dd>{product.lowStockThreshold}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Expiry Tracking</dt>
              <dd>{product.expiryTracking ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-6 bg-card border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Recent Stock Movements</h2>
        {movements.length === 0 ? (
          <p className="text-muted-foreground text-sm">No movements yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2">Date</th>
                <th className="text-left p-2">Branch</th>
                <th className="text-left p-2">Type</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-left p-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {movements.map(m => {
                const branch = branches.find(b => b._id.toString() === m.branchId?.toString());
                const typeLabels: Record<string, string> = {
                  sale: "Sale",
                  refund: "Refund",
                  purchase: "Purchase",
                  adjustment: "Adjustment",
                  transfer_out: "Transfer Out",
                  transfer_in: "Transfer In",
                  waste: "Waste",
                  expired: "Expired",
                };
                const qty = parseFloat(m.quantityDelta.toString());

                return (
                  <tr key={m._id.toString()} className="border-t">
                    <td className="p-2">{m.createdAt.toLocaleDateString()}</td>
                    <td className="p-2">{branch?.name || "-"}</td>
                    <td className="p-2">{typeLabels[m.type] || m.type}</td>
                    <td className={`p-2 text-right ${qty > 0 ? "text-green-600" : "text-red-600"}`}>
                      {qty > 0 ? "+" : ""}{qty}
                    </td>
                    <td className="p-2 text-muted-foreground">{m.reason || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
