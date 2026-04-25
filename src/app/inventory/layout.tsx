import Link from "next/link";
import { Package, Folder } from "lucide-react";

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r bg-sidebar-background py-4">
        <nav className="space-y-1 px-2">
          <Link
            href="/inventory/products"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Package className="size-5" />
            Products
          </Link>
          <Link
            href="/inventory/categories"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Folder className="size-5" />
            Categories
          </Link>
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}