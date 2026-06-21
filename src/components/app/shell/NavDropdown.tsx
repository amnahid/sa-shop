"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  resolveSidebarIcon,
  type NavigationAvailabilityStatus,
  type SidebarNavigationItem,
} from "./navigation-config";

const NON_NAVIGABLE_STATUSES: NavigationAvailabilityStatus[] = ["coming_soon", "disabled"];

interface NavDropdownProps {
  label: string;
  items: SidebarNavigationItem[];
}

export function NavDropdown({ label, items }: NavDropdownProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = items.some(
    (item) => pathname === item.route || pathname.startsWith(`${item.route}/`)
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = useCallback(
    (item: SidebarNavigationItem) => {
      if (NON_NAVIGABLE_STATUSES.includes(item.status)) return;
      setOpen(false);
      router.push(item.route);
    },
    [router]
  );

  if (items.length === 0) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <span>{label}</span>
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-white border rounded-lg shadow-lg z-50 py-1">
          {items.map((item) => {
            const Icon = resolveSidebarIcon(item.icon);
            const itemActive = pathname === item.route || pathname.startsWith(`${item.route}/`);
            const navigable = !NON_NAVIGABLE_STATUSES.includes(item.status);
            const statusLabel =
              item.status === "coming_soon"
                ? "Soon"
                : item.status === "disabled"
                  ? "Disabled"
                  : null;

            const content = (
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-sm",
                  navigable
                    ? itemActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                    : "text-gray-400 cursor-not-allowed"
                )}
              >
                {Icon && <Icon className="size-4 shrink-0" />}
                <span className="flex-1 truncate">{item.label}</span>
                {statusLabel && (
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
                    {statusLabel}
                  </span>
                )}
              </div>
            );

            return (
              <div key={item.id}>
                {navigable ? (
                  <button
                    onClick={() => handleItemClick(item)}
                    className="w-full text-left"
                  >
                    {content}
                  </button>
                ) : (
                  content
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
