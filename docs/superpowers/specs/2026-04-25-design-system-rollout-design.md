# Design-System Rollout — Design

**Date:** 2026-04-25
**Status:** Draft for review
**Source design system:** `accountgo-design-system.md` (extracted from demo.workdo.io/accountgo, shadcn/ui-based)

## 1. Goal

Apply the AccountGo design system to every page of the SA Shop app in a single coordinated effort. After this work:

- Every authenticated page shares the same chrome (sidebar + top header) and visual language.
- Every common UI element (button, input, card, table, badge, status pill, stat card, breadcrumb, dialog) comes from a shared component, not a hand-rolled Tailwind string.
- Tokens in `globals.css` are the single source of color/radius/typography truth.

## 2. Non-goals

- No feature additions, no business-logic changes, no schema changes.
- No accessibility audit beyond what shadcn/Radix gives us by default.
- No copy changes (English text stays as-is; Arabic/RTL polish is out of scope for this pass).
- No dark-mode QA pass — tokens are wired for it but visual sign-off is deferred.
- No new pages.

## 3. Decisions baked into this spec

These were settled during brainstorming. Listed here so a reviewer can flip any of them before implementation:

| # | Decision | Alternative considered |
|---|----------|------------------------|
| D1 | **Big-bang scope** — all ~30 pages restyled in this rollout | Foundation-first / vertical-slice |
| D2 | **shadcn/ui via CLI** for primitives | Hand-rolled / full UI library |
| D3 | **Two-layer components**: `src/components/ui/` (shadcn primitives) + `src/components/app/` (composites) | Primitives only, pages stitch their own |
| D4 | **Move every authenticated route into `(dashboard)`** group so they share the chrome | Wrapper component, or leave routing alone |
| D5 | **`/pos` stays inside the chrome** (per user choice) | Full-bleed cashier mode |
| D6 | **One canonical `/dashboard`**; `/` redirects there for authed users, to `/login` for guests | Keep both, or keep `/` as the dashboard |
| D7 | **Status badges have a fixed semantic mapping**: completed→green, pending/draft→gray, refunded/info→blue, voided/cancelled→red, low-stock→amber | Per-page colors, just shape standardized |

## 4. Architecture

### 4.1 Component layers

```
src/components/
├── ui/        ← shadcn primitives (we own the source)
│   ├── button.tsx
│   ├── input.tsx
│   ├── label.tsx
│   ├── card.tsx
│   ├── table.tsx
│   ├── badge.tsx
│   ├── select.tsx
│   ├── dialog.tsx
│   ├── dropdown-menu.tsx
│   ├── popover.tsx
│   ├── tabs.tsx
│   ├── tooltip.tsx
│   ├── breadcrumb.tsx     (already exists — replace with shadcn version)
│   └── toast.tsx          (already exists — replace with shadcn version)
└── app/       ← composites built from ui/
    ├── shell/
    │   ├── AppShell.tsx        (sidebar + topbar + content slot)
    │   ├── Sidebar.tsx         (refactor of existing)
    │   ├── SidebarNav.tsx      (nav-item rendering w/ active state per spec)
    │   ├── TopBar.tsx          (height 48px, breadcrumb + user menu)
    │   └── PageHeader.tsx      (h1 + actions row, used inside every page)
    ├── StatCard.tsx            (4 gradient variants: orange/teal/emerald/rose)
    ├── StatusBadge.tsx         (status enum → spec color)
    ├── DataTable.tsx           (header + sortable cols + row actions + empty state)
    ├── EmptyState.tsx
    ├── ConfirmDialog.tsx
    └── FormField.tsx           (label + input + error wrapper, used in all forms)
```

**Pages** (`src/app/**/page.tsx`) only import from `components/app/` and occasionally `components/ui/` for one-offs. They contain no inline button/input/table Tailwind class strings.

### 4.2 Token strategy

Tokens already live in `src/app/globals.css`. No changes required there except verifying every variable from §1 of the spec is present and matches. Two small additions:

- Add the 4 stat-card gradient classes to a Tailwind safelist if Tailwind v4's content scanner doesn't pick them up dynamically.
- Confirm `--ring` resolves to brand green (it currently does — `160 84% 39%`).

### 4.3 Routing changes

Today every authenticated route lives at the top level of `src/app/`. Move them into the `(dashboard)` route group so they all inherit the auth check + chrome from `(dashboard)/layout.tsx`:

```
BEFORE                              AFTER
src/app/customers/                  src/app/(dashboard)/customers/
src/app/inventory/**/               src/app/(dashboard)/inventory/**/
src/app/pos/**/                     src/app/(dashboard)/pos/**/
src/app/reports/**/                 src/app/(dashboard)/reports/**/
src/app/settings/**/                src/app/(dashboard)/settings/**/
src/app/dashboard/page.tsx          src/app/(dashboard)/dashboard/page.tsx
src/app/(dashboard)/page.tsx        DELETED (content folded into /dashboard)
```

`src/app/page.tsx` (currently deleted in working copy) gets recreated as a server component that redirects: authed → `/dashboard`, guest → `/login`.

Routes that **stay outside** the group (no chrome, no auth requirement): `login`, `signup`, `forgot-password`, `reset-password`, `invite`, `onboarding/**` (onboarding has its own layout). API routes are unaffected.

Internal links in code that point to `/` for the dashboard get updated to `/dashboard`.

### 4.4 App chrome

**`AppShell`** (used by `(dashboard)/layout.tsx`):

```
┌──────────────────────────────────────────────┐
│ Sidebar (240px)  │  TopBar (48px)            │
│                  ├───────────────────────────┤
│                  │  PageHeader (per page)    │
│                  │  Page content (p-4)       │
└──────────────────┴───────────────────────────┘
```

- **Sidebar**: 240px fixed left, `bg-sidebar-background`, no border. Logo at top. Nav per §6.4 of the spec — inactive items `text-sidebar-foreground` + `font-normal`; active items `bg-sidebar-primary/10` + `text-sidebar-primary` + `font-semibold`. Existing `Sidebar.tsx` is close — refactor to match spec exactly (active style, padding, font weight). Mobile sheet behavior keeps current `SidebarWithToggle` pattern.
- **TopBar**: 48px tall, `bg-background`, 1px bottom border. Contains: sidebar toggle (mobile), `<Breadcrumb>` (left), user menu via `<DropdownMenu>` (right) with sign-out. Language selector deferred (out of scope, per §2).
- **PageHeader**: standard `<h1 class="text-xl font-semibold">` + optional right-side actions slot. Every page replaces its current ad-hoc `<div class="flex items-center justify-between mb-6">` with `<PageHeader title="…" actions={…} />`.

### 4.5 Stat-card mapping (dashboard)

Map our 4 dashboard tiles to the spec's 4 gradient themes:

| Tile | Variant | Reasoning |
|------|---------|-----------|
| Today's Sales | `emerald` | Positive money in |
| Products | `teal` | Inventory / catalog |
| Customers | `orange` | People / accounts |
| Low Stock Alerts | `rose` | Warning when > 0 |

`StatCard` accepts `variant`, `label`, `value`, `subLabel?`, `icon?`, `href?`.

### 4.6 StatusBadge mapping

Single component, single source of truth for badge colors. App-level statuses map to the spec's palette:

| Our status | Variant | Tailwind |
|------------|---------|----------|
| completed, active, paid, accepted | `success` | `bg-green-100 text-green-700` |
| pending, draft | `neutral` | `bg-gray-100 text-gray-700` |
| sent, refunded, info | `info` | `bg-blue-100 text-blue-700` |
| voided, cancelled, rejected, failed | `danger` | `bg-red-100 text-red-700` |
| low-stock, warning | `warning` | `bg-amber-100 text-amber-700` (new — spec doesn't define amber explicitly, added for inventory) |

Pages stop hand-coding `statusColors` lookups. Usage: `<StatusBadge status="completed" />`.

### 4.7 DataTable

Composite that wraps shadcn `<Table>`:

- Columns prop: `{ key, header, align?, sortable?, render(row) }`
- Optional `actions` column (View / Edit / Delete with the spec's icon colors)
- Optional `searchPlaceholder` + `onSearch` (search bar above table per §6.9)
- Optional pagination (per §6.8) — defaults to client-side if a `pageSize` is given
- `emptyState` slot when no rows

Every list page (`products`, `customers`, `suppliers`, `purchase-orders`, `invoices`, `branches`, `team`, `reports/*`) replaces its inline `<table>` with `<DataTable>`.

## 5. Per-page application

Every `page.tsx` under `src/app/(dashboard)/**` (after the routing move) is rewritten to use the new components. Three groups:

**Group 1 — list pages** (use `PageHeader` + `DataTable` + `StatusBadge`):
`customers`, `inventory/products`, `inventory/suppliers`, `inventory/purchase-orders`, `inventory/branches`, `inventory/categories`, `inventory/stock`, `pos/invoices`, `reports/sales`, `reports/stock-movements`, `reports/low-stock`, `reports/profit`, `settings/branches`, `settings/team`.

**Group 2 — detail/form pages** (use `PageHeader` + `Card` + `FormField` + `Button`):
`customers/[id]`, `inventory/products/add`, `inventory/products/[id]`, `inventory/suppliers/[id]`, `inventory/purchase-orders/add`, `inventory/purchase-orders/[id]`, `inventory/stock/adjust`, `inventory/stock/transfer`, `inventory/stock/[productId]`, `pos/invoices/[id]`, `pos/receipt/[invoiceId]`, `settings/profile`.

**Group 3 — dashboard** (uses `PageHeader` + `StatCard` × 4 + `DataTable` for recent sales + quick actions row):
`dashboard`.

**Auth pages** (`login`, `signup`, `forgot-password`, `reset-password`, `invite/[token]`) get the new `Button`/`Input`/`Card`/`FormField` primitives but keep their centered-card layout. No sidebar/header.

**Onboarding pages** keep their existing `onboarding/layout.tsx` (out of `(dashboard)`) but get the same primitives applied to their forms.

## 6. Implementation sequencing (high level — full breakdown lives in the plan)

1. Verify shadcn-cli works against Next 16 + React 19 + Tailwind v4 in this project. AGENTS.md flags this stack as having breaking changes vs. training data — do not assume.
2. Install shadcn primitives.
3. Build app composites against the new primitives.
4. Move routes into `(dashboard)` group; recreate `src/app/page.tsx` redirect; consolidate dashboard route.
5. Refactor `(dashboard)/layout.tsx` to use `AppShell`.
6. Refactor pages by group (list → detail → dashboard → auth/onboarding).
7. Visual smoke test every route.
8. Fix the unrelated TODO already in the existing `Sidebar.tsx`: sign-out button currently has an empty action — wire it to NextAuth `signOut()`. (Caught in passing during exploration; trivial and on the same component being refactored.)

## 7. Verification

- `npm run lint` passes.
- `npm run build` passes.
- `npm run dev` boots; manually walk every route, confirm sidebar/header present (or absent for auth), confirm no raw `<button class="…h-10 px-4…">` strings remain in `page.tsx` files (`grep` check).
- Every page has a `<PageHeader>`.
- Every status pill is a `<StatusBadge>`.

## 8. Risks / open questions

- **shadcn-cli compatibility with Next 16 / Tailwind v4** — must be verified in step 1 of the plan. If incompatible, fallback is to copy primitive source from the shadcn registry manually (still feasible, just slower).
- **Visual regressions** — big-bang means many pages change at once. No test suite exists for visuals; review depends on manual walkthrough. Acceptable per user direction.
- **Dark mode** — tokens are wired but not QA'd in this pass. Anything that looks broken in dark mode is a follow-up.
- **i18n / RTL** — globals.css already has minimal RTL rules; this rollout doesn't extend them. Arabic-only review deferred.
