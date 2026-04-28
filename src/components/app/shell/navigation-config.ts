import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Boxes,
  Brain,
  Building2,
  ClipboardList,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Megaphone,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import type { MembershipRole } from "@/lib/utils/membership-roles";

export type NavigationAvailabilityStatus = "ready" | "coming_soon" | "disabled";
export type NavigationPermissionKey = string;
export type SidebarMembershipRole = MembershipRole;

export const sidebarIconMap = {
  dashboard: LayoutDashboard,
  pos: ShoppingCart,
  invoices: ReceiptText,
  customers: Users,
  inventory: Package,
  products: Boxes,
  stock: FolderOpen,
  suppliers: Truck,
  purchaseOrders: ClipboardList,
  reports: BarChart3,
  settings: Settings,
  branches: Building2,
  team: UserCog,
  accounting: Wallet,
  hr: UserCog,
  marketing: Megaphone,
  integrations: Bot,
  ai: Brain,
  files: FileText,
} as const;

export type SidebarIconKey = keyof typeof sidebarIconMap;
export type SidebarIconValue = SidebarIconKey | LucideIcon;

export interface SidebarNavigationItem {
  id: string;
  label: string;
  route: `/${string}`;
  icon?: SidebarIconValue;
  status: NavigationAvailabilityStatus;
  permissionKey?: NavigationPermissionKey;
  children?: SidebarNavigationItem[];
}

export interface SidebarNavigationGroup {
  id: string;
  label: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  status?: NavigationAvailabilityStatus;
  permissionKey?: NavigationPermissionKey;
  items: SidebarNavigationItem[];
}

const ALL_MEMBERSHIP_ROLES: SidebarMembershipRole[] = ["owner", "manager", "cashier"];
const MANAGEMENT_MEMBERSHIP_ROLES: SidebarMembershipRole[] = ["owner", "manager"];
const OWNER_MEMBERSHIP_ROLES: SidebarMembershipRole[] = ["owner"];

export const sidebarPermissionDefinitions: Record<
  NavigationPermissionKey,
  readonly SidebarMembershipRole[]
> = {
  "dashboard:view": ALL_MEMBERSHIP_ROLES,
  "pos:view": ALL_MEMBERSHIP_ROLES,
  "pos.invoices:view": ALL_MEMBERSHIP_ROLES,
  "customers:view": ALL_MEMBERSHIP_ROLES,
  "inventory.products:view": ALL_MEMBERSHIP_ROLES,
  "inventory.stock:view": ALL_MEMBERSHIP_ROLES,
  "inventory.stock.adjust": ALL_MEMBERSHIP_ROLES,
  "inventory.stock.transfer": ALL_MEMBERSHIP_ROLES,
  "inventory.categories:view": ALL_MEMBERSHIP_ROLES,
  "inventory.suppliers:view": ALL_MEMBERSHIP_ROLES,
  "inventory.purchaseOrders:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "inventory.branches:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "reports:view": ALL_MEMBERSHIP_ROLES,
  "reports.sales:view": ALL_MEMBERSHIP_ROLES,
  "reports.profit:view": ALL_MEMBERSHIP_ROLES,
  "reports.lowStock:view": ALL_MEMBERSHIP_ROLES,
  "reports.stockMovements:view": ALL_MEMBERSHIP_ROLES,
  "settings:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "settings.profile:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "settings.team:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "settings.branches:view": MANAGEMENT_MEMBERSHIP_ROLES,
  "accounting:view": OWNER_MEMBERSHIP_ROLES,
  "hr:view": OWNER_MEMBERSHIP_ROLES,
  "promotions:view": OWNER_MEMBERSHIP_ROLES,
  "integrations:view": OWNER_MEMBERSHIP_ROLES,
  "ai:view": OWNER_MEMBERSHIP_ROLES,
};

export const sidebarNavigationConfig: SidebarNavigationGroup[] = [
  {
    id: "overview",
    label: "Overview",
    defaultExpanded: true,
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        route: "/dashboard",
        icon: "dashboard",
        status: "ready",
        permissionKey: "dashboard:view",
      },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    collapsible: true,
    defaultExpanded: true,
    items: [
      {
        id: "pos",
        label: "Point of Sale",
        route: "/pos",
        icon: "pos",
        status: "ready",
        permissionKey: "pos:view",
        children: [
          {
            id: "pos-invoices",
            label: "Invoices",
            route: "/pos/invoices",
            icon: "invoices",
            status: "ready",
            permissionKey: "pos.invoices:view",
          },
        ],
      },
      {
        id: "customers",
        label: "Customers",
        route: "/customers",
        icon: "customers",
        status: "ready",
        permissionKey: "customers:view",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    collapsible: true,
    defaultExpanded: true,
    items: [
      {
        id: "products",
        label: "Products",
        route: "/inventory/products",
        icon: "products",
        status: "ready",
        permissionKey: "inventory.products:view",
      },
      {
        id: "stock",
        label: "Stock",
        route: "/inventory/stock",
        icon: "stock",
        status: "ready",
        permissionKey: "inventory.stock:view",
        children: [
          {
            id: "stock-adjust",
            label: "Adjustments",
            route: "/inventory/stock/adjust",
            status: "ready",
            permissionKey: "inventory.stock.adjust",
          },
          {
            id: "stock-transfer",
            label: "Transfers",
            route: "/inventory/stock/transfer",
            status: "ready",
            permissionKey: "inventory.stock.transfer",
          },
        ],
      },
      {
        id: "categories",
        label: "Categories",
        route: "/inventory/categories",
        icon: "inventory",
        status: "ready",
        permissionKey: "inventory.categories:view",
      },
      {
        id: "suppliers",
        label: "Suppliers",
        route: "/inventory/suppliers",
        icon: "suppliers",
        status: "ready",
        permissionKey: "inventory.suppliers:view",
      },
      {
        id: "purchase-orders",
        label: "Purchase Orders",
        route: "/inventory/purchase-orders",
        icon: "purchaseOrders",
        status: "ready",
        permissionKey: "inventory.purchaseOrders:view",
      },
      {
        id: "branch-inventory",
        label: "Branch Inventory",
        route: "/inventory/branches",
        icon: "branches",
        status: "ready",
        permissionKey: "inventory.branches:view",
      },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    collapsible: true,
    defaultExpanded: true,
    items: [
      {
        id: "reports",
        label: "Reports",
        route: "/reports",
        icon: "reports",
        status: "ready",
        permissionKey: "reports:view",
        children: [
          {
            id: "reports-sales",
            label: "Sales",
            route: "/reports/sales",
            status: "ready",
            permissionKey: "reports.sales:view",
          },
          {
            id: "reports-profit",
            label: "Profit",
            route: "/reports/profit",
            status: "ready",
            permissionKey: "reports.profit:view",
          },
          {
            id: "reports-low-stock",
            label: "Low Stock",
            route: "/reports/low-stock",
            status: "ready",
            permissionKey: "reports.lowStock:view",
          },
          {
            id: "reports-stock-movements",
            label: "Stock Movements",
            route: "/reports/stock-movements",
            status: "ready",
            permissionKey: "reports.stockMovements:view",
          },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        id: "settings",
        label: "Settings",
        route: "/settings",
        icon: "settings",
        status: "ready",
        permissionKey: "settings:view",
        children: [
          {
            id: "settings-profile",
            label: "Profile",
            route: "/settings/profile",
            status: "ready",
            permissionKey: "settings.profile:view",
          },
          {
            id: "settings-team",
            label: "Team",
            route: "/settings/team",
            icon: "team",
            status: "ready",
            permissionKey: "settings.team:view",
          },
          {
            id: "settings-branches",
            label: "Branches",
            route: "/settings/branches",
            icon: "branches",
            status: "ready",
            permissionKey: "settings.branches:view",
          },
        ],
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    collapsible: true,
    defaultExpanded: true,
    items: [
      {
        id: "accounting",
        label: "Accounting",
        route: "/accounting",
        icon: "accounting",
        status: "ready",
        permissionKey: "accounting:view",
        children: [
          {
            id: "accounting-chart-of-accounts",
            label: "Chart of Accounts",
            route: "/accounting/chart-of-accounts",
            status: "ready",
            permissionKey: "accounting:view",
          },
          {
            id: "accounting-entries",
            label: "Revenue & Expenses",
            route: "/accounting/entries",
            status: "ready",
            permissionKey: "accounting:view",
          },
          {
            id: "accounting-payments",
            label: "Payments",
            route: "/accounting/payments",
            status: "ready",
            permissionKey: "accounting:view",
          },
          {
            id: "accounting-reports",
            label: "Reports",
            route: "/accounting/reports",
            status: "ready",
            permissionKey: "accounting:view",
          },
        ],
      },
    ],
  },
  {
    id: "upcoming",
    label: "Coming Next",
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        id: "hr-payroll",
        label: "HR & Payroll",
        route: "/hr-payroll",
        icon: "hr",
        status: "coming_soon",
        permissionKey: "hr:view",
      },
      {
        id: "promotions",
        label: "Promotions",
        route: "/promotions",
        icon: "marketing",
        status: "coming_soon",
        permissionKey: "promotions:view",
      },
      {
        id: "integrations",
        label: "Integrations",
        route: "/integrations",
        icon: "integrations",
        status: "coming_soon",
        permissionKey: "integrations:view",
      },
      {
        id: "ai-insights",
        label: "AI Insights",
        route: "/ai-insights",
        icon: "ai",
        status: "coming_soon",
        permissionKey: "ai:view",
      },
    ],
  },
];

export function resolveSidebarIcon(icon?: SidebarIconValue): LucideIcon | undefined {
  if (!icon) {
    return undefined;
  }

  return typeof icon === "string" ? sidebarIconMap[icon] : icon;
}

export function canAccessSidebarPermission(
  permissionKey: NavigationPermissionKey | undefined,
  role: SidebarMembershipRole | null | undefined
) {
  if (!permissionKey) {
    return true;
  }

  if (!role) {
    return false;
  }

  const allowedRoles = sidebarPermissionDefinitions[permissionKey];
  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(role);
}

function filterSidebarNavigationItem(
  item: SidebarNavigationItem,
  role: SidebarMembershipRole | null | undefined
): SidebarNavigationItem | null {
  if (!canAccessSidebarPermission(item.permissionKey, role)) {
    return null;
  }

  const filteredChildren = item.children
    ?.map((child) => filterSidebarNavigationItem(child, role))
    .filter((child): child is SidebarNavigationItem => child !== null);

  return {
    ...item,
    children: filteredChildren?.length ? filteredChildren : undefined,
  };
}

export function filterSidebarNavigationByRole(
  groups: SidebarNavigationGroup[],
  role: SidebarMembershipRole | null | undefined
): SidebarNavigationGroup[] {
  return groups
    .filter((group) => canAccessSidebarPermission(group.permissionKey, role))
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => filterSidebarNavigationItem(item, role))
        .filter((item): item is SidebarNavigationItem => item !== null),
    }))
    .filter((group) => group.items.length > 0);
}
