import { getCurrentMembership } from "@/lib/utils/membership";
import { Category } from "@/models";
import { PageHeader } from "@/components/app/PageHeader";
import { ProductForm } from "@/components/inventory/ProductForm";

export default async function AddProductPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  const tenantId = membership.tenantId;
  const categories = await Category.find({ tenantId, deletedAt: null }).sort({ name: 1 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Product"
        section="Inventory"
        breadcrumbs={[
          { label: "Products", href: "/inventory/products" },
          { label: "Add Product" },
        ]}
        description="Register a new product in your catalog with pricing, stock tracking, and gallery."
      />

      <ProductForm categories={categories} />
    </div>
  );
}
