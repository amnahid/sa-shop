import type { LucideIcon } from "lucide-react";
import {
  canAccessPermission,
  permissionRoleDefaults,
  type AppPermissionKey,
  type PermissionOverrides,
} from "@/lib/utils/permissions";
import {
  BarChart3,
  Bot,
  Boxes,
  Brain,
  Building2,
  BellRing,
  ClipboardList,
  FileText,
  FolderOpen,
  Image,
  LayoutDashboard,
  Mail,
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
export type NavigationPermissionKey = AppPermissionKey;
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
  proposals: FileText,
  retainers: ClipboardList,
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
  media: Image,
  emailTemplates: Mail,
  notificationTemplates: BellRing,
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

export const sidebarPermissionDefinitions: Record<
  NavigationPermissionKey,
  readonly SidebarMembershipRole[]
> = permissionRoleDefaults;

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
      },
      {
        id: "pos-invoices",
        label: "Invoices",
        route: "/pos/invoices",
        icon: "invoices",
        status: "ready",
        permissionKey: "pos.invoices:view",
      },
      {
        id: "sales-proposals",
        label: "Proposals",
        route: "/proposals",
        icon: "proposals",
        status: "ready",
        permissionKey: "sales.proposals:view",
      },
      {
        id: "sales-retainers",
        label: "Retainers",
        route: "/retainers",
        icon: "retainers",
        status: "ready",
        permissionKey: "sales.retainers:view",
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
      },
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
      },
      {
        id: "reports-sales",
        label: "Sales Reports",
        route: "/reports/sales",
        status: "ready",
        permissionKey: "reports.sales:view",
      },
      {
        id: "reports-profit",
        label: "Profit Reports",
        route: "/reports/profit",
        status: "ready",
        permissionKey: "reports.profit:view",
      },
      {
        id: "reports-low-stock",
        label: "Low Stock Reports",
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
      },
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
      {
        id: "settings-admin",
        label: "Admin",
        route: "/settings/admin",
        icon: "team",
        status: "ready",
        permissionKey: "settings.admin:view",
      },
      {
        id: "settings-media-library",
        label: "Media Library",
        route: "/settings/media-library",
        icon: "media",
        status: "ready",
        permissionKey: "settings.media:view",
      },
      {
        id: "settings-email-templates",
        label: "Email Templates",
        route: "/settings/email-templates",
        icon: "emailTemplates",
        status: "ready",
        permissionKey: "settings.templates.email:view",
      },
      {
        id: "settings-notification-templates",
        label: "Notification Templates",
        route: "/settings/notification-templates",
        icon: "notificationTemplates",
        status: "ready",
        permissionKey: "settings.templates.notification:view",
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
      },
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
        label: "Accounting Reports",
        route: "/accounting/reports",
        status: "ready",
        permissionKey: "accounting:view",
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
  role: SidebarMembershipRole | null | undefined,
  permissionOverrides?: PermissionOverrides
) {
  return canAccessPermission(permissionKey, role, permissionOverrides);
}

function filterSidebarNavigationItem(
  item: SidebarNavigationItem,
  role: SidebarMembershipRole | null | undefined,
  permissionOverrides?: PermissionOverrides
): SidebarNavigationItem | null {
  if (!canAccessSidebarPermission(item.permissionKey, role, permissionOverrides)) {
    return null;
  }

  return item;
}

export function filterSidebarNavigationByRole(
  groups: SidebarNavigationGroup[],
  role: SidebarMembershipRole | null | undefined,
  permissionOverrides?: PermissionOverrides
): SidebarNavigationGroup[] {
  return groups
    .filter((group) => canAccessSidebarPermission(group.permissionKey, role, permissionOverrides))
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => filterSidebarNavigationItem(item, role, permissionOverrides))
        .filter((item): item is SidebarNavigationItem => item !== null),
    }))
    .filter((group) => group.items.length > 0);
}
