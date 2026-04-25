# Design-System Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the AccountGo design system (`accountgo-design-system.md`) to every page of the SA Shop app — install shadcn/ui primitives, build app-level composites, consolidate routing under a single `(dashboard)` group with consistent chrome, and refactor every page to use the shared components.

**Architecture:** Two layers under `src/components/` — `ui/` for shadcn primitives we own, `app/` for composites (`AppShell`, `Sidebar`, `TopBar`, `PageHeader`, `StatCard`, `StatusBadge`, `DataTable`, `FormField`, etc.). Every authenticated route moves into `src/app/(dashboard)/` so it inherits the chrome from one layout. Tokens already exist in `globals.css` — we only audit them.

**Tech Stack:** Next.js 16.2.4 (App Router), React 19.2.4, Tailwind CSS v4.2.4, shadcn/ui (CLI install), TypeScript strict, lucide-react icons, NextAuth v5.

**Spec:** [`docs/superpowers/specs/2026-04-25-design-system-rollout-design.md`](../specs/2026-04-25-design-system-rollout-design.md)

---

## Important Notes for Implementer

**No test suite exists** for visual changes in this project. Verification per task is:
1. `npm run lint` passes
2. `npm run build` passes (or `npx tsc --noEmit` for faster type-check)
3. Commit
4. Manual smoke test happens once at the end (Phase Z)

**Next.js 16 caveat from `AGENTS.md`:** "This is NOT the Next.js you know. APIs, conventions, and file structure may differ from training data. Read `node_modules/next/dist/docs/` before writing any code." Apply this when touching routing, layouts, server actions, or `redirect`/`headers`/`cookies` APIs.

**Tailwind v4 caveat:** Tokens are referenced as `hsl(var(--primary))` via the `@theme inline` block in `globals.css`. Class names like `bg-primary` already resolve. Do not regress to v3 patterns.

**Existing toast & breadcrumb components are kept**, not replaced with shadcn versions — they have a working API used across the app. Restyling their bodies to match the spec is fine; do not break the `useToast()` hook contract or the `<Breadcrumb items={…} />` API. (This is a deliberate deviation from the spec, motivated by avoiding cascading API breakage.)

**Commits per task:** one focused commit. Use Conventional Commits format (`feat:`, `refactor:`, `chore:`, `style:`).

---

## File Structure

### Created

```
src/components/ui/
  button.tsx              shadcn primitive
  input.tsx               shadcn primitive
  label.tsx               shadcn primitive
  card.tsx                shadcn primitive
  table.tsx               shadcn primitive
  badge.tsx               shadcn primitive
  select.tsx              shadcn primitive
  dialog.tsx              shadcn primitive
  dropdown-menu.tsx       shadcn primitive
  popover.tsx             shadcn primitive
  tabs.tsx                shadcn primitive
  tooltip.tsx             shadcn primitive
  textarea.tsx            shadcn primitive
  separator.tsx           shadcn primitive

src/components/app/
  shell/
    AppShell.tsx          dashboard chrome wrapper
    Sidebar.tsx           refactor of existing (sidebar nav per spec §6.4)
    SidebarToggle.tsx     mobile hamburger / sheet
    TopBar.tsx            48px header w/ breadcrumb + user menu
    UserMenu.tsx          dropdown w/ sign-out
    PageHeader.tsx        h1 + actions slot
  StatCard.tsx            4 gradient variants
  StatusBadge.tsx         status enum → spec colors
  DataTable.tsx           sortable + paginated table
  EmptyState.tsx          empty-list placeholder
  ConfirmDialog.tsx       delete-confirm dialog
  FormField.tsx           label + control + error wrapper

src/lib/utils.ts          cn() helper for shadcn (if not present)

src/app/page.tsx          new — server-side redirect (/ → /dashboard or /login)
src/app/(dashboard)/dashboard/page.tsx   new — content from current (dashboard)/page.tsx
```

### Modified

```
src/app/globals.css                       audit tokens, no logic change expected
src/app/(dashboard)/layout.tsx            use <AppShell>
src/app/(dashboard)/components/Sidebar.tsx → moves into src/components/app/shell/Sidebar.tsx (and refactored)
src/components/ui/breadcrumb.tsx          keep API, restyle body to spec
src/components/ui/toast.tsx               keep API, restyle body to match shadcn aesthetic

EVERY src/app/**/page.tsx                 swap hand-rolled Tailwind for new components

components.json                           shadcn CLI config (created by `npx shadcn init`)
package.json                              new deps from shadcn install
```

### Deleted

```
src/app/(dashboard)/page.tsx              content folded into /dashboard
src/app/dashboard/page.tsx                trivial 4-line stub, replaced
src/app/(dashboard)/components/           sidebar moved into src/components/app/shell/
```

### Routing moves

```
src/app/customers/                  →  src/app/(dashboard)/customers/
src/app/inventory/                  →  src/app/(dashboard)/inventory/
src/app/pos/                        →  src/app/(dashboard)/pos/
src/app/reports/                    →  src/app/(dashboard)/reports/
src/app/settings/                   →  src/app/(dashboard)/settings/
src/app/dashboard/                  →  src/app/(dashboard)/dashboard/
```

Routes that stay top-level (no chrome, no auth): `login`, `signup`, `forgot-password`, `reset-password`, `invite`, `onboarding`, `api`.

---

## Phase A — Foundation

### Task A1: Verify shadcn-cli works on this stack

**Files:**
- Check: `node_modules/next/dist/docs/` (if it exists), `package.json`

- [ ] **Step 1: Confirm Node and npm versions**

```bash
node --version
npm --version
```

Expected: Node ≥ 20, npm ≥ 10.

- [ ] **Step 2: Dry-run shadcn init**

```bash
npx --yes shadcn@latest init --help
```

Expected: prints help without error. If it errors complaining about React 19 / Next 16 / Tailwind 4, STOP and report — fallback in Step 3.

- [ ] **Step 3: Note fallback if CLI is incompatible**

If the CLI refuses to run, primitives can be copied manually from `https://ui.shadcn.com/docs/components/<name>` into `src/components/ui/<name>.tsx`. Each primitive's source is published under MIT license. Do not introduce a non-shadcn alternative.

- [ ] **Step 4: Confirm Tailwind v4 + tokens already present**

```bash
grep -c "^  --primary:" src/app/globals.css
grep -c "^  --sidebar-background:" src/app/globals.css
```

Expected: both return `1`. If either returns `0`, STOP — tokens are missing and Phase B will fail.

No commit (no file changes).

---

### Task A2: Initialize shadcn and install primitives

**Files:**
- Create: `components.json`, `src/lib/utils.ts`
- Create: `src/components/ui/{button,input,label,card,table,badge,select,dialog,dropdown-menu,popover,tabs,tooltip,textarea,separator}.tsx`
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Run shadcn init**

```bash
npx shadcn@latest init
```

When prompted:
- Style: `default`
- Base color: pick whatever — we override with our tokens immediately
- CSS file: `src/app/globals.css`
- CSS variables: `yes`
- Tailwind prefix: leave empty
- Import alias for components: `@/components`
- Import alias for utils: `@/lib/utils`
- React Server Components: `yes`
- Components.json location: project root

Expected: `components.json` and `src/lib/utils.ts` created. `globals.css` may get appended — Step 2 reverts unwanted token changes.

- [ ] **Step 2: Diff globals.css and revert any token overwrite**

```bash
git diff src/app/globals.css
```

If shadcn replaced our `--primary: 160 84% 39%` with its default, `git checkout src/app/globals.css` to restore. Our tokens win.

- [ ] **Step 3: Install all primitives in one command**

```bash
npx shadcn@latest add button input label card table badge select dialog dropdown-menu popover tabs tooltip textarea separator --yes --overwrite
```

Expected: 14 files created/overwritten in `src/components/ui/`. Some may bring transitive Radix deps — accept them.

- [ ] **Step 4: Verify primitives compile**

```bash
npx tsc --noEmit
```

Expected: no errors. If errors reference missing `cn` import, ensure `src/lib/utils.ts` exports `cn`.

- [ ] **Step 5: Lint**

```bash
npm run lint
```

Expected: passes (warnings ok).

- [ ] **Step 6: Commit**

```bash
git add components.json src/lib/utils.ts src/components/ui/ package.json package-lock.json
git commit -m "feat(ui): install shadcn primitives via CLI"
```

---

### Task A3: Audit globals.css against the spec

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Read the spec's §1 token list**

Open `accountgo-design-system.md`, lines 8–66 (Light Mode + Dark Mode + Sidebar tokens).

- [ ] **Step 2: Verify every token is in `globals.css`**

Currently present (per file read): `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`, `--radius`, plus all `--sidebar-*`.

Spec also lists no additional tokens beyond these. **Status: complete.**

- [ ] **Step 3: Add a `.dark` block**

The spec defines dark-mode token values but `globals.css` currently only has `:root`. Append:

```css
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 3.9%;
  --card-foreground: 0 0% 98%;
  --popover: 240 10% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 240 4.9% 83.9%;

  --sidebar-background: 240 5.9% 10%;
  --sidebar-foreground: 240 4.8% 95.9%;
  --sidebar-primary: 224.3 76.3% 48%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 240 3.7% 15.9%;
  --sidebar-accent-foreground: 240 4.8% 95.9%;
  --sidebar-border: 240 3.7% 15.9%;
  --sidebar-ring: 217.2 91.2% 59.8%;
}
```

Insert after the closing `}` of the `:root` block (around line 55) and before `@theme inline`.

- [ ] **Step 4: Lint and commit**

```bash
npm run lint
git add src/app/globals.css
git commit -m "style(tokens): add dark-mode token block per design spec"
```

---

## Phase B — App Composites

### Task B1: Build AppShell + Sidebar + SidebarToggle + TopBar

**Files:**
- Create: `src/components/app/shell/AppShell.tsx`
- Create: `src/components/app/shell/Sidebar.tsx`
- Create: `src/components/app/shell/SidebarToggle.tsx`
- Create: `src/components/app/shell/TopBar.tsx`
- Create: `src/components/app/shell/UserMenu.tsx`

- [ ] **Step 1: Create `src/components/app/shell/Sidebar.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `src/components/app/shell/SidebarToggle.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function SidebarToggle() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="rounded-md p-2 lg:hidden hover:bg-accent"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-60 transform bg-sidebar-background transition-transform duration-200 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute top-2 right-2 rounded-md p-2 hover:bg-sidebar-accent"
        >
          <X className="size-5" />
        </button>
        <Sidebar />
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create `src/components/app/shell/UserMenu.tsx`**

```tsx
"use client";

import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserMenuProps {
  name?: string | null;
  email?: string | null;
}

export function UserMenu({ name, email }: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring">
        <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <User className="size-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="text-sm font-medium">{name ?? "User"}</span>
            {email && (
              <span className="text-xs text-muted-foreground">{email}</span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Create `src/components/app/shell/TopBar.tsx`**

```tsx
import { SidebarToggle } from "./SidebarToggle";
import { UserMenu } from "./UserMenu";

interface TopBarProps {
  userName?: string | null;
  userEmail?: string | null;
}

export function TopBar({ userName, userEmail }: TopBarProps) {
  return (
    <header className="flex h-12 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        <SidebarToggle />
      </div>
      <UserMenu name={userName} email={userEmail} />
    </header>
  );
}
```

- [ ] **Step 5: Create `src/components/app/shell/AppShell.tsx`**

```tsx
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
}

export function AppShell({ children, userName, userEmail }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar userName={userName} userEmail={userEmail} />
        <main className="flex-1 overflow-auto p-4 md:pt-4">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Lint, type-check, commit**

```bash
npm run lint && npx tsc --noEmit
git add src/components/app/shell/
git commit -m "feat(shell): add AppShell, Sidebar, TopBar, UserMenu, SidebarToggle"
```

---

### Task B2: Build PageHeader

**Files:**
- Create: `src/components/app/PageHeader.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Lint, commit**

```bash
npm run lint
git add src/components/app/PageHeader.tsx
git commit -m "feat(app): add PageHeader composite"
```

---

### Task B3: Build StatusBadge

**Files:**
- Create: `src/components/app/StatusBadge.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { cn } from "@/lib/utils";

export type StatusVariant = "success" | "neutral" | "info" | "danger" | "warning";

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  success: "bg-green-100 text-green-700",
  neutral: "bg-gray-100 text-gray-700",
  info: "bg-blue-100 text-blue-700",
  danger: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
};

const STATUS_TO_VARIANT: Record<string, StatusVariant> = {
  completed: "success",
  active: "success",
  paid: "success",
  accepted: "success",
  pending: "neutral",
  draft: "neutral",
  sent: "info",
  refunded: "info",
  voided: "danger",
  cancelled: "danger",
  rejected: "danger",
  failed: "danger",
  "low-stock": "warning",
  warning: "warning",
};

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolved =
    variant ?? STATUS_TO_VARIANT[status.toLowerCase()] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize",
        VARIANT_CLASSES[resolved],
        className
      )}
    >
      {status}
    </span>
  );
}
```

- [ ] **Step 2: Lint, commit**

```bash
npm run lint
git add src/components/app/StatusBadge.tsx
git commit -m "feat(app): add StatusBadge with fixed semantic mapping"
```

---

### Task B4: Build StatCard

**Files:**
- Create: `src/components/app/StatCard.tsx`

- [ ] **Step 1: Create the file**

```tsx
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatCardVariant = "orange" | "teal" | "emerald" | "rose";

const VARIANT_CLASSES: Record<StatCardVariant, { bg: string; border: string; text: string }> = {
  orange: {
    bg: "bg-gradient-to-r from-orange-50 to-orange-100",
    border: "border-orange-200",
    text: "text-orange-700",
  },
  teal: {
    bg: "bg-gradient-to-r from-teal-50 to-teal-100",
    border: "border-teal-200",
    text: "text-teal-700",
  },
  emerald: {
    bg: "bg-gradient-to-r from-emerald-50 to-emerald-100",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
  rose: {
    bg: "bg-gradient-to-r from-rose-50 to-rose-100",
    border: "border-rose-200",
    text: "text-rose-700",
  },
};

interface StatCardProps {
  variant: StatCardVariant;
  label: string;
  value: string | number;
  subLabel?: string;
  icon?: LucideIcon;
  href?: string;
}

export function StatCard({
  variant,
  label,
  value,
  subLabel,
  icon: Icon,
  href,
}: StatCardProps) {
  const v = VARIANT_CLASSES[variant];
  const inner = (
    <div
      className={cn(
        "rounded-lg border p-6 shadow-sm transition-shadow",
        v.bg,
        v.border,
        href && "hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={cn("text-sm font-medium tracking-tight", v.text)}>
            {label}
          </p>
          <p className={cn("text-2xl font-bold", v.text)}>{value}</p>
          {subLabel && <p className={cn("text-sm opacity-80", v.text)}>{subLabel}</p>}
        </div>
        {Icon && <Icon className={cn("size-6 opacity-80", v.text)} />}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
```

- [ ] **Step 2: Add gradient classes to Tailwind safelist (if needed)**

Check whether Tailwind v4's content scanner picks up the gradient classes (it should — they're statically present in `VARIANT_CLASSES`). After Task A2, run:

```bash
grep -r "from-orange-50" .next/static/css 2>/dev/null | head -1
```

If empty after a build (Task Z1), add a small client component or inline-comment the classnames for the scanner. Skip this step otherwise.

- [ ] **Step 3: Lint, commit**

```bash
npm run lint
git add src/components/app/StatCard.tsx
git commit -m "feat(app): add StatCard with 4 gradient variants"
```

---

### Task B5: Build DataTable

**Files:**
- Create: `src/components/app/DataTable.tsx`
- Create: `src/components/app/EmptyState.tsx`

- [ ] **Step 1: Create `src/components/app/EmptyState.tsx`**

```tsx
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/app/DataTable.tsx`**

```tsx
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "./EmptyState";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: { title: string; description?: string; action?: ReactNode };
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card shadow-sm">
        <EmptyState
          title={empty?.title ?? "No data yet"}
          description={empty?.description}
          action={empty?.action}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                className={
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : ""
                }
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : ""
                  }
                >
                  {col.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

Sortable columns and pagination are intentionally out of this initial version — YAGNI. Pages that currently lack them aren't gaining them in this rollout. Add later if a page needs it.

- [ ] **Step 3: Lint, type-check, commit**

```bash
npm run lint && npx tsc --noEmit
git add src/components/app/DataTable.tsx src/components/app/EmptyState.tsx
git commit -m "feat(app): add DataTable and EmptyState composites"
```

---

### Task B6: Build FormField + ConfirmDialog

**Files:**
- Create: `src/components/app/FormField.tsx`
- Create: `src/components/app/ConfirmDialog.tsx`

- [ ] **Step 1: Create `src/components/app/FormField.tsx`**

```tsx
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/app/ConfirmDialog.tsx`**

```tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Lint, type-check, commit**

```bash
npm run lint && npx tsc --noEmit
git add src/components/app/FormField.tsx src/components/app/ConfirmDialog.tsx
git commit -m "feat(app): add FormField and ConfirmDialog composites"
```

---

## Phase C — Routing Consolidation

### Task C1: Move authenticated route trees into (dashboard)

**Files:**
- Move: `src/app/customers/` → `src/app/(dashboard)/customers/`
- Move: `src/app/inventory/` → `src/app/(dashboard)/inventory/`
- Move: `src/app/pos/` → `src/app/(dashboard)/pos/`
- Move: `src/app/reports/` → `src/app/(dashboard)/reports/`
- Move: `src/app/settings/` → `src/app/(dashboard)/settings/`
- Move: `src/app/dashboard/` → `src/app/(dashboard)/dashboard/`

- [ ] **Step 1: Move with git mv (preserves history)**

```bash
git mv src/app/customers src/app/(dashboard)/customers
git mv src/app/inventory src/app/(dashboard)/inventory
git mv src/app/pos src/app/(dashboard)/pos
git mv src/app/reports src/app/(dashboard)/reports
git mv src/app/settings src/app/(dashboard)/settings
git mv src/app/dashboard src/app/(dashboard)/dashboard
```

- [ ] **Step 2: Verify the structure**

```bash
ls src/app/
ls "src/app/(dashboard)/"
```

Expected after move — top-level `src/app/` contains only: `api/`, `(dashboard)/`, `forgot-password/`, `invite/`, `login/`, `onboarding/`, `reset-password/`, `signup/`, `favicon.ico`, `globals.css`, `layout.tsx`. The `(dashboard)/` directory contains: `components/`, `customers/`, `dashboard/`, `error.tsx`, `inventory/`, `layout.tsx`, `loading.tsx`, `page.tsx`, `pos/`, `reports/`, `settings/`.

- [ ] **Step 3: Lint and build**

```bash
npm run lint
npx tsc --noEmit
```

Expected: passes. Imports inside the moved files use `@/...` aliases so paths are unaffected.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(routing): consolidate authenticated routes under (dashboard) group"
```

---

### Task C2: Consolidate dashboard route — fold (dashboard)/page.tsx into /dashboard

**Files:**
- Read: `src/app/(dashboard)/page.tsx` (the existing 138-line dashboard)
- Read: `src/app/(dashboard)/dashboard/page.tsx` (currently a 4-line stub)
- Modify: `src/app/(dashboard)/dashboard/page.tsx` (replace stub with real content)
- Delete: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Replace the dashboard route file**

Open `src/app/(dashboard)/page.tsx`, copy its full contents, paste into `src/app/(dashboard)/dashboard/page.tsx` (overwriting the stub). DO NOT modify the content yet — that happens in Task D1.

- [ ] **Step 2: Delete the old root page**

```bash
git rm src/app/\(dashboard\)/page.tsx
```

- [ ] **Step 3: Lint, build**

```bash
npm run lint
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "refactor(routing): move dashboard content from / to /dashboard"
```

---

### Task C3: Recreate src/app/page.tsx as a redirect

**Files:**
- Create: `src/app/page.tsx`

- [ ] **Step 1: Create the redirect page**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function RootPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/dashboard");
  }
  redirect("/login");
}
```

- [ ] **Step 2: Verify against Next 16 docs if `redirect()` API has changed**

```bash
ls node_modules/next/dist/docs/ 2>/dev/null | head -10
```

If the docs dir exists, search for `redirect` usage notes. If not, the import remains `next/navigation`.

- [ ] **Step 3: Update any internal links pointing to `/` for the dashboard**

```bash
grep -rn 'href="/"' src/ --include='*.tsx'
grep -rn "href={'/'}" src/ --include='*.tsx'
grep -rn 'router.push("/")' src/ --include='*.tsx'
```

For each hit, decide: if it's pointing to "the dashboard," change to `/dashboard`. If it's pointing to a marketing landing or genuinely the root, leave it. Most likely candidates: `login/page.tsx` line 32 (`router.push("/")` after login → change to `/dashboard`).

- [ ] **Step 4: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add src/app/page.tsx
git add -u  # picks up modified internal links
git commit -m "feat(routing): add / redirect (authed → /dashboard, guest → /login)"
```

---

### Task C4: Refactor (dashboard)/layout.tsx to use AppShell

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Delete: `src/app/(dashboard)/components/SidebarWithToggle.tsx`
- Delete: `src/app/(dashboard)/components/Sidebar.tsx`
- Delete: `src/app/(dashboard)/components/` (the directory)

- [ ] **Step 1: Replace `src/app/(dashboard)/layout.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { AppShell } from "@/components/app/shell/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell userName={session.user?.name} userEmail={session.user?.email}>
      {children}
    </AppShell>
  );
}
```

- [ ] **Step 2: Delete the now-unused local sidebar components**

```bash
git rm "src/app/(dashboard)/components/Sidebar.tsx"
git rm "src/app/(dashboard)/components/SidebarWithToggle.tsx"
rmdir "src/app/(dashboard)/components"
```

- [ ] **Step 3: Verify no other files import from the deleted path**

```bash
grep -rn '(dashboard)/components' src/ --include='*.tsx'
```

Expected: no results. If any, fix the import to `@/components/app/shell/Sidebar` or remove the unused import.

- [ ] **Step 4: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/layout.tsx"
git commit -m "refactor(shell): use AppShell composite in (dashboard)/layout.tsx"
```

---

## Phase D — Page Refactors

### Page Refactor Protocol

Every page-refactor task follows this protocol — defined here so each task can stay focused on its specifics.

**Mechanical replacements (apply consistently in every task):**

| Find | Replace with |
|------|--------------|
| `<div class="flex items-center justify-between mb-6"><h1 class="text-2xl font-bold ...">…</h1><div>…actions…</div></div>` | `<PageHeader title="…" actions={<>…</>} />` |
| `<button class="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium …">Label</button>` | `<Button>Label</Button>` |
| `<a class="inline-flex … bg-primary …">Label</a>` (Next Link wrapping a button-styled element) | `<Button asChild><Link …>Label</Link></Button>` |
| `<button class="… border border-input bg-background … hover:bg-accent">Label</button>` | `<Button variant="outline">Label</Button>` |
| `<input class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 …" />` inside `<label>…</label>` | `<FormField label="…" htmlFor="id"><Input id="id" … /></FormField>` |
| `<div class="rounded-lg border bg-card p-6 shadow-sm">…</div>` | `<Card><CardContent className="p-6">…</CardContent></Card>` (or `<Card><CardHeader>…</CardHeader><CardContent>…</CardContent></Card>` if there's a title) |
| `<table class="w-full text-sm"><thead class="bg-muted"><tr>…</tr></thead><tbody>…</tbody></table>` (with `<DataTable>`-shaped data) | `<DataTable columns={[…]} rows={…} rowKey={…} empty={{title: …}} />` |
| `<span class="bg-green-100 text-green-800 …">completed</span>` (or any status pill) | `<StatusBadge status="completed" />` |
| `<select class="border rounded …">` | `<Select>…</Select>` from `@/components/ui/select` |
| `<textarea class="…">` | `<Textarea />` from `@/components/ui/textarea` |

**Imports to add per page (only those used):**

```tsx
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { StatusBadge } from "@/components/app/StatusBadge";
import { FormField } from "@/components/app/FormField";
```

**Layout container per page:** drop the outer `<div className="p-6">` — `AppShell` already provides `p-4` padding. Pages render their content directly.

**After replacements, verify per task:**
1. `npm run lint`
2. `npx tsc --noEmit`
3. Commit

---

### Task D1: Refactor /dashboard

**File:** `src/app/(dashboard)/dashboard/page.tsx`

**Goal:** Replace stat-card divs with `<StatCard>`, recent-sales table with `<DataTable>`, quick-actions with `<Button>`. Use `<PageHeader>` for the heading.

- [ ] **Step 1: Rewrite the file**

```tsx
"use server";

import { redirect } from "next/navigation";
import Link from "next/link";
import { DollarSign, Package, Users, AlertTriangle } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/actions/invoices";
import { Membership, Branch } from "@/models";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RecentInvoice {
  _id: { toString(): string };
  invoiceNumber: string;
  branch: { name: string };
  issuedAt: Date;
  grandTotal: { toString(): string };
  status: string;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const membership = await Membership.findOne({
    userId: session.user.id,
    status: "active",
  });
  if (!membership) {
    return <div>No active membership</div>;
  }

  await Branch.find({ tenantId: membership.tenantId, active: true }).sort({ name: 1 });
  const metrics = await getDashboardMetrics(membership.tenantId.toString());

  const columns: DataTableColumn<RecentInvoice>[] = [
    { key: "invoice", header: "Invoice", render: (r) => r.invoiceNumber },
    { key: "branch", header: "Branch", render: (r) => r.branch.name },
    {
      key: "date",
      header: "Date",
      render: (r) => r.issuedAt.toLocaleDateString(),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (r) =>
        `SAR ${parseFloat(r.grandTotal.toString()).toFixed(2)}`,
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back${session?.user?.name ? `, ${session.user.name}` : ""}`}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          variant="emerald"
          label="Today's Sales"
          value={`SAR ${metrics.todaySales.toFixed(2)}`}
          subLabel={`${metrics.todayCount} transactions`}
          icon={DollarSign}
        />
        <StatCard
          variant="teal"
          label="Products"
          value={metrics.productCount}
          icon={Package}
        />
        <StatCard
          variant="orange"
          label="Customers"
          value={metrics.customerCount}
          icon={Users}
        />
        <StatCard
          variant="rose"
          label="Low Stock Alerts"
          value={metrics.lowStockCount}
          icon={AlertTriangle}
          href={metrics.lowStockCount > 0 ? "/inventory/stock" : undefined}
        />
      </div>

      {metrics.recentInvoices.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Sales</CardTitle>
              <Link
                href="/pos/invoices"
                className="text-sm text-primary hover:underline"
              >
                View all →
              </Link>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={columns}
                rows={metrics.recentInvoices as unknown as RecentInvoice[]}
                rowKey={(r) => r._id.toString()}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/pos">New Sale</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pos/invoices">View Invoices</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/inventory/products/add">Add Product</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "refactor(dashboard): apply design system — StatCard, DataTable, PageHeader"
```

---

### Task D2: Refactor /inventory/products (list)

**File:** `src/app/(dashboard)/inventory/products/page.tsx`

**Specifics:**
- Heading "Products" with two action buttons: "Categories" (outline link to `/inventory/categories`), "Add Product" (primary link to `/inventory/products/add`)
- Table columns: SKU (mono), Name (with optional Arabic sub-label), Category, Price (right), Stock (StatusBadge — `success` if above threshold, `danger` if at/below), Actions (Edit link)
- Empty state: "No products yet" with action button to add first product

- [ ] **Step 1: Rewrite the page**

```tsx
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Product, Category, Membership, StockLevel, Branch } from "@/models";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { StatusBadge } from "@/components/app/StatusBadge";

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  nameAr?: string;
  category: string;
  price: number;
  trackStock: boolean;
  stock: number;
  threshold: number;
}

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user?.id) return <div>Please log in</div>;

  const membership = await Membership.findOne({
    userId: session.user.id,
    status: "active",
  });
  if (!membership) return <div>No active membership</div>;

  const tenantId = membership.tenantId;

  const products = await Product.find({ tenantId, deletedAt: null })
    .populate("categoryId")
    .sort({ name: 1 });
  await Category.find({ tenantId, deletedAt: null, parentId: null }).sort({ name: 1 });
  const branches = await Branch.find({ tenantId, active: true });
  const stockLevels = await StockLevel.find({
    tenantId,
    branchId: { $in: branches.map((b) => b._id) },
  });

  const headOffice = branches.find((b) => b.isHeadOffice);
  const getStock = (productId: string) => {
    if (!headOffice) return 0;
    const stock = stockLevels.find(
      (s) =>
        s.productId.toString() === productId &&
        s.branchId.toString() === headOffice._id.toString()
    );
    return stock ? parseFloat(stock.quantity.toString()) : 0;
  };

  const rows: ProductRow[] = products.map((p) => ({
    id: p._id.toString(),
    sku: p.sku,
    name: p.name,
    nameAr: p.nameAr,
    category: p.categoryId ? (p.categoryId as { name: string }).name : "—",
    price: parseFloat(p.sellingPrice.toString()),
    trackStock: p.trackStock,
    stock: getStock(p._id.toString()),
    threshold: p.lowStockThreshold,
  }));

  const columns: DataTableColumn<ProductRow>[] = [
    {
      key: "sku",
      header: "SKU",
      render: (r) => <span className="font-mono">{r.sku}</span>,
    },
    {
      key: "name",
      header: "Name",
      render: (r) => (
        <div>
          <div>{r.name}</div>
          {r.nameAr && (
            <div className="text-xs text-muted-foreground" dir="rtl">
              {r.nameAr}
            </div>
          )}
        </div>
      ),
    },
    { key: "category", header: "Category", render: (r) => r.category },
    {
      key: "price",
      header: "Price",
      align: "right",
      render: (r) => `SAR ${r.price.toFixed(2)}`,
    },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      render: (r) =>
        r.trackStock ? (
          <StatusBadge
            status={String(r.stock)}
            variant={r.stock <= r.threshold ? "danger" : "success"}
          />
        ) : (
          "—"
        ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <Link
          href={`/inventory/products/${r.id}`}
          className="text-primary hover:underline"
        >
          Edit
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Products"
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/inventory/categories">Categories</Link>
            </Button>
            <Button asChild>
              <Link href="/inventory/products/add">Add Product</Link>
            </Button>
          </>
        }
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={{
          title: "No products yet",
          action: (
            <Button asChild>
              <Link href="/inventory/products/add">Add your first product</Link>
            </Button>
          ),
        }}
      />
    </>
  );
}
```

- [ ] **Step 2: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/inventory/products/page.tsx"
git commit -m "refactor(products): apply design system to product list"
```

---

### Task D3: Refactor /customers (list)

**File:** `src/app/(dashboard)/customers/page.tsx`

**Specifics:**
- Heading "Customers" with action: "Add Customer" → `/customers/new` (or wherever existing code points)
- Apply the protocol: replace top header with `<PageHeader>`, replace any list table with `<DataTable>`, replace status pills with `<StatusBadge>`, replace inline buttons with `<Button>`

- [ ] **Step 1: Read the current file**

```bash
cat "src/app/(dashboard)/customers/page.tsx"
```

- [ ] **Step 2: Apply the protocol per the table at the top of Phase D**

Identify each pattern in the file (`<div className="p-6">`, the page-title row, any `<table>`, any inline `<button>`s, any status spans) and replace per the protocol's mapping table.

- [ ] **Step 3: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/customers/page.tsx"
git commit -m "refactor(customers): apply design system to customer list"
```

---

### Task D4: Refactor /inventory/suppliers (list)

**File:** `src/app/(dashboard)/inventory/suppliers/page.tsx`

- [ ] **Step 1: Read the file, apply the Phase D protocol**

Header: "Suppliers" + "Add Supplier" action. Table columns inferred from existing code (name, contact, etc.). Status pills (active/inactive) → `<StatusBadge>`.

- [ ] **Step 2: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/inventory/suppliers/page.tsx"
git commit -m "refactor(suppliers): apply design system to supplier list"
```

---

### Task D5: Refactor /inventory/purchase-orders (list)

**File:** `src/app/(dashboard)/inventory/purchase-orders/page.tsx`

- [ ] **Step 1: Read the file, apply the Phase D protocol**

Header: "Purchase Orders" + "New PO" action. Statuses (pending/received/cancelled) → `<StatusBadge>`.

- [ ] **Step 2: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/inventory/purchase-orders/page.tsx"
git commit -m "refactor(purchase-orders): apply design system to PO list"
```

---

### Task D6: Refactor /inventory/branches (list)

**File:** `src/app/(dashboard)/inventory/branches/page.tsx`

- [ ] **Step 1: Apply the Phase D protocol**

Header: "Branches" + "Add Branch" action. Status pills (active/inactive, head office indicator).

- [ ] **Step 2: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/inventory/branches/page.tsx"
git commit -m "refactor(branches): apply design system to branch list"
```

---

### Task D7: Refactor /inventory/categories (list)

**File:** `src/app/(dashboard)/inventory/categories/page.tsx`

- [ ] **Step 1: Apply the Phase D protocol**

- [ ] **Step 2: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/inventory/categories/page.tsx"
git commit -m "refactor(categories): apply design system to category list"
```

---

### Task D8: Refactor /inventory/stock (list)

**File:** `src/app/(dashboard)/inventory/stock/page.tsx`

- [ ] **Step 1: Apply the Phase D protocol**

Stock pills → `<StatusBadge>` with `warning` variant for low-stock and `success` for healthy.

- [ ] **Step 2: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/inventory/stock/page.tsx"
git commit -m "refactor(stock): apply design system to stock-levels list"
```

---

### Task D9: Refactor /pos/invoices (list)

**File:** `src/app/(dashboard)/pos/invoices/page.tsx`

- [ ] **Step 1: Apply the Phase D protocol**

Statuses (completed/voided/refunded/draft) → `<StatusBadge>` (the mapping in `StatusBadge.tsx` already covers all four).

- [ ] **Step 2: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/pos/invoices/page.tsx"
git commit -m "refactor(invoices): apply design system to invoice list"
```

---

### Task D10: Refactor /reports landing + /reports/sales

**Files:**
- `src/app/(dashboard)/reports/page.tsx`
- `src/app/(dashboard)/reports/sales/page.tsx`

- [ ] **Step 1: Refactor `reports/page.tsx`**

Likely an index of available reports. Replace cards with shadcn `<Card>` + `<Link>`.

- [ ] **Step 2: Refactor `reports/sales/page.tsx`**

Apply Phase D protocol — header + table + filters → shadcn `<Select>` for the date range filter.

- [ ] **Step 3: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/reports/page.tsx" "src/app/(dashboard)/reports/sales/page.tsx"
git commit -m "refactor(reports): apply design system to landing and sales report"
```

---

### Task D11: Refactor /reports/{stock-movements,low-stock,profit}

**Files:**
- `src/app/(dashboard)/reports/stock-movements/page.tsx`
- `src/app/(dashboard)/reports/low-stock/page.tsx`
- `src/app/(dashboard)/reports/profit/page.tsx`

- [ ] **Step 1: Apply the Phase D protocol to each**

Per file: replace heading, replace tables, replace any filters or selects with shadcn equivalents.

- [ ] **Step 2: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/reports/stock-movements/page.tsx" "src/app/(dashboard)/reports/low-stock/page.tsx" "src/app/(dashboard)/reports/profit/page.tsx"
git commit -m "refactor(reports): apply design system to stock-movements, low-stock, profit"
```

---

### Task D12: Refactor /settings landing + /settings/{profile,branches,team}

**Files:**
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/settings/profile/page.tsx`
- `src/app/(dashboard)/settings/branches/page.tsx`
- `src/app/(dashboard)/settings/team/page.tsx`

- [ ] **Step 1: Refactor each per the Phase D protocol**

Settings landing: card grid linking to sub-pages → shadcn `<Card>`.
Profile: form → `<FormField>` + `<Input>` + `<Button>`.
Branches: list → `<DataTable>` + `<PageHeader>` with "Add Branch" action.
Team: list → `<DataTable>` with role badges via `<StatusBadge>` (variants: owner/admin → `success`, staff → `neutral`).

- [ ] **Step 2: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/settings/"
git commit -m "refactor(settings): apply design system to settings pages"
```

---

### Task D13: Refactor inventory form/detail pages

**Files:**
- `src/app/(dashboard)/customers/[id]/page.tsx`
- `src/app/(dashboard)/inventory/products/add/page.tsx`
- `src/app/(dashboard)/inventory/products/[id]/page.tsx`
- `src/app/(dashboard)/inventory/suppliers/[id]/page.tsx`

- [ ] **Step 1: Refactor each per the Phase D protocol**

For each form: wrap each `<input>` in a `<FormField label="…" htmlFor="…">` and use `<Input>`. Submit buttons → `<Button>`. Page heading → `<PageHeader title="Edit Product" />` (or "Add Product" / "Edit Customer" etc.). Wrap form in `<Card><CardContent>…</CardContent></Card>`.

- [ ] **Step 2: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/customers/[id]/page.tsx" "src/app/(dashboard)/inventory/products/add/page.tsx" "src/app/(dashboard)/inventory/products/[id]/page.tsx" "src/app/(dashboard)/inventory/suppliers/[id]/page.tsx"
git commit -m "refactor(forms): apply design system to product, customer, supplier detail forms"
```

---

### Task D14: Refactor purchase-order detail/add pages

**Files:**
- `src/app/(dashboard)/inventory/purchase-orders/add/page.tsx`
- `src/app/(dashboard)/inventory/purchase-orders/[id]/page.tsx`

- [ ] **Step 1: Apply protocol — these are large (180–220 lines)**

Form fields → `<FormField>` + `<Input>`/`<Select>`. Line-items table → `<DataTable>` (columns: product, qty, unit cost, total, remove action). Status pill on detail page → `<StatusBadge>`. Action bar at bottom → row of `<Button>`s.

- [ ] **Step 2: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/inventory/purchase-orders/add/page.tsx" "src/app/(dashboard)/inventory/purchase-orders/[id]/page.tsx"
git commit -m "refactor(purchase-orders): apply design system to PO add and detail pages"
```

---

### Task D15: Refactor stock action pages

**Files:**
- `src/app/(dashboard)/inventory/stock/adjust/page.tsx`
- `src/app/(dashboard)/inventory/stock/transfer/page.tsx`
- `src/app/(dashboard)/inventory/stock/[productId]/page.tsx`

- [ ] **Step 1: Apply the Phase D protocol**

`/adjust` and `/transfer` are forms → `<FormField>` + `<Input>` + `<Select>` for branches, `<Button>` for submit. `/stock/[productId]` is a detail view → `<PageHeader>` + `<Card>`s for branch breakdown.

- [ ] **Step 2: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/inventory/stock/adjust/page.tsx" "src/app/(dashboard)/inventory/stock/transfer/page.tsx" "src/app/(dashboard)/inventory/stock/[productId]/page.tsx"
git commit -m "refactor(stock): apply design system to stock adjust, transfer, and detail pages"
```

---

### Task D16: Refactor /pos cashier view

**File:** `src/app/(dashboard)/pos/page.tsx`

**Note:** This page is used during checkout. Be careful — it may be heavily client-side. Read it fully first and confirm its structure before modifying.

- [ ] **Step 1: Read the file**

```bash
wc -l "src/app/(dashboard)/pos/page.tsx"
cat "src/app/(dashboard)/pos/page.tsx"
```

The file is 68 lines per the inventory — likely a wrapper around `src/components/pos/POSClient.tsx`. Apply the protocol to anything in it.

- [ ] **Step 2: Inspect POSClient**

```bash
cat src/components/pos/POSClient.tsx | head -100
```

If it has hand-rolled buttons/inputs, replace with shadcn primitives. The cart/keypad layout is functional UX — don't restructure, just retheme.

- [ ] **Step 3: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/pos/page.tsx" src/components/pos/POSClient.tsx
git commit -m "refactor(pos): apply design system to cashier UI"
```

---

### Task D17: Refactor /pos/invoices/[id] and /pos/receipt/[invoiceId]

**Files:**
- `src/app/(dashboard)/pos/invoices/[id]/page.tsx`
- `src/app/(dashboard)/pos/receipt/[invoiceId]/page.tsx`

- [ ] **Step 1: Apply the Phase D protocol**

Invoice detail (264 lines): `<PageHeader>` + line-items table → `<DataTable>` + status badge → `<StatusBadge>` + action buttons → `<Button>`. Wrap sections in `<Card>`s.

Receipt: a print-friendly view. Keep the print styles intact. Replace any chrome-style elements (back button, action buttons) with `<Button>`. The receipt body itself probably should NOT be wrapped in `<Card>` — leave it as a print-targeted layout.

- [ ] **Step 2: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add "src/app/(dashboard)/pos/invoices/[id]/page.tsx" "src/app/(dashboard)/pos/receipt/[invoiceId]/page.tsx"
git commit -m "refactor(pos): apply design system to invoice detail and receipt"
```

---

### Task D18: Refactor auth pages

**Files:**
- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/reset-password/[token]/page.tsx`
- `src/app/invite/[token]/page.tsx`

**Note:** These are OUTSIDE `(dashboard)` and have no sidebar. Keep their centered-card layout. Apply the protocol to internal elements.

- [ ] **Step 1: Refactor `src/app/login/page.tsx`**

Replace each labeled `<input>` with `<FormField label="…" htmlFor="…"><Input id="…" /></FormField>`. Replace the submit `<button>` with `<Button>` (loading state via `disabled` + label swap). Wrap form in `<Card><CardContent>…</CardContent></Card>`. Keep the centered max-w-md layout. Update `router.push("/")` → `router.push("/dashboard")`.

- [ ] **Step 2: Repeat for `signup`, `forgot-password`, `reset-password/[token]`, `invite/[token]`**

Same protocol — all are simple forms with similar structure.

- [ ] **Step 3: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add src/app/login/ src/app/signup/ src/app/forgot-password/ src/app/reset-password/ src/app/invite/
git commit -m "refactor(auth): apply design system to login/signup/forgot/reset/invite forms"
```

---

### Task D19: Refactor onboarding pages

**Files:**
- `src/app/onboarding/layout.tsx`
- `src/app/onboarding/business/page.tsx`
- `src/app/onboarding/branch/page.tsx`
- `src/app/onboarding/products/page.tsx`
- `src/app/onboarding/team/page.tsx`

- [ ] **Step 1: Inspect onboarding layout**

```bash
cat src/app/onboarding/layout.tsx
```

If it has a step-indicator / progress bar, keep its structure but restyle to use spec colors (active step = primary green).

- [ ] **Step 2: Refactor each onboarding page**

Apply the protocol — `<FormField>` + `<Input>` for fields, `<Button>` for next/back, `<Card>` for the form container. Use `<PageHeader title="Step X — Setup Branch" />` per page.

- [ ] **Step 3: Lint, build, commit**

```bash
npm run lint
npx tsc --noEmit
git add src/app/onboarding/
git commit -m "refactor(onboarding): apply design system to setup wizard pages"
```

---

## Phase Z — Verification

### Task Z1: Lint and build the entire project

- [ ] **Step 1: Lint**

```bash
npm run lint
```

Expected: passes. If any errors, fix them before continuing.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Production build**

```bash
npm run build
```

Expected: builds successfully. Pay attention to any dynamic-class warnings from Tailwind v4 — if `from-orange-50` (or any gradient classname) is reported as unused/missing, it means the scanner didn't pick it up from `StatCard.tsx`. Fix by adding a comment-safelist at the top of `StatCard.tsx`:

```tsx
// Tailwind safelist (these classes are used dynamically in VARIANT_CLASSES below):
// from-orange-50 from-orange-100 border-orange-200 text-orange-700
// from-teal-50 from-teal-100 border-teal-200 text-teal-700
// from-emerald-50 from-emerald-100 border-emerald-200 text-emerald-700
// from-rose-50 from-rose-100 border-rose-200 text-rose-700
```

(Tailwind v4 scans comments too if they contain bare class names — verify by re-running the build.)

- [ ] **Step 4: No commit (verification only). If safelist comment was added, commit it:**

```bash
git add src/components/app/StatCard.tsx
git commit -m "chore(stat-card): safelist gradient classes for Tailwind scanner"
```

---

### Task Z2: Manual smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Walk every route, confirm visual conformance**

Open each in a browser and confirm:
- Sidebar present (240px, brand-green logo, active nav highlighted)
- TopBar present (48px, user menu in upper-right)
- `<PageHeader>` at the top of the page content
- No raw oversized buttons, no inline `bg-card border rounded-lg p-6 shadow-sm` divs
- Status badges look correct (green/gray/blue/red/amber per the mapping)
- Sign out from the user menu → lands on `/login`
- `/` (root) — guest redirected to `/login`, authed redirected to `/dashboard`

Routes to walk (~30):
```
/                                              (redirect)
/login                  /signup                /forgot-password
/reset-password/<token> /invite/<token>
/onboarding/business    /onboarding/branch     /onboarding/products    /onboarding/team
/dashboard
/customers              /customers/<id>
/inventory/products     /inventory/products/add  /inventory/products/<id>
/inventory/categories
/inventory/suppliers    /inventory/suppliers/<id>
/inventory/purchase-orders   /inventory/purchase-orders/add   /inventory/purchase-orders/<id>
/inventory/branches
/inventory/stock        /inventory/stock/<productId>
/inventory/stock/adjust /inventory/stock/transfer
/pos                    /pos/invoices          /pos/invoices/<id>     /pos/receipt/<id>
/reports                /reports/sales         /reports/stock-movements   /reports/low-stock     /reports/profit
/settings               /settings/profile      /settings/branches     /settings/team
```

- [ ] **Step 3: Hand off**

Report to the user: ✓ all routes pass smoke test, OR list any pages with visual issues for follow-up. No commit at this step (it's a verification gate).

---

## Final notes

**Number of commits expected:** roughly 30 — one per task (some tasks bundle related files but produce a single commit). Each commit independently builds and lints, so reverting any one is safe.

**If a task hits an unexpected obstacle:**
- Type errors after a routing move usually mean a stale import. Re-grep for the old path.
- shadcn primitive missing a sub-export (e.g. `DropdownMenuLabel`) — re-run `npx shadcn add dropdown-menu --overwrite` to regenerate.
- A page uses a pattern not in the protocol mapping table — apply the closest analog, document it in the commit message, and proceed.

**Out of scope (explicitly do NOT do in this plan):**
- Adding new pages or features
- Changing any business logic, server action, or data model
- Adding test coverage
- Dark-mode visual sign-off
- Arabic / RTL polish beyond what's already in `globals.css`
- Sortable tables / pagination (DataTable v1 is intentionally minimal — YAGNI)
