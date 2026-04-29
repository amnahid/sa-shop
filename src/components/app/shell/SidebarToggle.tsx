"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";
import type { NavigationPermissionKey, SidebarMembershipRole } from "./navigation-config";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface SidebarToggleProps {
  membershipRole?: SidebarMembershipRole | null;
  membershipPermissionOverrides?: Partial<Record<NavigationPermissionKey, boolean>>;
}

export function SidebarToggle({
  membershipRole = null,
  membershipPermissionOverrides,
}: SidebarToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button aria-label="Open menu" className="rounded-md p-2 hover:bg-accent lg:hidden">
          <Menu className="size-5" />
        </button>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="left-0 top-0 z-50 h-dvh w-60 max-w-[85vw] -translate-x-0 -translate-y-0 rounded-none border-r bg-sidebar-background p-0"
      >
        <DialogTitle className="sr-only">Navigation menu</DialogTitle>
        <DialogDescription className="sr-only">
          Use the sidebar links to navigate dashboard sections.
        </DialogDescription>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute right-2 top-2 z-10 rounded-md p-2 hover:bg-sidebar-accent"
        >
          <X className="size-5" />
        </button>
        <Sidebar
          mobile
          onNavigate={() => setOpen(false)}
          membershipRole={membershipRole}
          membershipPermissionOverrides={membershipPermissionOverrides}
        />
      </DialogContent>
    </Dialog>
  );
}
