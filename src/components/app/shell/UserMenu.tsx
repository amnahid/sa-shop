"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { 
  LogOut, 
  User, 
  Settings, 
  Users, 
  ShieldCheck, 
  Image as ImageIcon, 
  Mail, 
  Bell,
  Building2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  canAccessSidebarPermission, 
  type NavigationPermissionKey, 
  type SidebarMembershipRole 
} from "./navigation-config";

interface UserMenuProps {
  name?: string | null;
  email?: string | null;
  role?: SidebarMembershipRole | null;
  permissionOverrides?: Partial<Record<NavigationPermissionKey, boolean>>;
}

export function UserMenu({ name, email, role, permissionOverrides }: UserMenuProps) {
  const canViewSettings = canAccessSidebarPermission("settings:view", role, permissionOverrides);
  const canViewProfile = canAccessSidebarPermission("settings.profile:view", role, permissionOverrides);
  const canViewTeam = canAccessSidebarPermission("settings.team:view", role, permissionOverrides);
  const canViewAdmin = canAccessSidebarPermission("settings.admin:view", role, permissionOverrides);
  const canViewBranches = canAccessSidebarPermission("settings.branches:view", role, permissionOverrides);
  const canViewMedia = canAccessSidebarPermission("settings.media:view", role, permissionOverrides);
  const canViewEmail = canAccessSidebarPermission("settings.templates.email:view", role, permissionOverrides);
  const canViewNotification = canAccessSidebarPermission("settings.templates.notification:view", role, permissionOverrides);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring transition-colors">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <User className="size-4.5" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2 shadow-xl border-gray-100">
        <DropdownMenuLabel className="p-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-black text-gray-900 leading-tight">{name ?? "User"}</span>
            {email && (
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">{email}</span>
            )}
            {role && (
              <span className="mt-1 w-fit rounded-full bg-soft-primary px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary border border-primary/10">
                {role}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-gray-50" />
        
        {canViewProfile && (
          <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-soft-primary focus:text-primary transition-colors py-2">
            <Link href="/settings/profile">
              <User className="mr-3 size-4" />
              <span className="text-[13px] font-bold">My Profile</span>
            </Link>
          </DropdownMenuItem>
        )}

        {canViewSettings && (
          <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-soft-primary focus:text-primary transition-colors py-2">
            <Link href="/settings">
              <Settings className="mr-3 size-4" />
              <span className="text-[13px] font-bold">General Settings</span>
            </Link>
          </DropdownMenuItem>
        )}

        {canViewTeam && (
          <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-soft-primary focus:text-primary transition-colors py-2">
            <Link href="/settings/team">
              <Users className="mr-3 size-4" />
              <span className="text-[13px] font-bold">Team Management</span>
            </Link>
          </DropdownMenuItem>
        )}

        {(canViewAdmin || canViewBranches || canViewMedia || canViewEmail || canViewNotification) && (
          <>
            <DropdownMenuSeparator className="bg-gray-50" />
            <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Administration</DropdownMenuLabel>
            
            {canViewAdmin && (
              <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-soft-primary focus:text-primary transition-colors py-2">
                <Link href="/settings/admin">
                  <ShieldCheck className="mr-3 size-4" />
                  <span className="text-[13px] font-bold">Security & Admin</span>
                </Link>
              </DropdownMenuItem>
            )}

            {canViewBranches && (
              <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-soft-primary focus:text-primary transition-colors py-2">
                <Link href="/settings/branches">
                  <Building2 className="mr-3 size-4" />
                  <span className="text-[13px] font-bold">Manage Branches</span>
                </Link>
              </DropdownMenuItem>
            )}

            {canViewMedia && (
              <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-soft-primary focus:text-primary transition-colors py-2">
                <Link href="/settings/media-library">
                  <ImageIcon className="mr-3 size-4" />
                  <span className="text-[13px] font-bold">Media Library</span>
                </Link>
              </DropdownMenuItem>
            )}

            {canViewEmail && (
              <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-soft-primary focus:text-primary transition-colors py-2">
                <Link href="/settings/email-templates">
                  <Mail className="mr-3 size-4" />
                  <span className="text-[13px] font-bold">Email Templates</span>
                </Link>
              </DropdownMenuItem>
            )}

            {canViewNotification && (
              <DropdownMenuItem asChild className="cursor-pointer rounded-md focus:bg-soft-primary focus:text-primary transition-colors py-2">
                <Link href="/settings/notification-templates">
                  <Bell className="mr-3 size-4" />
                  <span className="text-[13px] font-bold">Notification Templates</span>
                </Link>
              </DropdownMenuItem>
            )}
          </>
        )}

        <DropdownMenuSeparator className="bg-gray-50" />
        
        <DropdownMenuItem 
          onSelect={() => signOut({ callbackUrl: "/login" })}
          className="cursor-pointer rounded-md focus:bg-soft-danger focus:text-danger text-danger transition-colors py-2"
        >
          <LogOut className="mr-3 size-4" />
          <span className="text-[13px] font-bold">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
