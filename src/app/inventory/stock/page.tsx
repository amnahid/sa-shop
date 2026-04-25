"use server";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Product, StockLevel, StockMovement, Branch, Membership } from "@/models";

export default async function StockPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return <div>No active membership</div>;
  }

  const tenantId = membership.tenantId;
  const branches = await Branch.find({ tenantId, active: true }).sort({ name: 1 });
  
  const products = await Product.find({ tenantId, deletedAt: null, trackStock: true }).sort({ name: 1 });
  
  const stockLevels = await StockLevel.find({
    tenantId,
    branchId: { $in: branches.map(b => b._id) },
  });

  const getStock = (productId: string, branchId: string) => {
    const stock = stockLevels.find(
      s => s.productId.toString() === productId && s.branchId.toString() === branchId
    );
    return stock ? parseFloat(stock.quantity.toString()) : 0;
  };

  const selectedBranch = branches.find(b => b.isHeadOffice)?._id.toString() || branches[0]?._id.toString();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Stock</h1>
        <div className="flex gap-2">
          <Link
            href="/inventory/stock/adjust"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-10 px-4 py-2 text-sm font-medium"
          >
            Adjust Stock
          </Link>
          <Link
            href="/inventory/stock/transfer"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-10 px-4 py-2 text-sm font-medium"
          >
            Transfer
          </Link>
          <Link
            href="/inventory/branches"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium"
          >
            Branches
          </Link>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 text-sm font-medium">Product</th>
              {branches.map(b => (
                <th key={b._id.toString()} className="text-right p-3 text-sm font-medium">{b.name}</th>
              ))}
              <th className="text-right p-3 text-sm font-medium">Total</th>
              <th className="text-right p-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={branches.length + 3} className="p-6 text-center text-muted-foreground">
                  No products with stock tracking
                </td>
              </tr>
            ) : (
              products.map(product => {
                const total = branches.reduce((sum, b) => sum + getStock(product._id.toString(), b._id.toString()), 0);
                return (
                  <tr key={product._id.toString()} className="border-t">
                    <td className="p-3 text-sm">
                      {product.name}
                      <span className="block text-xs text-muted-foreground">{product.sku}</span>
                    </td>
                    {branches.map(branch => {
                      const stock = getStock(product._id.toString(), branch._id.toString());
                      const isLow = stock <= product.lowStockThreshold;
                      return (
                        <td key={branch._id.toString()} className="p-3 text-sm text-right">
                          <span className={isLow && stock > 0 ? "text-red-600 font-medium" : ""}>
                            {stock}
                          </span>
                          {isLow && stock > 0 && <span className="text-red-500 ml-1">⚠</span>}
                        </td>
                      );
                    })}
                    <td className="p-3 text-sm text-right font-medium">{total}</td>
                    <td className="p-3 text-sm text-right">
                      <Link
                        href={`/inventory/stock/${product._id}`}
                        className="text-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
        <span>⚠ = Low stock</span>
        <span>• Click "View" for detailed history</span>
      </div>
    </div>
  );
}