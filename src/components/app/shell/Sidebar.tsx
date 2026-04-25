"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  ClipboardList,
  Users,
  FileText,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "POS", href: "/pos", icon: ShoppingCart },
  { name: "Products", href: "/inventory/products", icon: Package },
  { name: "Suppliers", href: "/inventory/suppliers", icon: Truck },
  { name: "Purchase Orders", href: "/inventory/purchase-orders", icon: ClipboardList },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col bg-sidebar-background p-2">
      <div className="flex h-12 items-center px-2">
        <h1 className="text-lg font-bold">
          <span className="text-primary">SA</span>
          <span className="text-foreground"> SHOP</span>
        </h1>
      </div>

      <nav className="flex-1 space-y-1 pt-2">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-primary/10 text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground font-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
