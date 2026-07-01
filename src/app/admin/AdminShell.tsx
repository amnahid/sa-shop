"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { UserMenu } from "@/components/app/shell/UserMenu";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  History, 
  ArrowLeft,
  Menu,
  X,
  ShieldCheck
} from "lucide-react";

interface AdminShellProps {
  children: React.ReactNode;
  userName?: string | null;
  userEmail?: string | null;
}

export function AdminShell({ children, userName, userEmail }: AdminShellProps) {
  const pathname = usePathname() ?? "";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      exact: true
    },
    {
      name: "Tenants",
      href: "/admin/tenants",
      icon: Building2,
      exact: false
    },
    {
      name: "Users",
      href: "/admin/users",
      icon: Users,
      exact: false
    },
    {
      name: "Audit Logs",
      href: "/admin/audit-logs",
      icon: History,
      exact: false
    }
  ];

  const isLinkActive = (item: typeof menuItems[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  };

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-[#f8fafc]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0">
        {/* Brand header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-2 shrink-0 bg-slate-950">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-5 text-white" />
          </div>
          <span className="font-black text-white text-sm uppercase tracking-wider">SaaS Platform Admin</span>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {menuItems.map((item) => {
            const active = isLinkActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  active 
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "hover:bg-slate-800 hover:text-slate-100"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom bar exit */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
          >
            <ArrowLeft className="size-4 shrink-0" />
            <span>Exit Admin Panel</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Drawer (backdrop & navigation) */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside 
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 transition-transform duration-300 ease-in-out lg:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-5 text-white" />
            </div>
            <span className="font-black text-white text-xs uppercase tracking-wider">Platform Admin</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 rounded-md hover:bg-slate-800 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {menuItems.map((item) => {
            const active = isLinkActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  active 
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "hover:bg-slate-800 hover:text-slate-100"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0">
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
          >
            <ArrowLeft className="size-4 shrink-0" />
            <span>Exit Admin Panel</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-h-0 min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <Menu className="size-5" />
            </button>
            <div className="hidden lg:block">
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Global Operations</span>
            </div>
            <div className="h-5 w-px bg-slate-200 hidden lg:block" />
            <LanguageSwitcher />
          </div>

          <div className="flex items-center gap-4">
            <UserMenu
              name={userName}
              email={userEmail}
              role={null}
              permissionOverrides={undefined}
              isSuperAdmin={true}
            />
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
