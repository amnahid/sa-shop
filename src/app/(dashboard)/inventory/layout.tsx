import Link from "next/link";
import { PageHeader } from "@/components/app/PageHeader";

const inventoryLinks = [
  { label: "Products", href: "/inventory/products" },
  { label: "Stock", href: "/inventory/stock" },
  { label: "Categories", href: "/inventory/categories" },
  { label: "Suppliers", href: "/inventory/suppliers" },
  { label: "Purchase Orders", href: "/inventory/purchase-orders" },
];

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        section="Inventory"
        breadcrumbs={[{ label: "Inventory" }]}
        description="Manage products, stock, suppliers, and purchase orders."
      />
      <div className="flex flex-wrap gap-2">
        {inventoryLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {item.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
