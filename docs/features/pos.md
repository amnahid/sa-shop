# Point of Sale (POS)

The Point of Sale is designed for speed, reliability, and total compliance with KSA ZATCA Phase 1 regulations.

## Features

### Checkout Experience
- **High-Speed Scanning**: Optimized for USB/Bluetooth barcode scanners with automatic product addition.
- **Touch-Friendly UI**: Large tiles and buttons for easy operation on tablets and touch screens.
- **Search & Filter**: Find products quickly by name, SKU, or category.
- **Parked Sales**: Temporarily hold a customer's cart and resume it later to handle busy periods.
- **Discounts**: Apply line-item or basket-level discounts (percentage or fixed amount).

### Payments
- **Multi-Method Payments**: Support for Cash, Mada, Visa, Mastercard, AMEX, Apple Pay, and STC Pay.
- **Split Payments**: Allow customers to pay using multiple methods in a single transaction.
- **Change Calculation**: Automatic calculation of change due for cash transactions.

### ZATCA Compliance
- **Simplified Tax Invoices**: Automatically generated for all B2C transactions.
- **ZATCA QR Codes**: Real-time generation of Base64 TLV encoded QR codes containing Seller Name, VAT#, Timestamp, Total, and VAT Amount.
- **Immutable Hash Chain**: Every invoice is cryptographically linked to the previous one to ensure integrity.
- **Unique Identifiers**: Every invoice includes a compliant UUID and sequential number with no gaps.

### Receipt Delivery
- **WhatsApp Receipts**: Send digital receipts directly to a customer's phone via `wa.me`.
- **Email Delivery**: Automatic email delivery of PDF receipts.
- **Thermal Printing**: Optimized CSS styles for standard 80mm thermal receipt printers.

## Operational Controls
- **Cash Drawer Management**: Open/Close shift workflows with reconciliation of expected vs. actual cash.
- **Manager Approval**: PIN-protected approvals for high-value discounts or refunds.
- **Idempotency Protection**: Prevents double-charging and duplicate invoices due to network lag.

## User Roles
- **Cashiers**: Perform sales, park/resume carts, and print receipts.
- **Managers**: Can void sales, approve discounts, and close the shift.
