# KSA Shop Management SaaS — Development Roadmap

**Target market:** Saudi Arabia (pivoted from UAE)
**Tech stack:** Next.js 14+ (App Router) · TypeScript strict · MongoDB · Tailwind · shadcn/ui
**Team:** Solo developer
**Timeline:** 20-day MVP sprint (aspirational), followed by phased releases
**First customers:** 5–10 grocery shop pilots, hand-held onboarding
**Version:** 1.0 · April 2026

---

## 0. Read This First — Scope Pivot & Assumptions

The original requirements document targets the UAE. Your answer to Q33 shifts the project to Saudi Arabia, which changes the compliance layer substantially. This roadmap is written for **KSA**, not UAE. You should update the requirements doc to match, or I can do that next.

**What changes when pivoting UAE → KSA:**

| Area | UAE (old) | KSA (new) |
|---|---|---|
| Tax authority | FTA | ZATCA (Zakat, Tax and Customs Authority) |
| VAT rate | 5% | 15% |
| VAT registration threshold | AED 375,000 | SAR 375,000 (mandatory) / SAR 187,500 (voluntary) |
| E-invoicing mandate | None at MVP urgency | **ZATCA Fatoora — Phase 1 + Phase 2 waves through 2026** |
| Invoice format | PDF simplified/full | **UBL 2.1 XML + QR + cryptographic stamp + UUID + hash chain** |
| Payroll system | WPS / SIF file | **Mudad** (GOSI-integrated wage protection) |
| Labour gratuity | UAE Labour Law | KSA Labour Law (Articles 84–88) |
| Data protection law | UAE PDPL | KSA PDPL (effective Sep 2024) |
| Currency | AED | SAR |
| Language emphasis | Arabic + English | Arabic + English (Arabic often stronger in KSA grocery) |

**Assumptions I made where your answers were ambiguous or unstated:**

1. **ZATCA Phase 1** (invoice generation with QR + UUID + hash) is **inside MVP** — any grocery you onboard is almost certainly VAT-registered and legally required to issue Phase-1-compliant invoices today.
2. **ZATCA Phase 2** (Fatoora API integration, real-time clearance/reporting) is **NOT in MVP** — it's a dedicated Phase 2 of this project. It needs a sandbox account, test integration, and eventual ZATCA certification, which is days of focused work you cannot afford inside the 20-day sprint. Your pilots will either be pre-Wave-24 (deadline June 30, 2026) or need to use their current invoicing for a few more weeks.
3. **Arabic RTL** is in MVP as a toggle, but English is the default language you requested, and I'll ship polished English first. Arabic copy review will need a native speaker before pilot launch — budget for that.
4. **Data residency**: hosting on **MongoDB Atlas (AWS Bahrain, `me-south-1`)** for MVP. Closest sovereign-friendly region available today. Migrate to Azure KSA when it goes live Q4 2026.
5. **Stripe subscription billing** is deferred — since you don't have a registered business yet and your first 5–10 customers are hand-held, collect payment via bank transfer / Mada invoice manually. Stripe or a Saudi gateway (HyperPay, Moyasar, PayTabs) gets wired up in Phase 2.
6. **WhatsApp receipts** will use the free `wa.me` deep-link approach at MVP. WhatsApp Business API requires a Facebook Business Manager account and template approvals — a week of paperwork you don't need yet.
7. **"Expand MVP scope"** (your answer to Q14) — I've added: grocery-critical expiry tracking, barcode scanning, ZATCA Phase 1 invoicing, basic supplier records. These are must-haves for a grocery pilot, not nice-to-haves.
8. **Still open** (recommend you confirm): whether your pilot grocers are already VAT-registered (affects invoice flow), and whether they need Arabic as default UI on day one.

---

## 1. Architecture Decisions

### 1.1 Stack (locked)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14+ App Router | Server components + server actions reduce boilerplate dramatically for solo dev |
| Language | TypeScript strict | Your choice; pays off hugely on a product with money math |
| Database | MongoDB (Atlas, `me-south-1` Bahrain) | Your choice; acceptable for KSA proximity |
| ODM | Mongoose | Schema validation, middleware, plugins for soft-delete/audit |
| Auth | Auth.js (NextAuth v5) with Credentials + Email provider | Invite-link flow needs email magic links; built-in CSRF and session handling |
| UI | Tailwind CSS + shadcn/ui | Your answer to Q24 — design system coming later, shadcn is a clean base to swap tokens into |
| Forms | React Hook Form + Zod | Zod schema shared between client validation and server actions |
| State | Server state via RSC + server actions; client state via Zustand where needed (POS cart) | Minimal Redux-grade machinery |
| File storage | Cloudflare R2 or AWS S3 (`me-south-1`) | Receipt PDFs, product images, employee document scans |
| PDFs | `@react-pdf/renderer` server-side | Invoice/receipt generation |
| QR codes | `qrcode` (npm) | ZATCA base64-encoded TLV payload |
| Cryptographic stamp (Phase 2) | `node-forge` or `@peculiar/x509` | XAdES signing — defer |
| Email | Resend | Transactional + invite emails |
| Hosting | Vercel (frontend) + MongoDB Atlas | Zero-ops for solo dev |
| Error tracking | Sentry | Free tier sufficient for pilots |
| Analytics | PostHog (self-hosted or cloud) | Product analytics, feature flags, session replay — replay is a godsend for debugging POS with real users |
| CI/CD | GitHub + Vercel preview deploys | Your answer to Q40 |

### 1.2 Multi-tenancy in MongoDB

You chose "Shared DB + tenant_id." In MongoDB this is idiomatic but requires discipline. Here's the pattern I recommend:

**Every non-global collection gets a `tenantId` field.** Every query goes through a Mongoose middleware that injects `tenantId` from the request context. Indexes are compound with `tenantId` as the first field.

**Request context via AsyncLocalStorage.** Next.js route handlers and server actions resolve the authenticated user → read their `tenantId` → stuff it into an AsyncLocalStorage store. A Mongoose plugin reads from that store on every query. This means model code never has to pass `tenantId` manually — it's automatic, and impossible to forget.

**Fail-closed.** If the AsyncLocalStorage store is empty, queries throw. This prevents accidental cross-tenant reads in background jobs or cron tasks; those must explicitly set the tenant context.

**Cross-tenant admin queries** (for your own super-admin panel) use an explicit `skipTenantScope: true` flag on the query, logged to an admin audit log.

**Indexes:**
```js
// Example: products collection
{ tenantId: 1, sku: 1 }         // unique, partial where soft-deleted=false
{ tenantId: 1, barcode: 1 }     // unique, partial
{ tenantId: 1, branchId: 1, updatedAt: -1 }
{ tenantId: 1, categoryId: 1 }
```

**Why not separate databases per tenant?** You explicitly chose shared DB, and for <1000 tenants this is correct. Operational simplicity (one connection pool, one backup, one migration run) wins until you have enterprise customers demanding isolation.

**Future-proofing for franchise parent view (Q13 = yes):** add an `organizationId` on the Tenant model. A tenant belongs to zero or one organization. A user can have roles across multiple tenants via a `Membership` join collection. The franchise parent gets a super-user role across child tenants. This costs you ~2 hours now, saves a data migration later.

### 1.3 MongoDB transactions

Accounting and POS sales must be atomic across multiple documents (sale + inventory decrement + ledger entry + audit log). MongoDB supports ACID multi-document transactions on replica sets — **Atlas gives you a replica set by default**, so transactions work out of the box. Use them for:

- POS sale completion (creates invoice + decrements stock + writes audit log)
- Stock transfers between branches
- Refunds (reverses invoice + increments stock + writes ledger)
- Anything touching money or inventory quantity

**Do NOT use transactions for:** read-heavy dashboard queries, single-document writes, or eventual-consistency-OK operations like sending an email receipt.

### 1.4 Idempotency (Q32 = yes)

Every POS sale request from the client carries a client-generated `idempotencyKey` (UUID v4). The server stores processed keys in a `IdempotencyRecord` collection with a 24-hour TTL index. Duplicate requests return the original response. This is ~30 lines of middleware and saves you from the "cashier double-clicked on 3G" disaster.

### 1.5 Soft delete, audit log (Q29 & Q30 = yes)

**Soft delete**: every user-facing collection has `deletedAt: Date | null` and `deletedBy: ObjectId | null`. A Mongoose plugin overrides `find`, `findOne`, and `updateX` to exclude soft-deleted docs by default. An explicit `.includeDeleted()` helper is available for admin/audit views.

**Audit log**: a single `AuditLog` collection captures every write to money-sensitive collections (invoices, payments, stock adjustments, price changes, user role changes). Schema:

```
_id, tenantId, userId, action ('create'|'update'|'delete'|'void'),
collection, documentId, before (partial), after (partial),
ipAddress, userAgent, timestamp
```

Use a post-save Mongoose hook on the tracked models. For ZATCA, invoice-related audit entries are **append-only forever** — never delete.

---

## 2. Data Model

This is the grocery-pilot-ready MVP schema. Conventions: `tenantId` everywhere, `createdAt/updatedAt` on every doc (via Mongoose timestamps), `deletedAt` on soft-deletable docs.

### 2.1 Core tenancy & identity

**Tenant** — the business (one KSA legal entity)
```
_id, organizationId?, name, nameAr, vatNumber (15-digit, starts with 3, ends with 3),
crNumber (commercial registration), address, addressAr, phone,
email, logoUrl, baseCurrency='SAR', timezone='Asia/Riyadh',
defaultLanguage ('ar'|'en'), vatRegistered: boolean,
zatcaPhase: 1|2, plan ('starter'|'growth'|'pro'|'enterprise'),
planExpiresAt, createdAt, updatedAt
```

**Organization** (for franchises/multi-tenant parents, Q13)
```
_id, name, ownerUserId, createdAt
```

**User** — a human
```
_id, email (unique), passwordHash?, emailVerifiedAt,
name, phone, avatarUrl, defaultLanguage, mfaEnabled, mfaSecret,
lastLoginAt, createdAt, updatedAt
```

**Membership** — user ↔ tenant with role (Q15: light RBAC, 3 roles)
```
_id, userId, tenantId, role ('owner'|'manager'|'cashier'),
branchIds: ObjectId[] (empty array = all branches),
invitedBy, invitedAt, acceptedAt, status ('invited'|'active'|'suspended'),
createdAt, updatedAt
```

Index: `{ userId: 1, tenantId: 1 }` unique, `{ tenantId: 1, role: 1 }`

**Branch** — a physical location
```
_id, tenantId, name, nameAr, address, addressAr, city, region,
phone, vatBranchCode (ZATCA requires this),
isHeadOffice: boolean, active: boolean, createdAt, updatedAt
```

### 2.2 Inventory

**Category** — product category tree
```
_id, tenantId, name, nameAr, parentId?, imageUrl, sortOrder,
active, deletedAt
```

**Product** — a sellable SKU (variants = Phase 2 per Q28)
```
_id, tenantId, sku (unique per tenant), barcode? (unique per tenant if set),
name, nameAr, description?, descriptionAr?, categoryId,
unit ('piece'|'kg'|'g'|'l'|'ml'|'pack'),
sellingPrice (Decimal128), vatRate: 0.15|0|null (null=exempt),
vatInclusivePrice: boolean,
costPrice (Decimal128)?,  // Q31 says Phase 2, but we store if provided
imageUrls: string[],
trackStock: boolean,      // false for services like bagging fee
lowStockThreshold: number,
expiryTracking: boolean,  // grocery-critical
active: boolean,
deletedAt, createdAt, updatedAt
```

Indexes: `{ tenantId: 1, sku: 1 }` unique partial `{deletedAt: null}`, `{ tenantId: 1, barcode: 1 }` unique partial, `{ tenantId: 1, categoryId: 1, active: 1 }`

**StockLevel** — per branch, per product
```
_id, tenantId, productId, branchId, quantity: Decimal128,
reservedQuantity: Decimal128,  // held by parked sales
updatedAt
```

Index: `{ tenantId: 1, productId: 1, branchId: 1 }` unique.

**StockBatch** — for expiry tracking (pharmacy/grocery)
```
_id, tenantId, productId, branchId, batchNumber, expiryDate,
quantity, costPrice, supplierId?, receivedAt, createdAt
```

Index: `{ tenantId: 1, productId: 1, branchId: 1, expiryDate: 1 }`. Used for FIFO-by-expiry picking at POS.

**StockMovement** — audit trail for every stock change
```
_id, tenantId, productId, branchId, batchId?,
type ('sale'|'refund'|'purchase'|'adjustment'|'transfer_out'|'transfer_in'|'waste'|'expired'),
quantityDelta: Decimal128, quantityAfter: Decimal128,
refCollection, refId, // e.g. ('Invoice', invoiceId)
reason?, userId, createdAt
```

Index: `{ tenantId: 1, productId: 1, createdAt: -1 }`

### 2.3 Sales

**Invoice** — a completed sale (ZATCA terminology: a tax invoice or simplified tax invoice)
```
_id, tenantId, branchId, cashierId,
invoiceNumber: string,       // "INV-000001" — sequential per tenant, NO GAPS (FTA/ZATCA requirement)
invoiceType: 'simplified' | 'standard',  // B2C vs B2B
status: 'draft' | 'completed' | 'voided' | 'refunded',

// ZATCA fields (Phase 1)
uuid: string (v4),           // RFC 4122 UUID
issuedAt: Date,              // the "Issue date" in ZATCA TLV
previousHash: string,        // sha256 of previous invoice's XML — hash chain
invoiceHash: string,         // sha256 of this invoice's canonical XML
qrCode: string (base64 TLV), // Seller name, VAT reg#, timestamp, total, VAT amount
xmlPayload?: string,         // UBL 2.1 XML (Phase 1 can skip, Phase 2 required)

// Customer (optional for simplified)
customerId?,
customerVatNumber?,          // required for standard invoice > SAR 1,000
customerName?,
customerAddress?,

// Totals (all Decimal128)
subtotal,                    // sum of line netAmount
discountTotal,
vatTotal,
grandTotal,

// Payments (array — supports split payments)
payments: [{
  method: 'cash'|'mada'|'visa'|'mastercard'|'amex'|'stc_pay'|'apple_pay'|'tabby'|'tamara'|'bank_transfer'|'store_credit',
  amount: Decimal128,
  referenceNumber?: string,   // card auth code, wallet txn id
  receivedAt: Date,
}],

refundedInvoiceId?,           // if this is a refund, link to original
voidedAt?, voidedBy?, voidReason?,
idempotencyKey: string,

createdAt, updatedAt
```

Indexes: `{ tenantId: 1, invoiceNumber: 1 }` unique, `{ tenantId: 1, branchId: 1, issuedAt: -1 }`, `{ tenantId: 1, status: 1, issuedAt: -1 }`, `{ tenantId: 1, cashierId: 1, issuedAt: -1 }`, `{ uuid: 1 }` unique.

**InvoiceLine** — embedded in Invoice as a subdocument array (denormalized for speed and historical accuracy)
```
productId, sku, name, nameAr,           // snapshot at time of sale
quantity: Decimal128,
unitPrice: Decimal128,                  // pre-discount
discountAmount: Decimal128,
netAmount: Decimal128,                  // (qty * unitPrice) - discount
vatRate: 0.15|0,
vatAmount: Decimal128,
totalAmount: Decimal128,                // netAmount + vatAmount
batchId?,                               // which batch was pulled from
```

**InvoiceCounter** — ensures gap-free sequential numbering
```
_id, tenantId, branchId?, currentValue
```

Use `findOneAndUpdate({...}, {$inc: {currentValue: 1}}, {upsert: true, returnDocument: 'after'})` inside the invoice transaction.

**Customer** — optional, for recurring customers & loyalty (Phase 2 loyalty)
```
_id, tenantId, name, nameAr?, phone, email?, vatNumber?,
addressLines, city, nationality, birthDate?,
totalSpent: Decimal128, visitCount: number, lastVisitAt?,
pdplConsent: { givenAt: Date, version: string, ipAddress: string },
deletedAt, createdAt, updatedAt
```

### 2.4 Suppliers & purchases (light MVP, full Phase 2)

**Supplier**
```
_id, tenantId, name, nameAr?, contactName, phone, email,
vatNumber?, paymentTerms, active, deletedAt, createdAt, updatedAt
```

For MVP I recommend keeping this minimal — supplier name + phone is enough to attach to a stock receipt. Full PO workflow lands in Phase 2.

### 2.5 Operational

**ParkedSale** — held carts (F-POS-09)
```
_id, tenantId, branchId, cashierId, customerId?,
lines: [InvoiceLine-like], note, createdAt, expiresAt (TTL 24h)
```

**CashDrawer** — end-of-day reconciliation (F-POS-08)
```
_id, tenantId, branchId, cashierId,
openedAt, openingBalance,
closedAt?, closingBalance?, expectedBalance?, variance?,
note?, status: 'open'|'closed'
```

Index: `{ tenantId: 1, branchId: 1, status: 1 }` partial where `status='open'` — one open drawer per cashier.

**AuditLog** — section 1.5
```
_id, tenantId, userId, action, collection, documentId,
before, after, ipAddress, userAgent, timestamp
```

Index: `{ tenantId: 1, collection: 1, documentId: 1, timestamp: -1 }`, `{ tenantId: 1, userId: 1, timestamp: -1 }`

**IdempotencyRecord** — section 1.4
```
_id (the key), tenantId, userId, responseBody, createdAt (TTL 24h)
```

**Invitation** — email-link invites (Q16)
```
_id, tenantId, email, role, branchIds, token (hashed),
invitedBy, expiresAt (7 days), acceptedAt?, createdAt
```

Index: `{ email: 1, tenantId: 1 }` partial where `acceptedAt: null`

### 2.6 Money handling — hard rule

Use **Mongoose `Decimal128`** for every monetary or quantity field. Never use JavaScript `number` for money. On the client, convert to/from `Decimal.js`. Rounding rule for SAR: half-away-from-zero to 2 decimal places, applied **only at display and at the invoice total** — never to individual line components (avoids accumulated rounding error on large baskets).

---

## 3. User Flows

Seven flows cover 90% of MVP behavior. Each below is a bullet list of steps — these translate directly to Next.js routes and server actions.

### 3.1 Onboarding (owner, first time)

1. Owner clicks sign-up link you sent them (no public self-serve for MVP).
2. They land on `/signup?token=...` which pre-fills their email.
3. They set a password, accept terms.
4. Wizard step 1: business details — name (EN + AR), VAT number, CR number, logo upload, address.
5. Wizard step 2: first branch — name, address, city, region.
6. Wizard step 3: import products — paste/upload CSV, or "I'll add them later."
7. Wizard step 4: invite team — emails + roles, or skip.
8. Land on dashboard with guided tooltips on the POS button.
9. **You** schedule a screen-share call within 24 hours to walk them through their first live sale.

**Hand-held onboarding means**: you create the tenant record, send the magic link, and join them on their first day. The wizard is polish; the conversation is the real onboarding.

### 3.2 POS sale (cashier — the hottest path)

1. Cashier opens `/pos` (full-screen layout, large touch targets).
2. Product added via (a) barcode scanner (USB HID keyboard-emulation — input field is always focused), (b) search by name/SKU, or (c) favorite-product grid tap.
3. Cart on right side with running totals.
4. Cashier can adjust quantity (+/- buttons, large), remove line, or apply line discount (if role permits).
5. Cashier taps "Pay" → payment modal.
6. Select method(s) — supports split (e.g., SAR 100 cash + SAR 50 Mada).
7. On "Complete," a server action:
   - Validates idempotency key.
   - Opens MongoDB transaction.
   - Decrements stock (FIFO by expiry for tracked products).
   - Generates next invoice number.
   - Computes ZATCA Phase 1 fields: UUID, previous invoice hash, current hash, TLV QR payload.
   - Saves Invoice + InvoiceLines + StockMovements + AuditLog.
   - Commits transaction.
   - Returns invoice ID + QR data.
8. Receipt screen shows: total, change due, QR code, and three buttons — **Print** (thermal, skipped for MVP), **WhatsApp** (opens `wa.me/<customer_phone>?text=<receipt_link>`), **Email**.
9. "New Sale" returns to empty cart, focus back on barcode field.

**Target: under 2 seconds from "Complete" tap to receipt shown.** For a grocery shop doing 300 transactions/day, every 200ms of latency is real friction.

### 3.3 Inventory — add product (manager)

1. `/inventory/products` → "Add Product" button.
2. Form: SKU (auto-generate option), barcode (scanner or type), name EN, name AR, category dropdown, unit, selling price, VAT rate (default 15%, also 0% and exempt), low-stock threshold, expiry-tracking toggle, initial stock per branch.
3. Submit → server action creates Product + StockLevel per branch + initial StockMovement if quantity > 0.
4. Redirect to product list with success toast.

**Bulk import** (expected at onboarding): CSV upload → server parses → preview with validation errors inline → confirm → batch insert with one transaction. Expect 500–5,000 rows for a typical grocery. Stream progress via polling a short-lived `ImportJob` record.

### 3.4 End-of-day close (cashier/manager)

1. Cashier opens `/pos/close-day`.
2. System shows: expected cash (opening balance + cash sales − cash refunds), expected Mada/card totals (for reconciliation against terminal settlement slips).
3. Cashier enters actual cash counted.
4. System shows variance. If variance > SAR 5, prompts for note.
5. Confirm → closes cash drawer record, writes audit log, locks the day's invoices against edits.
6. Prints/shares end-of-day summary (if they want it).

### 3.5 Invite team member (owner/manager)

1. `/settings/team` → "Invite."
2. Form: email, role (owner/manager/cashier), branches (if cashier, limited to 1).
3. Submit → server generates token, emails invite link with 7-day expiry.
4. Invitee clicks link → signup or login → accepts → Membership record activated.
5. Inviter sees status change to "active" on refresh.

### 3.6 VAT report (owner/accountant, end of quarter)

1. `/reports/vat` → date range defaults to current VAT quarter.
2. System aggregates: total taxable sales, total VAT collected (output tax), total VAT paid on purchases (input tax, if purchases recorded), net VAT payable.
3. Displays the five boxes of ZATCA's VAT return form, with drill-down links to source invoices.
4. **"Export"** button → PDF summary + CSV of every invoice and purchase. User uploads to ZATCA portal manually (at MVP; automated submission in Phase 2 with ZATCA Phase 2 integration).

### 3.7 Refund / return (cashier, manager-approved)

1. Cashier searches original invoice (by invoice number or customer phone or today's list).
2. Selects invoice, taps "Refund."
3. Chooses: full refund or partial (select lines).
4. Enters reason, selects refund method (default: original payment method).
5. If role is cashier and amount > SAR 100, waits for manager PIN entry (discount approval workflow, F-PRO-04, light version).
6. Server creates a "credit note" invoice (ZATCA classifies refunds as credit notes — same hash-chain rules apply).
7. Stock incremented, audit log written.

---

## 4. UI/UX Considerations

### 4.1 POS layout (desktop + tablet, Q26)

You asked for both desktop and tablet support at MVP. The split-brain solution is a **single responsive layout with breakpoint at 1024px**:

- **Desktop (≥1024px)**: left column = product grid with category tabs (30%), middle = search + quick-add (20%), right = cart + totals + pay button (50%). Keyboard shortcuts (F2 = search, F9 = pay, Esc = clear).
- **Tablet (<1024px)**: cart slides in from right as a drawer when products are added. Product grid takes full width. Larger touch targets (min 44×44px per Apple HIG / WCAG).

Model this after **Shopify POS** (your reference, Q22) — big tiles for fast-moving products, barcode field always present but visually subtle, payment button dominant and green.

**Critical keyboard behavior for desktop grocery:** the barcode scanner is a USB HID device that types characters + Enter. The POS search field must (a) stay focused whenever nothing else is, (b) differentiate a scan (fast keystrokes ending in Enter within 50ms) from typing. A scan bypasses search and adds the product directly; typing just filters.

### 4.2 RTL support

Arabic is RTL. Tailwind supports this natively with the `rtl:` variant and `dir="rtl"` on `<html>`. Plan:

1. Set `<html dir={lang === 'ar' ? 'rtl' : 'ltr'}>` in root layout based on a cookie.
2. Use logical Tailwind properties (`ms-4` / `me-4` / `ps-4`) instead of directional (`ml-4` / `mr-4`). shadcn/ui ships mostly-logical classes already; audit as you go.
3. Icons that imply direction (arrows, carets, chevrons) must flip with `rtl:scale-x-[-1]`.
4. Numbers stay Latin (0–9). Dates in Arabic locale use Hijri or Gregorian per user preference — default Gregorian.
5. ZATCA invoices require Arabic-capable text in certain fields — use a font that supports Arabic cleanly. **Noto Naskh Arabic** or **IBM Plex Sans Arabic** pair well with Inter for Latin.
6. Test with real Arabic text end to end — "short" English labels often become long Arabic ones and break layout.

### 4.3 Design system placeholder

**UPDATE:** Design system has been integrated! See `accountgo-design-system.md` in root.

The design system from AccountGo provides:
- Brand color: `#10b981` green (`--primary: 160 84% 39%`)
- Font: Figtree (Google Fonts)
- All CSS tokens in `src/app/globals.css`
- Semantic color palette for status indicators
- RTL support configured
- Print styles configured

### 4.4 Accessibility (Q27 — you didn't know)

**Recommendation**: target WCAG 2.1 AA as a baseline but don't get audited at MVP. Saudi doesn't have an enforced a11y law for private SaaS yet. Practical commitments for MVP:

- Semantic HTML (buttons are `<button>`, not `<div onClick>`).
- All inputs have labels.
- Color contrast ≥ 4.5:1 for text (lucky — default shadcn tokens already pass).
- Focus-visible outlines, keyboard navigation works everywhere, esp POS.
- No reliance on color alone (e.g. low-stock also has an icon, not just red).

This is ~10% extra work during build and is much more expensive to retrofit. Do it inline.

### 4.5 Error states, loading, empty states

A common failure of MVPs is skipping these three states. Do all three for every screen:

- **Empty**: "No products yet. Add your first one ↓" with a primary CTA, not a blank table.
- **Loading**: skeleton (not spinner) for lists. POS uses optimistic updates — the cart updates instantly, with a subtle "saving..." if the server is slow.
- **Error**: human-readable message + retry button + (dev mode only) stack trace. Sentry captures details.

### 4.6 Grocery-specific polish

Because your pilot is grocery (Q37):

- **Weight-based items** (apples, meat): unit = `kg`, scale integration is Phase 2, but at MVP, cashier types weight. Cart line shows "Apples — 1.350 kg × SAR 8 = SAR 10.80."
- **Quick-add favorites**: top-24 grid of best-sellers, one tap adds 1 unit. Owner configures in settings.
- **Expiry warnings**: cashier sees a soft yellow badge on products expiring within 7 days. Prevents selling expired goods silently.
- **Low-stock on POS**: when adding a product whose stock will go below threshold, a non-blocking toast tells the cashier. The owner gets an end-of-day email summary.

---

## 5. 20-Day Sprint Plan

Solo, aspirational deadline, TS strict, pilots waiting. Sequencing matters more than anything else — get POS + invoice on day 8, then polish.

**Assumption:** 7–8 productive hours/day, 6 days/week. Sprint is calendar days.

| Day | Focus | Key deliverables | Risk |
|---|---|---|---|
| 1 | Project bootstrap | Next.js 14 app, TS strict, Tailwind, shadcn/ui, MongoDB Atlas cluster, Mongoose, Auth.js setup with Credentials + Email, Vercel deploy, Sentry, PostHog, env hygiene | Low — all well-trodden |
| 2 | Multi-tenancy core | Tenant/User/Membership schemas, AsyncLocalStorage tenant context, Mongoose plugin injecting tenantId, soft-delete plugin, audit-log plugin, seed script with 1 test tenant | Medium — AsyncLocalStorage + Mongoose middleware has gotchas |
| 3 | Auth flows | Login, logout, session, invite-link flow (send + accept), password reset, basic `/app` layout with nav | Low |
| 4 | Business setup wizard | Signup flow, business-details form, first-branch form, basic settings pages | Low |
| 5 | Product catalog | Product CRUD, Category CRUD, CSV import with preview, image upload to R2 | Medium — CSV validation is fiddly |
| 6 | Stock & branches | StockLevel, StockMovement, manual adjustments, multi-branch-aware stock queries | Medium |
| 7 | POS UI shell | Layout, product grid, search, scanner detection, cart state (Zustand), quantity/discount/remove lines | Medium — responsive + keyboard + touch is nontrivial |
| 8 | **POS checkout + invoice (core)** | Server action for sale completion, transactional writes, InvoiceCounter, idempotency, basic invoice PDF render | **Highest risk** — this is the hardest piece |
| 9 | ZATCA Phase 1 | UUID, hash chain, TLV QR encoding, canonical XML (simplified — UBL 2.1 minimal), signed receipt PDF with QR rendered | High — ZATCA spec is dense; verify QR with ZATCA's public validator |
| 10 | Payments & split | Payment method selection, split payments, receipt flows (WhatsApp deep-link, email via Resend) | Low |
| 11 | Refunds + parked sales | Refund flow with credit-note invoice, park/resume sale | Medium |
| 12 | End-of-day close | Cash drawer open/close, reconciliation, day-lock | Low |
| 13 | Dashboard | Today/this-month sales, top 5 products, current stock value, low-stock list | Low |
| 14 | VAT report + exports | Quarterly VAT summary, invoice export PDF + CSV | Medium |
| 15 | Arabic/RTL pass | Translate strings, audit logical-spacing classes, RTL fixes, font switching | Medium — find real native-speaker proofreader ASAP |
| 16 | Role-based access + audit log UI | Enforce roles across routes, audit log viewer for owner | Low |
| 17 | Error states, empty states, loading, a11y pass | Every screen audit, Sentry noise reduction | Low |
| 18 | Real device testing | Actual USB scanner, actual tablet, actual receipt print to thermal via browser print dialog (ESC/POS deferred) | Medium |
| 19 | Pilot prep | Create first customer tenant, load their CSV, schedule onboarding calls | Low |
| 20 | Buffer + launch | Reserved for the overruns that will happen. Go-live with first pilot. | Life |

**Cuts to make if day 14 looks ugly:**

1. Push Arabic/RTL to Week 4 (ship English-only to first pilot, add Arabic week 4).
2. Simplify invoice to PDF-only without XML at MVP — still ZATCA-Phase-1-compliant if QR + UUID + hash are on the printed receipt.
3. Push refunds to week 4 (manual process for first two weeks).
4. Skip multi-branch at MVP — pilot has 1 branch.

**What I would not cut:**
- ZATCA Phase 1 QR + hash chain (it's the product).
- Transactions around POS sale (data integrity is non-negotiable).
- Audit log.
- Soft delete.
- Idempotency.

---

## 6. Post-MVP Roadmap (Saudi-adjusted)

| Phase | Weeks after MVP | Scope |
|---|---|---|
| **Phase 2 — Accounting + ZATCA Phase 2** | Weeks 4–10 | Full double-entry ledger, supplier+PO module, **ZATCA Fatoora API integration** (sandbox → production → certification), bank reconciliation import (CSV), customer DB + basic loyalty, multi-branch |
| **Phase 3 — HR & Mudad payroll** | Weeks 10–16 | Employee records, visa/Iqama tracking, attendance (manual), leave management, payroll runs, **Mudad WPS file export**, EOSB accrual per KSA Labour Law |
| **Phase 4 — Promotions & marketing** | Weeks 16–22 | Loyalty program, promotions engine (BOGO, bundles, Ramadan/Saudi National Day campaigns), WhatsApp Business API integration, SMS campaigns via Unifonic |
| **Phase 5 — E-commerce, API, mobile PWA** | Weeks 22–32 | REST API + OAuth for partners, Salla/Zid/Shopify connectors (Salla & Zid are KSA-native and huge), webhooks, offline-capable PWA for POS, banking integration |
| **Phase 6 — AI** | Weeks 32+ | Demand forecasting, auto-reorder, anomaly detection on sales, LLM-powered natural-language reports in Arabic + English |

**The ZATCA Phase 2 work specifically:**
- Register for Fatoora sandbox access via ZATCA portal.
- Generate CSR, obtain Compliance Cryptographic Stamp Identifier (CSID).
- Build UBL 2.1 XML generator (full spec, not minimal), XAdES-BES signing, Fatoora API client.
- B2B flow: clearance call before invoice issued to buyer.
- B2C flow: reporting call within 24 hours of sale (queue + retry).
- Get production CSID, go live per wave.
- **Budget:** ~3 weeks of focused work. Don't compress.

---

## 7. Security & Compliance Checklist (launch-blocking)

Before you onboard the first paying customer:

- [ ] HTTPS only (Vercel does this by default).
- [ ] Cookies: `httpOnly`, `secure`, `sameSite=lax`, short session TTL.
- [ ] Password hashing: bcrypt or argon2 (Auth.js handles).
- [ ] Rate limiting on auth routes (Upstash or Vercel's built-in).
- [ ] MFA available for owner role (Q in NF-SEC-02) — at least TOTP via Auth.js.
- [ ] Audit log enabled, tested, and viewable.
- [ ] Idempotency on money-moving endpoints.
- [ ] Soft-delete across user-facing collections.
- [ ] All input validated with Zod at the server boundary (server actions + API routes).
- [ ] Sentry DSN set, PII scrubbing on.
- [ ] Atlas IP allowlist restricted to Vercel egress + your ops IPs.
- [ ] Atlas backup schedule set (daily, 30-day retention).
- [ ] PDPL consent captured at customer record creation (Q35 = simple checkbox, documented version + timestamp).
- [ ] ZATCA Phase 1 invoice validator: test at least 100 invoices through the public QR validator before launch.
- [ ] Privacy policy + terms of service (Arabic + English) — get a KSA-jurisdiction lawyer to review, ~SAR 2,000–5,000.
- [ ] DPA (data processing addendum) ready for enterprise prospects.

---

## 8. Open Questions Remaining

These are the few I couldn't infer confidently — answer when you can, not urgent:

1. **Are your 5–10 pilot grocers VAT-registered?** If any aren't, their invoices don't need ZATCA fields — simpler for day-one but split your codebase between VAT-registered and not. I'd rather assume all are registered.
2. **Should Arabic be the default UI language for grocery pilots?** Your Q23 said English default. For Saudi grocery, 80%+ of staff prefer Arabic. Worth reconsidering before week 3 of the sprint.
3. **Preferred KSA payment gateway for when you wire up subscription billing** — Moyasar, HyperPay, PayTabs, or Tap? They have very different developer experiences. I'd recommend Moyasar for clean docs and Mada support out of the box.
4. **Do pilots have a thermal printer they want to use?** You said skip for MVP, but if they already have one and expect it to work, browser → print-to-PDF via 80mm receipt CSS (`@page { size: 80mm auto }`) gets you 80% there with zero native integration.
5. **Commercial Registration (CR) number format validation** — ZATCA wants 10-digit CR. Do you want to validate against the Ministry of Commerce lookup API at signup, or format-check only?

---

## 9. What This Document Is (and Isn't)

This roadmap is a **working plan**, not a contract. Everything here is intentionally revisable — expect to update it at the end of week 1 and again at the end of week 2 as reality lands. The data model is the most stable part; the sprint plan is the most fragile.

If you want me to also:
- Rewrite the requirements doc itself (UAE → KSA compliance rewrite),
- Draft the initial Mongoose schemas as actual TypeScript files,
- Build a Figma-level wireframe for the POS,
- Write the ZATCA Phase 1 QR/hash module,

…any of those are sensible next moves. I'd start with the Mongoose schemas — it catches design issues fastest.
