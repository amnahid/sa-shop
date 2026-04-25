import Link from "next/link";
import { auth } from "@/lib/auth";
import { Product, Category, Membership, StockLevel, Branch } from "@/models";
import { generateSKU } from "@/lib/utils/csv";

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return <div>Please log in</div>;
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return <div>No active membership</div>;
  }

  const tenantId = membership.tenantId;

  const products = await Product.find({ tenantId, deletedAt: null })
    .populate("categoryId")
    .sort({ name: 1 });

  const categories = await Category.find({ tenantId, deletedAt: null, parentId: null })
    .sort({ name: 1 });

  const branches = await Branch.find({ tenantId, active: true });

  const stockLevels = await StockLevel.find({
    tenantId,
    branchId: { $in: branches.map((b) => b._id) },
  });

  const getStock = (productId: string) => {
    const headOffice = branches.find((b) => b.isHeadOffice);
    if (!headOffice) return 0;
    const stock = stockLevels.find(
      (s) => s.productId.toString() === productId && s.branchId.toString() === headOffice._id.toString()
    );
    return stock ? parseFloat(stock.quantity.toString()) : 0;
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Products</h1>
        <div className="flex gap-2">
          <Link
            href="/inventory/categories"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-10 px-4 py-2 text-sm font-medium"
          >
            Categories
          </Link>
          <Link
            href="/inventory/products/add"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium"
          >
            Add Product
          </Link>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 text-sm font-medium">SKU</th>
              <th className="text-left p-3 text-sm font-medium">Name</th>
              <th className="text-left p-3 text-sm font-medium">Category</th>
              <th className="text-right p-3 text-sm font-medium">Price</th>
              <th className="text-right p-3 text-sm font-medium">Stock</th>
              <th className="text-right p-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No products yet.{" "}
                  <Link href="/inventory/products/add" className="text-primary hover:underline">
                    Add your first product
                  </Link>
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product._id.toString()} className="border-t">
                  <td className="p-3 text-sm font-mono">{product.sku}</td>
                  <td className="p-3 text-sm">
                    {product.name}
                    {product.nameAr && (
                      <span className="block text-xs text-muted-foreground" dir="rtl">
                        {product.nameAr}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    {product.categoryId ? (product.categoryId as any).name : "-"}
                  </td>
                  <td className="p-3 text-sm text-right">
                    SAR {parseFloat(product.sellingPrice.toString()).toFixed(2)}
                  </td>
                  <td className="p-3 text-sm text-right">
                    {product.trackStock ? (
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          getStock(product._id.toString()) <= product.lowStockThreshold
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {getStock(product._id.toString())}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-3 text-sm text-right">
                    <Link
                      href={`/inventory/products/${product._id}`}
                      className="text-primary hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}