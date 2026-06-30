import type { LucideIcon } from "lucide-react";
import {
  canAccessPermission,
  permissionRoleDefaults,
  type AppPermissionKey,
  type PermissionOverrides,
} from "@/lib/utils/permissions";
import {
  ArrowRightLeft,
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
  TrendingUp,
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
  salesReport: FileText,
  stockMovements: ArrowRightLeft,
  lowStock: Package,
  profitMargin: TrendingUp,
  settings: Settings,
  branches: Building2,
  team: UserCog,
  accounting: Wallet,
  hr: UserCog,
  employees: Users,
  payroll: Wallet,
  trialBalance: ClipboardList,
  marketing: Megaphone,
  integrations: Bot,
  ai: Brain,
  files: FileText,
  media: Image,
  emailTemplates: Mail,
  notificationTemplates: BellRing,
  notifications: BellRing,
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
    defaultExpanded: false,
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
    ],
  },
  {
    id: "insights",
    label: "Insights",
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        id: "report-sales",
        label: "Sales Report",
        route: "/reports/sales",
        icon: "salesReport",
        status: "ready",
        permissionKey: "reports.sales:view",
      },
      {
        id: "report-stock-movements",
        label: "Stock Movements",
        route: "/reports/stock-movements",
        icon: "stockMovements",
        status: "ready",
        permissionKey: "reports.stockMovements:view",
      },
      {
        id: "report-low-stock",
        label: "Low Stock Alerts",
        route: "/reports/low-stock",
        icon: "lowStock",
        status: "ready",
        permissionKey: "reports.lowStock:view",
      },
      {
        id: "report-profit",
        label: "Profit & Margin",
        route: "/reports/profit",
        icon: "profitMargin",
        status: "ready",
        permissionKey: "reports.profit:view",
      },
      {
        id: "notifications",
        label: "Notifications",
        route: "/notifications",
        icon: "notifications",
        status: "ready",
        permissionKey: "notifications:view",
      },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    collapsible: true,
    defaultExpanded: false,
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
        id: "accounting-trial-balance",
        label: "Trial Balance",
        route: "/accounting/trial-balance",
        icon: "trialBalance",
        status: "ready",
        permissionKey: "accounting:view",
      },
    ],
  },
  {
    id: "hrm",
    label: "Human Resources",
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        id: "hr-employees",
        label: "Employees",
        route: "/hr-payroll/employees",
        icon: "employees",
        status: "ready",
        permissionKey: "hr:view",
      },
      {
        id: "hr-salary-payments",
        label: "Salary Payments",
        route: "/hr-payroll/salary-payments",
        icon: "payroll",
        status: "ready",
        permissionKey: "hr:view",
      },
    ],
  },
  {
    id: "system-admin",
    label: "System Admin",
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        id: "tenant-management",
        label: "Manage Tenants",
        route: "/settings/tenants",
        icon: "branches",
        status: "ready",
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
