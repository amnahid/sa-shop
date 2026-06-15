# Accounting & Finance

The Accounting module provides the financial backbone for the business, ensuring tax compliance and providing clear visibility into profitability.

## Features

### Invoicing
- **Standard Tax Invoices**: B2B invoices with customer VAT registration details and address.
- **Simplified Tax Invoices**: Quick B2C receipts generated at the POS.
- **Credit Notes**: Manage returns and refunds with full ZATCA-compliant credit note generation.
- **Sequential Numbering**: Gap-free invoice numbering as required by ZATCA and FTA.

### VAT Management
- **Output Tax Tracking**: Real-time aggregation of VAT collected on all sales.
- **Input Tax Tracking**: Record VAT paid on purchases to offset against output tax.
- **Quarterly Reporting**: Automated calculation of VAT return boxes for easy submission to ZATCA.
- **Compliance Checks**: Automatic validation of 15-digit KSA VAT numbers.

### Ledger & Entries
- **Automated Journal Entries**: Every sale and purchase automatically creates relevant ledger entries.
- **Chart of Accounts**: Standardized accounts tailored for retail (Revenue, COGS, Inventory Asset, Accounts Receivable/Payable).
- **Manual Adjustments**: Correct financial errors with documented journal entries (Manager only).

### Multi-branch Finance
- **Branch-level Profitability**: Track revenue and expenses per location.
- **Inter-branch Transfers**: Financial tracking of inventory moving between stores.

## Compliance
- **ZATCA Phase 1**: Full support for UUID, hash chains, and QR codes on all tax documents.
- **ZATCA Phase 2 (Roadmap)**: Planned integration for real-time reporting via ZATCA's Fatoora API.
- **Append-only Invoices**: Invoices cannot be deleted; they must be voided or refunded to maintain an audit trail.

## User Roles
- **Accountants**: Can view all financial reports, exports, and ledger entries.
- **Owners**: Full access to financial data and configuration.
