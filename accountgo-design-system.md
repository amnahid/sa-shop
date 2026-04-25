# AccountGo Design System

> Extracted from [demo.workdo.io/accountgo](https://demo.workdo.io/accountgo)
> Stack: React + Tailwind CSS v3 + shadcn/ui + Recharts

---

## 1. Design Tokens (CSS Custom Properties)

These variables are defined on `:root` and can be overridden at the `html` element level (e.g. the brand primary is injected inline as `--primary: 160 84% 39%`). All color values use HSL triplets (no `hsl()` wrapper) for Tailwind compatibility.

### Light Mode (`:root`)

| Token | HSL Value | Resolved Color |
|---|---|---|
| `--background` | `0 0% 100%` | `#ffffff` |
| `--foreground` | `240 10% 3.9%` | `#09090b` |
| `--card` | `0 0% 100%` | `#ffffff` |
| `--card-foreground` | `240 10% 3.9%` | `#09090b` |
| `--popover` | `0 0% 100%` | `#ffffff` |
| `--popover-foreground` | `240 10% 3.9%` | `#09090b` |
| `--primary` *(brand override)* | `160 84% 39%` | `#10b77f` (Emerald-teal green) |
| `--primary-foreground` | `0 0% 98%` | `#fafafa` |
| `--secondary` | `240 4.8% 95.9%` | `#f4f4f5` |
| `--secondary-foreground` | `240 5.9% 10%` | `#18181b` |
| `--muted` | `240 4.8% 95.9%` | `#f4f4f5` |
| `--muted-foreground` | `240 3.8% 46.1%` | `#71717a` |
| `--accent` | `240 4.8% 95.9%` | `#f4f4f5` |
| `--accent-foreground` | `240 5.9% 10%` | `#18181b` |
| `--destructive` | `0 84.2% 60.2%` | `#ef4444` |
| `--destructive-foreground` | `0 0% 98%` | `#fafafa` |
| `--border` | `240 5.9% 90%` | `#e4e4e7` |
| `--input` | `240 5.9% 90%` | `#e4e4e7` |
| `--ring` | `240 5.9% 10%` | `#18181b` |
| `--radius` | `.5rem` | `8px` |

### Dark Mode (`.dark`)

| Token | HSL Value | Resolved Color |
|---|---|---|
| `--background` | `240 10% 3.9%` | `#09090b` |
| `--foreground` | `0 0% 98%` | `#fafafa` |
| `--card` | `240 10% 3.9%` | `#09090b` |
| `--primary` | `0 0% 98%` | `#fafafa` |
| `--primary-foreground` | `240 5.9% 10%` | `#18181b` |
| `--secondary` | `240 3.7% 15.9%` | `#27272a` |
| `--muted` | `240 3.7% 15.9%` | `#27272a` |
| `--muted-foreground` | `240 5% 64.9%` | `#a1a1aa` |
| `--destructive` | `0 62.8% 30.6%` | `#7f1d1d` |
| `--border` | `240 3.7% 15.9%` | `#27272a` |
| `--input` | `240 3.7% 15.9%` | `#27272a` |
| `--ring` | `240 4.9% 83.9%` | `#d4d4d8` |

### Sidebar Tokens

| Token | Light Value | Dark Value |
|---|---|---|
| `--sidebar-background` | `0 0% 98%` → `#fafafa` | `240 5.9% 10%` → `#18181b` |
| `--sidebar-foreground` | `240 5.3% 26.1%` → `#3f3f46` | `240 4.8% 95.9%` → `#f4f4f5` |
| `--sidebar-primary` | `240 5.9% 10%` → `#18181b` | `224.3 76.3% 48%` → `#2563eb` |
| `--sidebar-primary-foreground` | `0 0% 98%` → `#fafafa` | `0 0% 100%` → `#ffffff` |
| `--sidebar-accent` | `240 4.8% 95.9%` → `#f4f4f5` | `240 3.7% 15.9%` → `#27272a` |
| `--sidebar-accent-foreground` | `240 5.9% 10%` → `#18181b` | `240 4.8% 95.9%` → `#f4f4f5` |
| `--sidebar-border` | `220 13% 91%` → `#e5e7eb` | `240 3.7% 15.9%` → `#27272a` |
| `--sidebar-ring` | `217.2 91.2% 59.8%` → `#3b82f6` | `217.2 91.2% 59.8%` → `#3b82f6` |

---

## 2. Color Palette

### Brand / Semantic Colors

| Name | Hex | Usage |
|---|---|---|
| **Primary (Brand Green)** | `#10b77f` | Primary buttons, active nav, links, chart line |
| **Destructive (Red)** | `#ef4444` | Delete actions, error states, reject badges |
| **Background** | `#ffffff` | Page background |
| **Foreground** | `#09090b` | Body text |
| **Muted** | `#f4f4f5` | Disabled backgrounds, subtle areas |
| **Muted Foreground** | `#71717a` | Placeholder text, secondary labels |
| **Border** | `#e4e4e7` | Card borders, input borders, dividers |

### Stat Card Gradient Colors

| Card Theme | Background Gradient | Border | Text Color |
|---|---|---|---|
| **Orange** (Total Clients) | `from-orange-50` → `#fff7ed` to `from-orange-100` → `#ffedd5` | `border-orange-200` `#fed7aa` | `text-orange-700` `#c2410c` |
| **Teal** (Total Vendors) | `from-teal-50` → `#f0fdf4` to `teal-100` → `#ccfbf1` | `border-teal-200` `#99f6e4` | `text-teal-700` `#0f766e` |
| **Emerald** (Customer Payment) | `from-emerald-50` → `#ecfdf5` to `emerald-100` → `#d1fae5` | `border-emerald-200` `#a7f3d0` | `text-emerald-700` `#047857` |
| **Rose** (Vendor Payment) | `from-rose-50` → `#fff1f2` to `rose-100` → `#ffe4e6` | `border-rose-200` `#fecdd3` | `text-rose-700` `#be123c` |

### Chart Colors

| Series | Color |
|---|---|
| Customer Payments line | `#10b77f` (brand green) |
| Vendor Payments line | `#ef4444` (red) |

### Status Badge Colors

| Status | Background | Text | Tailwind Classes |
|---|---|---|---|
| **Sent** | `#dbeafe` (blue-100) | `#1d4ed8` (blue-700) | `bg-blue-100 text-blue-700` |
| **Accepted** | `#dcfce7` (green-100) | `#15803d` (green-700) | `bg-green-100 text-green-700` |
| **Draft** | `#f3f4f6` (gray-100) | `#374151` (gray-700) | `bg-gray-100 text-gray-700` |
| **Rejected** | `#fee2e2` (red-100) | `#b91c1c` (red-700) | `bg-red-100 text-red-700` |

### Action Icon Colors (Table Row Actions)

| Action | Color |
|---|---|
| Download | `#ea580c` (orange-600) |
| Approve / Accept | `#16a34a` (green-600) |
| Cancel / Reject | `#dc2626` (red-600) |
| View | `#2563eb` (blue-600) |
| Edit | `#4f46e5` (indigo-600) |
| Delete | `#ef4444` (red-500) |
| Convert / Sync | `#9333ea` (purple-600) |

---

## 3. Typography

### Font Family

```css
font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji",
             "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
```

Applied via Tailwind's `font-sans` class on `<body>`. The body also carries `antialiased` for subpixel smoothing.

### Type Scale

| Role | Tailwind Class | Size | Weight | Line Height | Color |
|---|---|---|---|---|---|
| Page Title (h1) | `text-xl font-semibold` | `20px` | `600` | `28px` | `#3f3f46` (zinc-700) |
| Section Heading (h3) | `text-base font-semibold` | `16px` | `600` | `24px` | `#3f3f46` |
| Card Stat Value | `text-2xl font-bold` | `24px` | `700` | auto | card accent color |
| Card Label / Body | `text-sm font-medium` | `14px` | `500` | auto | card accent color |
| Body Text | `text-base` | `16px` | `400` | `24px` | `#09090b` |
| Small / Secondary | `text-sm` | `14px` | `400` | `20px` | `#3f3f46` |
| Caption / Meta | `text-xs` | `12px` | `400` | `16px` | `#71717a` |
| Sidebar Nav Item | `text-sm` | `14px` | `400` normal, `600` active | — | `#3f3f46` normal, `#10b77f` active |
| Table Header | `text-sm font-medium` | `14px` | `500` | — | `#3f3f46` |
| Table Cell | `text-sm` | `14px` | `400` | — | `#3f3f46` |
| Badge / Status | `text-sm` | `14px` | `400` | — | varies |

---

## 4. Spacing & Sizing

### Base Unit

Tailwind's default 4px base unit (`1 unit = 4px`).

### Common Spacing Values Used

| Token | Value |
|---|---|
| `gap-1` | `4px` |
| `gap-2` | `8px` |
| `gap-3` | `12px` |
| `gap-4` | `16px` |
| `gap-6` | `24px` |
| `p-2` | `8px` |
| `p-4` | `16px` |
| `p-6` | `24px` |
| `px-3` | `12px` horizontal |
| `px-4` | `16px` horizontal |
| `py-1` | `4px` vertical |
| `py-2` | `8px` vertical |

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius` / `rounded-md` | `6px` | Buttons, inputs, nav items, table |
| `rounded-lg` | `8px` | Cards, panels |
| `rounded-xl` | `12px` | Larger containers |
| `rounded-full` | `9999px` | Status badges, avatar chips |

### Shadows

| Class | Usage |
|---|---|
| `shadow-sm` | Cards (`rgba(0,0,0,0.05) 0 1px 2px`) |
| `shadow-lg` | Elevated panels, modals |
| `shadow-2xl` | Overlay dialogs |
| `shadow-none` | Flat elements |

---

## 5. Layout

### Overall Structure

```
┌──────────────────────────────────────────────────┐
│  Sidebar (240px fixed left)  │  Main Content Area │
│                              │  ┌──────────────┐  │
│  [Logo]                      │  │ Header (48px)│  │
│  [Search Input]              │  ├──────────────┤  │
│  [Nav Items]                 │  │ Page Content │  │
│                              │  │ p-4 md:pt-0  │  │
└──────────────────────────────┴──────────────────┘
```

### Sidebar

- **Width:** `240px` (`--sidebar-width`)
- **Background:** `#fafafa` (`--sidebar-background: 0 0% 98%`)
- **Position:** `fixed`, `inset-y-0 left-0`
- **Border:** none (flat against page)
- **Padding:** `8px` (`p-2`) internal

### Top Header Bar

- **Height:** `48px` (`h-12`)
- **Background:** `#ffffff`
- **Border Bottom:** `1px solid #e4e4e7`
- **Padding:** `4px 16px` (`px-4 py-1`)
- **Contains:** Sidebar toggle, breadcrumb nav, language selector, user avatar

### Page Content Area

- **Padding:** `p-4` (16px all sides, `md:pt-0` removes top on medium+)
- **Background:** `#ffffff`

### Dashboard Grid

```html
<!-- Stat Cards -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">

<!-- Chart Row -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
```

---

## 6. Components

### 6.1 Card

```html
<div class="rounded-lg border bg-card text-card-foreground shadow-sm">
  <div class="p-6">...</div>
</div>
```

| Property | Value |
|---|---|
| Background | `#ffffff` |
| Border | `1px solid #e4e4e7` |
| Border Radius | `8px` |
| Box Shadow | `rgba(0,0,0,0.05) 0px 1px 2px 0px` |
| Padding (content) | `24px` (`p-6`) |

**Stat Card Variant** (gradient):

```html
<div class="rounded-lg border bg-card text-card-foreground shadow-sm
            bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
```

Each stat card contains:
- Title: `text-sm font-medium tracking-tight` in theme color
- Value: `text-2xl font-bold` in theme color
- Sub-label: `text-sm` in theme color (lighter)
- Icon: 24px, theme color, `opacity-80`, top-right

---

### 6.2 Buttons

All buttons share a base class from shadcn/ui:

```
inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md
text-sm font-medium ring-offset-background transition-colors
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
```

#### Button Variants

| Variant | Background | Text | Border | Padding | Border Radius |
|---|---|---|---|---|---|
| **Primary (default)** | `#10b77f` | `#fafafa` | none | `8px 16px` | `6px` |
| **Outline** | `#ffffff` | `#09090b` | `1px solid #e4e4e7` | `8px 12px` | `6px` |
| **Ghost** | transparent | `#3f3f46` | none | `8px` | `6px` |
| **Icon (ghost)** | transparent | contextual | none | `0px` | `6px` |
| **Active/Filled** (pagination) | `#10b77f` | `#fafafa` | none | `0px 12px` | `6px` |

#### FAB / Add Button (top-right of list pages)

```html
<button class="... h-8 w-8 rounded-md bg-primary text-primary-foreground">
  <PlusIcon />
</button>
```

Background: `#10b77f`, color: `#fafafa`, size: `32px × 32px`

---

### 6.3 Input / Search

```html
<input class="flex rounded-md border px-3 py-2 text-sm
              ring-offset-background placeholder:text-muted-foreground
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
```

| Property | Value |
|---|---|
| Height | `32px` |
| Background | `#ffffff` |
| Border | `1px solid #e5e7eb` |
| Border Radius | `6px` |
| Padding | `8px 12px` (with left icon: `8px 12px 8px 32px`) |
| Font Size | `14px` |
| Placeholder Color | `#71717a` (muted-foreground) |
| Focus Ring | `2px` `#18181b` |

---

### 6.4 Sidebar Navigation

**Container:**
```html
<aside data-sidebar="sidebar" class="flex h-full w-full flex-col">
  <!-- header: logo area -->
  <!-- content: nav menus -->
</aside>
```

**Nav Item (default / inactive):**

| Property | Value |
|---|---|
| Background | transparent |
| Text Color | `#3f3f46` |
| Font Weight | `400` |
| Font Size | `14px` |
| Padding | `8px` |
| Border Radius | `6px` |

**Nav Item (active):**

| Property | Value |
|---|---|
| Background | `rgba(16, 183, 127, 0.1)` |
| Text Color | `#10b77f` |
| Font Weight | `600` |
| Border Radius | `0px 4px 4px 0px` (right-flush active indicator style) |

**Structure:**
```
[Icon 16px]  [Label text-sm]  [Chevron icon (if has children)]
```

Nav items with children show a chevron (`↓`) that rotates on expand. Sub-items are indented and styled identically but without icons.

---

### 6.5 Table

```html
<table class="w-full text-sm">
  <thead>
    <tr>
      <th class="text-left font-medium px-4 py-3 text-muted-foreground">
        Column Name <SortIcon />
      </th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-b hover:bg-muted/50">
      <td class="px-4 py-3">...</td>
    </tr>
  </tbody>
</table>
```

| Element | Background | Text | Font | Padding | Border |
|---|---|---|---|---|---|
| `thead` | transparent | `#71717a` (muted) | `14px / 500` | `12px 16px` | bottom `1px solid #e4e4e7` |
| `tbody tr` | transparent | `#3f3f46` | `14px / 400` | `12px 16px` | bottom `1px solid #e4e4e7` |
| Row hover | `rgba(244,244,245,0.5)` | — | — | — | — |

Sortable columns include an `↑↓` icon after the label.

---

### 6.6 Status Badges

```html
<span class="px-2 py-1 rounded-full text-sm capitalize bg-{color}-100 text-{color}-700">
  Status
</span>
```

| Status | Classes | BG | Color |
|---|---|---|---|
| Sent | `bg-blue-100 text-blue-700` | `#dbeafe` | `#1d4ed8` |
| Accepted | `bg-green-100 text-green-700` | `#dcfce7` | `#15803d` |
| Draft | `bg-gray-100 text-gray-700` | `#f3f4f6` | `#374151` |
| Rejected | `bg-red-100 text-red-700` | `#fee2e2` | `#b91c1c` |

Common properties: `border-radius: 9999px`, `padding: 4px 8px`, `font-size: 14px`

---

### 6.7 Breadcrumb

```html
<nav>
  <span>Dashboard</span>
  <span class="text-muted-foreground"> › </span>
  <span class="font-medium">Current Page</span>
</nav>
```

| Property | Value |
|---|---|
| Font Size | `14px` |
| Color | `#3f3f46` |
| Separator | `›` chevron, muted color |

---

### 6.8 Pagination

```html
<div class="flex items-center gap-1">
  <button>← Previous</button>
  <button class="bg-primary text-primary-foreground">1</button>
  <button>2</button>
  <button>Next →</button>
</div>
```

| State | Background | Text | Border |
|---|---|---|---|
| Default page | `#ffffff` | `#09090b` | `1px solid #e4e4e7` |
| Active page | `#10b77f` | `#fafafa` | none |

Buttons: `border-radius: 6px`, `padding: 0 12px`, `height: 32px`, `font-size: 14px`

---

### 6.9 Search Bar (List Page)

```html
<div class="flex gap-2">
  <div class="relative">
    <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    <input placeholder="Search proposals..." class="pl-8 ..." />
  </div>
  <button class="bg-primary ...">Search</button>
</div>
```

---

### 6.10 View Toggle (List / Grid)

```html
<div class="flex border rounded-md overflow-hidden">
  <button class="bg-primary text-white p-2">  <!-- active -->
    <ListIcon />
  </button>
  <button class="bg-white text-muted p-2">     <!-- inactive -->
    <GridIcon />
  </button>
</div>
```

---

### 6.11 Per-Page Selector & Filter

```html
<select class="border rounded-md px-3 py-1 text-sm">10 per page</select>
<button class="border rounded-md px-3 py-1 text-sm flex items-center gap-1">
  <FilterIcon /> Filters ↓
</button>
```

Both share: `border: 1px solid #e4e4e7`, `border-radius: 6px`, `font-size: 14px`, `height: ~32px`

---

### 6.12 Charts (Recharts)

Line charts with:
- **Grid lines:** light gray, horizontal only
- **Axes:** muted text, no axis lines
- **Lines:** `stroke-width: 2`, smooth curves, dot-markers at data points
- **Colors:** Customer = `#10b77f`, Vendor = `#ef4444`
- **Legend:** icon + label, centered below chart
- **Container:** `rounded-lg border shadow-sm p-6`

---

## 7. Logo

The **ACCOUNTGO** wordmark uses two colors:

- **"A"** — `#10b77f` (brand primary green)
- **"CCOUNTGO"** — `#1e293b` (slate-800, near-black)

Font: Bold, sans-serif, all-caps, ~20–22px

---

## 8. Navigation Structure

### Sidebar Menu Items

```
Dashboard ›
  Account Dashboard
User Management ›
Proposal
Sales Invoice ›
Purchase ›
Product & Service ›
Retainer ›
Accounting ›
Goal ›
Budget Planner ›
Double Entry ›
Assets ›
Contract ›
CMS ›
Media Library
Messenger
Email Templates
Notification Templates
Settings
```

`›` indicates items with expandable sub-menus (chevron icon on right).

---

## 9. Motion & Transitions

All interactive elements use Tailwind's `transition-colors` for smooth color transitions. The sidebar uses:

```css
transition: left, right, width 200ms ease-linear;
```

Button focus states use a `2px` ring in `--ring` color with `2px` offset.

---

## 10. Accessibility & Theme

- **Color scheme:** `light` (class on `<html>` and `<body>`)
- **Text direction:** `ltr` (class on `<body>`, `dir` attribute on root)
- **Font smoothing:** `antialiased` (subpixel smoothing)
- **Dark mode:** Supported via `.dark` class with full token overrides
- **Focus indicators:** `focus-visible:ring-2` on all interactive elements
- **Disabled states:** `opacity-50 pointer-events-none`
