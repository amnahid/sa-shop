"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  filterSidebarNavigationByRole,
  resolveSidebarIcon,
  sidebarNavigationConfig,
  type NavigationAvailabilityStatus,
  type NavigationPermissionKey,
  type SidebarMembershipRole,
  type SidebarNavigationGroup,
  type SidebarNavigationItem,
} from "./navigation-config";

const NON_NAVIGABLE_STATUSES: NavigationAvailabilityStatus[] = ["coming_soon", "disabled"];

const SIDEBAR_WIDTH_CLASS = "w-60";

function isRouteExact(pathname: string, route: string) {
  return pathname === route;
}

function isRouteNested(pathname: string, route: string) {
  return pathname.startsWith(`${route}/`);
}

function isRouteActive(pathname: string, route: string) {
  return isRouteExact(pathname, route) || isRouteNested(pathname, route);
}

function isItemActive(item: SidebarNavigationItem, pathname: string): boolean {
  return isRouteActive(pathname, item.route);
}

function isItemNavigable(status: NavigationAvailabilityStatus) {
  return !NON_NAVIGABLE_STATUSES.includes(status);
}

function getStatusLabel(status: NavigationAvailabilityStatus) {
  if (status === "coming_soon") {
    return "Soon";
  }

  if (status === "disabled") {
    return "Disabled";
  }

  return null;
}

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
  membershipRole?: SidebarMembershipRole | null;
  membershipPermissionOverrides?: Partial<Record<NavigationPermissionKey, boolean>>;
  logoUrl?: string | null;
}

export function Sidebar({
  mobile = false,
  onNavigate,
  membershipRole = null,
  membershipPermissionOverrides,
  logoUrl,
}: SidebarProps) {
  const pathname = usePathname() ?? "";
  const filteredNavigationConfig = useMemo(
    () =>
      filterSidebarNavigationByRole(
        sidebarNavigationConfig,
        membershipRole,
        membershipPermissionOverrides
      ),
    [membershipRole, membershipPermissionOverrides]
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () =>
      filteredNavigationConfig.reduce<Record<string, boolean>>((acc, group) => {
        if (group.collapsible) {
          acc[group.id] = group.defaultExpanded ?? false;
        }

        return acc;
      }, {})
  );
  
  const activeGroupIds = useMemo(
    () =>
      new Set(
        filteredNavigationConfig
          .filter((group) => group.items.some((item) => isItemActive(item, pathname)))
          .map((group) => group.id)
      ),
    [filteredNavigationConfig, pathname]
  );

  function renderNavigationItem(item: SidebarNavigationItem) {
    const Icon = resolveSidebarIcon(item.icon);
    const hasExactMatch = isRouteExact(pathname, item.route);
    const hasNestedMatch = isRouteNested(pathname, item.route);
    const itemActive = hasExactMatch || hasNestedMatch;
    const navigable = isItemNavigable(item.status);
    const statusLabel = getStatusLabel(item.status);

    return (
      <li key={item.id}>
        <div className="flex items-center gap-1">
          {navigable ? (
            <Link
              href={item.route}
              onClick={onNavigate}
              aria-current={hasExactMatch ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                hasExactMatch
                  ? "bg-primary text-primary-foreground font-semibold"
                  : itemActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground font-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {Icon ? <Icon className="size-4 shrink-0" /> : null}
              <span className="truncate">{item.label}</span>
              {statusLabel ? (
                <span className="ml-auto rounded border border-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/60">
                  {statusLabel}
                </span>
              ) : null}
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="flex min-w-0 flex-1 cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/40"
            >
              {Icon ? <Icon className="size-4 shrink-0" /> : null}
              <span className="truncate">{item.label}</span>
              {statusLabel ? (
                <span className="ml-auto rounded border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-white/30">
                  {statusLabel}
                </span>
              ) : null}
            </span>
          )}
        </div>
      </li>
    );
  }

  function renderGroup(group: SidebarNavigationGroup) {
    const groupActive = activeGroupIds.has(group.id);
    const groupExpanded = group.collapsible
      ? groupActive || (expandedGroups[group.id] ?? false)
      : true;
    const groupPanelId = `${group.id}-group-items`;

    return (
      <section key={group.id} className="space-y-1">
        <div className="flex items-center justify-between px-3 mb-1">
          <p
            className={cn(
              "text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/50",
              groupActive && "text-primary/80"
            )}
          >
            {group.label}
          </p>
          {group.collapsible ? (
            <button
              type="button"
              aria-label={`${groupExpanded ? "Collapse" : "Expand"} ${group.label}`}
              aria-expanded={groupExpanded}
              aria-controls={groupPanelId}
              onClick={() =>
                setExpandedGroups((previous) => ({
                  ...previous,
                  [group.id]: !(previous[group.id] ?? false),
                }))
              }
              className={cn(
                "rounded-md p-1 text-sidebar-foreground/40 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                groupActive && "text-primary/60"
              )}
            >
              <ChevronDown
                className={cn("size-3 transition-transform", groupExpanded && "rotate-180")}
              />
            </button>
          ) : null}
        </div>
        {groupExpanded ? (
          <ul id={groupPanelId} className="space-y-1">
            {group.items.map((item) => renderNavigationItem(item))}
          </ul>
        ) : null}
      </section>
    );
  }

  return (
    <aside
      className={cn(
        "h-full flex-col bg-sidebar-background p-4",
        SIDEBAR_WIDTH_CLASS,
        mobile ? "flex" : "hidden lg:flex"
      )}
    >
      <div className="flex h-12 items-center px-2 mb-6 mt-2">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="max-h-10 max-w-[180px] object-contain" />
        ) : (
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-primary">e</span>
            <span className="text-white">Shop</span>
          </h1>
        )}
      </div>

      <nav aria-label="Primary navigation" className="flex-1 space-y-6 overflow-y-auto pt-2">
        {filteredNavigationConfig.map((group) => renderGroup(group))}
      </nav>
    </aside>
  );
}
