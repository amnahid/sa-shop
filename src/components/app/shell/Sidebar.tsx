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
  if (isRouteActive(pathname, item.route)) {
    return true;
  }

  return item.children?.some((child) => isItemActive(child, pathname)) ?? false;
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
}

export function Sidebar({ mobile = false, onNavigate, membershipRole = null }: SidebarProps) {
  const pathname = usePathname() ?? "";
  const filteredNavigationConfig = useMemo(
    () => filterSidebarNavigationByRole(sidebarNavigationConfig, membershipRole),
    [membershipRole]
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
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    () =>
      filteredNavigationConfig.reduce<Record<string, boolean>>((acc, group) => {
        group.items.forEach((item) => {
          if (item.children?.length) {
            acc[item.id] = false;
          }
        });

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

  function renderNavigationItem(item: SidebarNavigationItem, depth = 0) {
    const Icon = resolveSidebarIcon(item.icon);
    const hasChildren = Boolean(item.children?.length);
    const hasExactMatch = isRouteExact(pathname, item.route);
    const hasNestedMatch = isRouteNested(pathname, item.route);
    const hasActiveChild = item.children?.some((child) => isItemActive(child, pathname)) ?? false;
    const itemActive = hasExactMatch || hasNestedMatch || hasActiveChild;
    const itemExpanded = itemActive || (expandedItems[item.id] ?? false);
    const navigable = isItemNavigable(item.status);
    const statusLabel = getStatusLabel(item.status);
    const childrenPanelId = `${item.id}-children`;

    return (
      <li key={item.id} className={cn(depth > 0 && "pl-6")}>
        <div className="flex items-center gap-1">
          {navigable ? (
            <Link
              href={item.route}
              onClick={onNavigate}
              aria-current={hasExactMatch ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors",
                hasExactMatch
                  ? "bg-sidebar-primary/10 text-sidebar-primary font-semibold"
                  : hasActiveChild
                    ? "bg-sidebar-accent/70 text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground font-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {Icon ? <Icon className="size-4 shrink-0" /> : null}
              <span className="truncate">{item.label}</span>
              {statusLabel ? (
                <span className="ml-auto rounded border border-border/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {statusLabel}
                </span>
              ) : null}
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="flex min-w-0 flex-1 cursor-not-allowed items-center gap-3 rounded-md px-2 py-2 text-sm text-sidebar-foreground/50"
            >
              {Icon ? <Icon className="size-4 shrink-0" /> : null}
              <span className="truncate">{item.label}</span>
              {statusLabel ? (
                <span className="ml-auto rounded border border-border/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sidebar-foreground/60">
                  {statusLabel}
                </span>
              ) : null}
            </span>
          )}

          {hasChildren ? (
              <button
                type="button"
                aria-label={`${itemExpanded ? "Collapse" : "Expand"} ${item.label}`}
                aria-expanded={itemExpanded}
                aria-controls={childrenPanelId}
                onClick={() =>
                  setExpandedItems((previous) => ({
                    ...previous,
                    [item.id]: !(previous[item.id] ?? false),
                }))
              }
              className={cn(
                "rounded-md p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                itemActive && "text-sidebar-primary"
              )}
            >
              <ChevronDown
                className={cn("size-4 transition-transform", itemExpanded && "rotate-180")}
              />
            </button>
          ) : null}
        </div>

        {hasChildren && itemExpanded ? (
          <ul id={childrenPanelId} className="mt-1 space-y-1">
            {item.children?.map((child) => renderNavigationItem(child, depth + 1))}
          </ul>
        ) : null}
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
        <div className="flex items-center justify-between px-2">
          <p
            className={cn(
              "text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70",
              groupActive && "text-sidebar-primary"
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
                "rounded-md p-1 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                groupActive && "text-sidebar-primary"
              )}
            >
              <ChevronDown
                className={cn("size-4 transition-transform", groupExpanded && "rotate-180")}
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
        "h-full flex-col bg-sidebar-background p-5",
        SIDEBAR_WIDTH_CLASS,
        mobile ? "flex" : "hidden lg:flex"
      )}
    >
      <div className="flex h-12 items-center px-2">
        <h1 className="text-lg font-bold">
          <span className="text-primary">SA</span>
          <span className="text-foreground"> SHOP</span>
        </h1>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 space-y-4 overflow-y-auto pt-2">
        {filteredNavigationConfig.map((group) => renderGroup(group))}
      </nav>
    </aside>
  );
}
