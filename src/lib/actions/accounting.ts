"use server";

import mongoose from "mongoose";
import {
  AccountingEntry,
  AccountingPeriodClose,
  ChartOfAccount,
  Customer,
  PaymentRecord,
  Supplier,
} from "@/models";
import type { AccountType } from "@/models/accounting/ChartOfAccount";
import {
  canTransitionAccountingEntryStatus,
  type AccountingEntryStatus,
} from "@/models/accounting/AccountingEntry";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";
import {
  buildLifecycleTransitionMetadata,
  createAuditEntry,
} from "@/lib/audit-trail";
import {
  getClosedPeriodGuardError,
  parseAccountingPeriodKey,
} from "@/lib/utils/accounting-periods";
import { reportCriticalFailure } from "@/lib/ops-monitoring";

const MAX_MONETARY_AMOUNT = 1_000_000_000;
const ALLOWED_ENTRY_ACCOUNT_TYPES: Record<"revenue" | "expense", AccountType[]> = {
  revenue: ["revenue"],
  expense: ["expense"],
};
const PAYMENT_METHODS = new Set([
  "cash",
  "mada",
  "visa",
  "mastercard",
  "bank_transfer",
  "stc_pay",
  "other",
]);
const PAYMENT_STATUSES = new Set(["pending", "completed"]);
const COUNTERPARTY_TYPES = new Set(["none", "customer", "vendor"]);
const DEBIT_NORMAL_ACCOUNT_TYPES: AccountType[] = ["asset", "expense"];

const DEFAULT_CHART_ACCOUNTS: Array<{ code: string; name: string; type: AccountType }> = [
  { code: "1100", name: "Cash on Hand", type: "asset" },
  { code: "1120", name: "Bank Account", type: "asset" },
  { code: "1200", name: "Accounts Receivable", type: "asset" },
  { code: "2100", name: "Accounts Payable", type: "liability" },
  { code: "3100", name: "Owner Equity", type: "equity" },
  { code: "4100", name: "Sales Revenue", type: "revenue" },
  { code: "5100", name: "Operating Expenses", type: "expense" },
  { code: "5200", name: "Cost of Goods Sold", type: "expense" },
];

async function requireAccountingAccess() {
  return getAuthorizedSessionMembership("accounting:view");
}

function parseAmount(raw: FormDataEntryValue | null, label: string) {
  const amount = Number(raw);
  if (!Number.isFinite(amount) || Number.isNaN(amount)) {
    return { error: `${label} must be a valid number` as const };
  }
  if (amount <= 0) {
    return { error: `${label} must be greater than zero` as const };
  }
  if (amount > MAX_MONETARY_AMOUNT) {
    return { error: `${label} is too large` as const };
  }

  return { value: Math.round(amount * 100) / 100 } as const;
}

function parseOptionalDate(raw: FormDataEntryValue | null, label: string) {
  if (!raw) return { value: new Date() } as const;
  const date = new Date(raw.toString());
  if (Number.isNaN(date.getTime())) {
    return { error: `${label} is invalid` as const };
  }

  const year = date.getUTCFullYear();
  if (year < 2000 || year > 2100) {
    return { error: `${label} is out of allowed range` as const };
  }

  return { value: date } as const;
}

async function getClosedPeriodsForTenant(
  tenantId: mongoose.Types.ObjectId,
  date?: Date
) {
  const match: Record<string, unknown> = { tenantId };
  if (date) {
    match.periodStart = { $lte: date };
    match.periodEnd = { $gte: date };
  }

  return AccountingPeriodClose.find(match)
    .sort({ periodStart: -1 })
    .select({ periodKey: 1, periodStart: 1, periodEnd: 1, closedAt: 1, closedById: 1 });
}

async function ensureDateIsOpenForAccountingMutation(
  tenantId: mongoose.Types.ObjectId,
  date: Date
) {
  const closedPeriods = await getClosedPeriodsForTenant(tenantId, date);
  return getClosedPeriodGuardError(
    date,
    closedPeriods.map((period) => ({
      periodKey: period.periodKey,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
    }))
  );
}

async function resolveCounterpartyRefs(
  membershipTenantId: mongoose.Types.ObjectId,
  counterpartyType: "none" | "customer" | "vendor",
  customerIdRaw: string,
  supplierIdRaw: string
) {
  if (counterpartyType === "none") {
    if (customerIdRaw || supplierIdRaw) {
      return { error: "Counterparty IDs are not allowed when type is none" as const };
    }
    return {};
  }

  if (counterpartyType === "customer") {
    if (supplierIdRaw) return { error: "Supplier cannot be set for customer entries" as const };
    if (!customerIdRaw) return {};
    if (!mongoose.Types.ObjectId.isValid(customerIdRaw)) {
      return { error: "Customer is invalid" as const };
    }

    const customer = await Customer.findOne({
      _id: customerIdRaw,
      tenantId: membershipTenantId,
      deletedAt: null,
    });
    if (!customer) return { error: "Customer not found in your tenant" as const };
    return { customerId: customer._id };
  }

  if (customerIdRaw) return { error: "Customer cannot be set for vendor entries" as const };
  if (!supplierIdRaw) return {};
  if (!mongoose.Types.ObjectId.isValid(supplierIdRaw)) {
    return { error: "Vendor is invalid" as const };
  }

  const supplier = await Supplier.findOne({
    _id: supplierIdRaw,
    tenantId: membershipTenantId,
    deletedAt: null,
    active: true,
  });
  if (!supplier) return { error: "Vendor not found in your tenant" as const };
  return { supplierId: supplier._id };
}

export async function ensureTenantChartOfAccounts(tenantId: mongoose.Types.ObjectId) {
  const existingCount = await ChartOfAccount.countDocuments({ tenantId });
  if (existingCount > 0) {
    return;
  }

  await ChartOfAccount.insertMany(
    DEFAULT_CHART_ACCOUNTS.map((account) => ({
      tenantId,
      ...account,
      allowPosting: true,
      active: true,
      isSystem: true,
    }))
  );
}

export async function createChartAccount(formData: FormData) {
  const auth = await requireAccountingAccess();
  if ("error" in auth) return { error: auth.error };

  const code = (formData.get("code") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const type = formData.get("type") as AccountType;

  if (!code || !name || !type) {
    return { error: "Code, name, and type are required" };
  }

  const existing = await ChartOfAccount.findOne({ tenantId: auth.membership.tenantId, code });
  if (existing) {
    return { error: "Account code already exists" };
  }

  const account = await ChartOfAccount.create({
    tenantId: auth.membership.tenantId,
    code,
    name,
    nameAr: ((formData.get("nameAr") as string) || "").trim() || undefined,
    type,
    description: ((formData.get("description") as string) || "").trim() || undefined,
    allowPosting: formData.get("allowPosting") === "on",
    active: true,
    isSystem: false,
  });

  return { accountId: account._id.toString() };
}

export async function updateChartAccount(accountId: string, formData: FormData) {
  const auth = await requireAccountingAccess();
  if ("error" in auth) return { error: auth.error };

  const account = await ChartOfAccount.findOne({
    _id: accountId,
    tenantId: auth.membership.tenantId,
  });

  if (!account) {
    return { error: "Account not found" };
  }

  account.name = (formData.get("name") as string)?.trim() || account.name;
  account.nameAr = ((formData.get("nameAr") as string) || "").trim() || undefined;
  account.description = ((formData.get("description") as string) || "").trim() || undefined;
  account.allowPosting = formData.get("allowPosting") === "on";
  account.active = formData.get("active") === "on";

  await account.save();

  return { success: true };
}

export async function createAccountingEntry(formData: FormData) {
  const auth = await requireAccountingAccess();
  if ("error" in auth) return { error: auth.error };

  const accountId = (formData.get("accountId") as string) || "";
  const kind = formData.get("kind") as "revenue" | "expense";
  const statusRaw = ((formData.get("status") as string) || "posted").trim() as AccountingEntryStatus;
  const counterpartyType = (formData.get("counterpartyType") as "none" | "customer" | "vendor") || "none";

  try {
    if (!["draft", "posted"].includes(statusRaw)) {
      return { error: "Entry status is invalid" };
    }
    const amountResult = parseAmount(formData.get("amount"), "Amount");
    if ("error" in amountResult) return { error: amountResult.error };

    if (!accountId || !kind) {
      return { error: "Account and type are required" };
    }
    if (!mongoose.Types.ObjectId.isValid(accountId)) {
      return { error: "Account is invalid" };
    }

    if (!["revenue", "expense"].includes(kind)) {
      return { error: "Entry type is invalid" };
    }

    const account = await ChartOfAccount.findOne({
      _id: accountId,
      tenantId: auth.membership.tenantId,
      active: true,
      allowPosting: true,
    });

    if (!account) {
      return { error: "Invalid account" };
    }
    if (!ALLOWED_ENTRY_ACCOUNT_TYPES[kind].includes(account.type)) {
      return { error: `${kind === "revenue" ? "Revenue" : "Expense"} entries must use ${kind} accounts` };
    }

    const debitRaw = formData.get("debitAmount");
    const creditRaw = formData.get("creditAmount");
    if (debitRaw || creditRaw) {
      const debitResult = parseAmount(debitRaw, "Debit amount");
      if ("error" in debitResult) return { error: debitResult.error };
      const creditResult = parseAmount(creditRaw, "Credit amount");
      if ("error" in creditResult) return { error: creditResult.error };

      if (Math.abs(debitResult.value - creditResult.value) > 0.001) {
        return { error: "Journal entry is unbalanced (debit must equal credit)" };
      }
    }

    if (!COUNTERPARTY_TYPES.has(counterpartyType)) {
      return { error: "Counterparty type is invalid" };
    }
    const counterpartyName = ((formData.get("counterpartyName") as string) || "").trim() || undefined;
    if (counterpartyName && counterpartyName.length > 120) {
      return { error: "Counterparty name is too long" };
    }

    const customerIdRaw = (formData.get("customerId") as string) || "";
    const supplierIdRaw = (formData.get("supplierId") as string) || "";

    const counterpartyRefs = await resolveCounterpartyRefs(
      auth.membership.tenantId,
      counterpartyType,
      customerIdRaw,
      supplierIdRaw
    );
    if ("error" in counterpartyRefs) {
      return { error: counterpartyRefs.error };
    }

    if (counterpartyType !== "none" && !counterpartyName && !counterpartyRefs.customerId && !counterpartyRefs.supplierId) {
      return { error: "Counterparty name or linked customer/vendor is required" };
    }

    const entryDateResult = parseOptionalDate(formData.get("entryDate"), "Entry date");
    if ("error" in entryDateResult) return { error: entryDateResult.error };
    const closedPeriodError = await ensureDateIsOpenForAccountingMutation(
      auth.membership.tenantId,
      entryDateResult.value
    );
    if (closedPeriodError) {
      return { error: closedPeriodError };
    }

    const entry = await AccountingEntry.create({
      tenantId: auth.membership.tenantId,
      accountId: account._id,
      kind,
      amount: amountResult.value,
      entryDate: entryDateResult.value,
      referenceType: "manual",
      referenceId: ((formData.get("referenceId") as string) || "").trim() || undefined,
      counterpartyType,
      counterpartyName,
      customerId: counterpartyRefs.customerId,
      supplierId: counterpartyRefs.supplierId,
      notes: ((formData.get("notes") as string) || "").trim() || undefined,
      status: statusRaw,
      createdById: auth.membership.userId,
    });

    await createAuditEntry({
      tenantId: auth.membership.tenantId,
      actorUserId: auth.membership.userId,
      entityType: "accounting-entry",
      entityId: entry._id as mongoose.Types.ObjectId,
      action: "create",
      after: {
        status: entry.status,
        amount: entry.amount,
        kind: entry.kind,
        entryDate: entry.entryDate,
      },
      metadata: {
        changedFields: ["status", "amount", "kind", "entryDate"],
        summary: "accounting-entry created",
      },
    });

    return { success: true, status: statusRaw };
  } catch (error) {
    await reportCriticalFailure({
      domain: "accounting",
      operation: "create-accounting-entry",
      error,
      tenantId: auth.membership.tenantId,
      actorTenantId: auth.membership.tenantId,
      entityType: "accounting-entry",
      entityId: accountId || undefined,
      metadata: {
        kind,
        status: statusRaw,
        counterpartyType,
      },
    });
    return { error: "Failed to create accounting entry due to a system issue" };
  }
}

export async function transitionAccountingEntryStatus(formData: FormData) {
  const auth = await requireAccountingAccess();
  if ("error" in auth) return { error: auth.error };

  const entryId = (formData.get("entryId") as string) || "";
  const targetStatus = ((formData.get("targetStatus") as string) || "").trim() as AccountingEntryStatus;
  const voidReason = ((formData.get("voidReason") as string) || "").trim();

  try {
    if (!mongoose.Types.ObjectId.isValid(entryId)) {
      return { error: "Entry not found" };
    }

    if (!["draft", "posted", "void"].includes(targetStatus)) {
      return { error: "Target status is invalid" };
    }

    const entry = await AccountingEntry.findOne({
      _id: entryId,
      tenantId: auth.membership.tenantId,
    });
    if (!entry) {
      return { error: "Entry not found" };
    }

    const closedPeriodError = await ensureDateIsOpenForAccountingMutation(
      auth.membership.tenantId,
      entry.entryDate
    );
    if (closedPeriodError) {
      return { error: closedPeriodError };
    }

    if (!canTransitionAccountingEntryStatus(entry.status, targetStatus)) {
      return { error: `Cannot move entry from ${entry.status} to ${targetStatus}` };
    }

    if (entry.status === "posted" && targetStatus !== "void") {
      return { error: "Posted entries are immutable; only void transition is allowed" };
    }

    const previousStatus = entry.status;
    const previousVoidReason = entry.voidReason;
    if (targetStatus === "void") {
      if (voidReason.length > 250) return { error: "Void reason is too long" };
      entry.voidedAt = new Date();
      entry.voidedById = auth.membership.userId;
      entry.voidReason = voidReason || undefined;
    } else {
      entry.voidedAt = undefined;
      entry.voidedById = undefined;
      entry.voidReason = undefined;
    }

    entry.status = targetStatus;
    await entry.save();
    await createAuditEntry({
      tenantId: auth.membership.tenantId,
      actorUserId: auth.membership.userId,
      entityType: "accounting-entry",
      entityId: entry._id as mongoose.Types.ObjectId,
      action: targetStatus === "void" ? "void" : "update",
      before: {
        status: previousStatus,
        voidReason: previousStatus === "void" ? previousVoidReason : undefined,
      },
      after: {
        status: targetStatus,
        voidReason: targetStatus === "void" ? entry.voidReason : undefined,
      },
      metadata: {
        ...buildLifecycleTransitionMetadata(
          "accounting-entry",
          previousStatus,
          targetStatus,
          targetStatus === "void" ? ["status", "voidedAt", "voidedById", "voidReason"] : ["status"]
        ),
      },
    });

    return { success: true };
  } catch (error) {
    await reportCriticalFailure({
      domain: "accounting",
      operation: "transition-accounting-entry-status",
      error,
      tenantId: auth.membership.tenantId,
      actorTenantId: auth.membership.tenantId,
      entityType: "accounting-entry",
      entityId: entryId || undefined,
      metadata: {
        targetStatus,
        hasVoidReason: Boolean(voidReason),
      },
    });
    return { error: "Failed to update accounting entry status due to a system issue" };
  }
}

export async function createPaymentRecord(formData: FormData) {
  const auth = await requireAccountingAccess();
  if ("error" in auth) return { error: auth.error };

  const partyType = formData.get("partyType") as "customer" | "vendor";
  if (!["customer", "vendor"].includes(partyType)) {
    return { error: "Party type is invalid" };
  }

  const amountResult = parseAmount(formData.get("amount"), "Amount");
  if ("error" in amountResult) return { error: amountResult.error };

  const partyName = ((formData.get("partyName") as string) || "").trim();
  if (!partyName) {
    return { error: "Party name is required" };
  }
  if (partyName.length > 120) {
    return { error: "Party name is too long" };
  }

  const customerIdRaw = (formData.get("customerId") as string) || "";
  const supplierIdRaw = (formData.get("supplierId") as string) || "";
  const counterpartyRefs = await resolveCounterpartyRefs(
    auth.membership.tenantId,
    partyType,
    customerIdRaw,
    supplierIdRaw
  );
  if ("error" in counterpartyRefs) {
    return { error: counterpartyRefs.error };
  }

  const paymentDateResult = parseOptionalDate(formData.get("paymentDate"), "Payment date");
  if ("error" in paymentDateResult) return { error: paymentDateResult.error };

  const method = ((formData.get("method") as string) || "cash").trim();
  if (!PAYMENT_METHODS.has(method)) {
    return { error: "Payment method is invalid" };
  }

  const status = ((formData.get("status") as string) || "completed").trim();
  if (!PAYMENT_STATUSES.has(status)) {
    return { error: "Payment status is invalid" };
  }

  const referenceNumber = ((formData.get("referenceNumber") as string) || "").trim();
  if (referenceNumber.length > 80) {
    return { error: "Reference is too long" };
  }

  const notes = ((formData.get("notes") as string) || "").trim();
  if (notes.length > 1000) {
    return { error: "Notes are too long" };
  }

  const paymentPayload = {
    partyType,
    direction: partyType === "customer" ? ("in" as const) : ("out" as const),
    partyName,
    amount: amountResult.value,
    paymentDate: paymentDateResult.value,
    method: method as
      | "cash"
      | "mada"
      | "visa"
      | "mastercard"
      | "bank_transfer"
      | "stc_pay"
      | "other",
    referenceNumber: referenceNumber || undefined,
    status: status as "pending" | "completed",
    notes: notes || undefined,
    customerId: counterpartyRefs.customerId,
    supplierId: counterpartyRefs.supplierId,
  };

  await PaymentRecord.create({
    tenantId: auth.membership.tenantId,
    ...paymentPayload,
    createdById: auth.membership.userId,
  });

  return { success: true };
}

export async function updatePaymentRecord(paymentId: string, formData: FormData) {
  const auth = await requireAccountingAccess();
  if ("error" in auth) return { error: auth.error };

  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return { error: "Payment not found" };
  }

  const payment = await PaymentRecord.findOne({
    _id: paymentId,
    tenantId: auth.membership.tenantId,
  });
  if (!payment) {
    return { error: "Payment not found" };
  }

  const partyType = formData.get("partyType") as "customer" | "vendor";
  if (!["customer", "vendor"].includes(partyType)) {
    return { error: "Party type is invalid" };
  }

  const amountResult = parseAmount(formData.get("amount"), "Amount");
  if ("error" in amountResult) return { error: amountResult.error };

  const partyName = ((formData.get("partyName") as string) || "").trim();
  if (!partyName) return { error: "Party name is required" };
  if (partyName.length > 120) return { error: "Party name is too long" };

  const customerIdRaw = (formData.get("customerId") as string) || "";
  const supplierIdRaw = (formData.get("supplierId") as string) || "";
  const counterpartyRefs = await resolveCounterpartyRefs(
    auth.membership.tenantId,
    partyType,
    customerIdRaw,
    supplierIdRaw
  );
  if ("error" in counterpartyRefs) return { error: counterpartyRefs.error };

  const paymentDateResult = parseOptionalDate(formData.get("paymentDate"), "Payment date");
  if ("error" in paymentDateResult) return { error: paymentDateResult.error };

  const method = ((formData.get("method") as string) || "cash").trim();
  if (!PAYMENT_METHODS.has(method)) return { error: "Payment method is invalid" };

  const status = ((formData.get("status") as string) || "completed").trim();
  if (!PAYMENT_STATUSES.has(status)) return { error: "Payment status is invalid" };

  const referenceNumber = ((formData.get("referenceNumber") as string) || "").trim();
  if (referenceNumber.length > 80) return { error: "Reference is too long" };

  const notes = ((formData.get("notes") as string) || "").trim();
  if (notes.length > 1000) return { error: "Notes are too long" };

  payment.partyType = partyType;
  payment.direction = partyType === "customer" ? "in" : "out";
  payment.partyName = partyName;
  payment.amount = amountResult.value;
  payment.paymentDate = paymentDateResult.value;
  payment.method = method as
    | "cash"
    | "mada"
    | "visa"
    | "mastercard"
    | "bank_transfer"
    | "stc_pay"
    | "other";
  payment.referenceNumber = referenceNumber || undefined;
  payment.status = status as "pending" | "completed";
  payment.notes = notes || undefined;
  payment.customerId = counterpartyRefs.customerId;
  payment.supplierId = counterpartyRefs.supplierId;

  await payment.save();

  return { success: true };
}

export async function getAccountingReportSummary(
  tenantId: string,
  options: {
    fromDate?: Date;
    toDate?: Date;
  }
) {
  const tenantOid = new mongoose.Types.ObjectId(tenantId);

  const dateMatch: Record<string, unknown> = {
    tenantId: tenantOid,
    status: "posted",
  };
  if (options.fromDate || options.toDate) {
    dateMatch.entryDate = {};
    if (options.fromDate) (dateMatch.entryDate as Record<string, Date>).$gte = options.fromDate;
    if (options.toDate) (dateMatch.entryDate as Record<string, Date>).$lte = options.toDate;
  }

  const paymentMatch: Record<string, unknown> = {
    tenantId: tenantOid,
    status: "completed",
  };
  if (options.fromDate || options.toDate) {
    paymentMatch.paymentDate = {};
    if (options.fromDate) (paymentMatch.paymentDate as Record<string, Date>).$gte = options.fromDate;
    if (options.toDate) (paymentMatch.paymentDate as Record<string, Date>).$lte = options.toDate;
  }

  const [entriesByKind, entriesByAccount, paymentsByDirection] = await Promise.all([
    AccountingEntry.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: "$kind",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    AccountingEntry.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: "$accountId",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "chartofaccounts",
          localField: "_id",
          foreignField: "_id",
          as: "account",
        },
      },
      { $unwind: "$account" },
      { $sort: { total: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          accountId: "$account._id",
          accountCode: "$account.code",
          accountName: "$account.name",
          accountType: "$account.type",
          total: 1,
          count: 1,
        },
      },
    ]),
    PaymentRecord.aggregate([
      { $match: paymentMatch },
      {
        $group: {
          _id: "$direction",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  return {
    entriesByKind,
    entriesByAccount,
    paymentsByDirection,
  };
}

type MonthCloseStatus = {
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
  alreadyClosed: boolean;
  closedAt?: Date;
  draftEntriesCount: number;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  issues: string[];
  canClose: boolean;
};

export async function getMonthCloseStatus(tenantId: string, periodKeyRaw: string): Promise<MonthCloseStatus | { error: string }> {
  const parsedPeriod = parseAccountingPeriodKey(periodKeyRaw);
  if ("error" in parsedPeriod) {
    return { error: parsedPeriod.error };
  }

  const tenantOid = new mongoose.Types.ObjectId(tenantId);
  const [existingClose, draftEntriesCount, trialBalance] = await Promise.all([
    AccountingPeriodClose.findOne({
      tenantId: tenantOid,
      periodKey: parsedPeriod.periodKey,
    }).select({ closedAt: 1 }),
    AccountingEntry.countDocuments({
      tenantId: tenantOid,
      status: "draft",
      entryDate: { $gte: parsedPeriod.periodStart, $lte: parsedPeriod.periodEnd },
    }),
    getTrialBalanceReport(tenantId, {
      fromDate: parsedPeriod.periodStart.toISOString().split("T")[0],
      toDate: parsedPeriod.periodEnd.toISOString().split("T")[0],
    }),
  ]);

  if (trialBalance.error) {
    return { error: trialBalance.error };
  }

  const issues: string[] = [];
  if (existingClose) {
    issues.push("Selected period is already closed");
  }
  if (draftEntriesCount > 0) {
    issues.push(`Selected period has ${draftEntriesCount} draft entr${draftEntriesCount === 1 ? "y" : "ies"}`);
  }

  const isBalanced = Math.abs(trialBalance.totalDebit - trialBalance.totalCredit) <= 0.001;
  if (!isBalanced) {
    issues.push("Trial balance is not balanced for selected period");
  }

  return {
    periodKey: parsedPeriod.periodKey,
    periodStart: parsedPeriod.periodStart,
    periodEnd: parsedPeriod.periodEnd,
    alreadyClosed: Boolean(existingClose),
    closedAt: existingClose?.closedAt,
    draftEntriesCount,
    totalDebit: trialBalance.totalDebit,
    totalCredit: trialBalance.totalCredit,
    isBalanced,
    issues,
    canClose: issues.length === 0,
  };
}

export async function closeAccountingPeriod(formData: FormData) {
  const auth = await requireAccountingAccess();
  if ("error" in auth) return { error: auth.error };

  const periodKeyRaw = ((formData.get("periodKey") as string) || "").trim();
  const notesRaw = ((formData.get("notes") as string) || "").trim();
  if (!periodKeyRaw) {
    return { error: "Accounting period is required" };
  }
  if (notesRaw.length > 500) {
    return { error: "Close notes are too long" };
  }

  try {
    const status = await getMonthCloseStatus(auth.membership.tenantId.toString(), periodKeyRaw);
    if ("error" in status) {
      return { error: status.error };
    }
    if (!status.canClose) {
      return { error: status.issues[0] || "Selected accounting period cannot be closed yet" };
    }

    await AccountingPeriodClose.create({
      tenantId: auth.membership.tenantId,
      periodKey: status.periodKey,
      periodStart: status.periodStart,
      periodEnd: status.periodEnd,
      closedById: auth.membership.userId,
      notes: notesRaw || undefined,
    });
    return { success: true, periodKey: status.periodKey };
  } catch (error) {
    const duplicateError = error as { code?: number };
    if (duplicateError.code === 11000) {
      return { error: "Selected period is already closed" };
    }
    await reportCriticalFailure({
      domain: "accounting",
      operation: "close-accounting-period",
      error,
      tenantId: auth.membership.tenantId,
      actorTenantId: auth.membership.tenantId,
      entityType: "accounting-period",
      entityId: periodKeyRaw,
      metadata: {
        periodKey: periodKeyRaw,
        hasNotes: Boolean(notesRaw),
      },
    });
    return { error: "Failed to close accounting period due to a system issue" };
  }
}

type ReportFilters = {
  fromDate?: string;
  toDate?: string;
};

type ReportDateRange = {
  fromDate?: Date;
  toDate?: Date;
};

function parseReportDateRange(filters: ReportFilters): { range?: ReportDateRange; error?: string } {
  const fromRaw = filters.fromDate?.trim();
  const toRaw = filters.toDate?.trim();

  const range: ReportDateRange = {};
  if (fromRaw) {
    const fromDate = new Date(fromRaw);
    if (Number.isNaN(fromDate.getTime())) {
      return { error: "From date is invalid" };
    }
    range.fromDate = fromDate;
  }

  if (toRaw) {
    const toDate = new Date(toRaw);
    if (Number.isNaN(toDate.getTime())) {
      return { error: "To date is invalid" };
    }
    toDate.setHours(23, 59, 59, 999);
    range.toDate = toDate;
  }

  if (range.fromDate && range.toDate && range.fromDate > range.toDate) {
    return { error: "From date cannot be after To date" };
  }

  return { range };
}

function buildEntryMatch(tenantOid: mongoose.Types.ObjectId, range: ReportDateRange) {
  const match: Record<string, unknown> = {
    tenantId: tenantOid,
    status: "posted",
  };

  if (range.fromDate || range.toDate) {
    match.entryDate = {};
    if (range.fromDate) (match.entryDate as Record<string, Date>).$gte = range.fromDate;
    if (range.toDate) (match.entryDate as Record<string, Date>).$lte = range.toDate;
  }

  return match;
}

export async function getTrialBalanceReport(tenantId: string, filters: ReportFilters) {
  const parsed = parseReportDateRange(filters);
  if (parsed.error) {
    return { error: parsed.error, rows: [], totalDebit: 0, totalCredit: 0 };
  }

  const tenantOid = new mongoose.Types.ObjectId(tenantId);
  const match = buildEntryMatch(tenantOid, parsed.range || {});
  const rows = await AccountingEntry.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "chartofaccounts",
        let: { accountId: "$accountId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$accountId"] },
              tenantId: tenantOid,
            },
          },
          {
            $project: {
              code: 1,
              name: 1,
              type: 1,
            },
          },
        ],
        as: "account",
      },
    },
    { $unwind: "$account" },
    {
      $group: {
        _id: "$account._id",
        accountCode: { $first: "$account.code" },
        accountName: { $first: "$account.name" },
        accountType: { $first: "$account.type" },
        total: { $sum: "$amount" },
      },
    },
    {
      $project: {
        _id: 0,
        accountId: "$_id",
        accountCode: 1,
        accountName: 1,
        accountType: 1,
        debit: {
          $cond: [{ $in: ["$accountType", DEBIT_NORMAL_ACCOUNT_TYPES] }, "$total", 0],
        },
        credit: {
          $cond: [{ $in: ["$accountType", DEBIT_NORMAL_ACCOUNT_TYPES] }, 0, "$total"],
        },
      },
    },
    {
      $addFields: {
        balance: { $subtract: ["$debit", "$credit"] },
      },
    },
    { $sort: { accountCode: 1 } },
  ]);

  const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0);
  const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0);

  return {
    rows,
    totalDebit,
    totalCredit,
  };
}

export async function getAccountLedgerReport(
  tenantId: string,
  filters: ReportFilters & {
    accountId?: string;
  }
) {
  const parsed = parseReportDateRange(filters);
  if (parsed.error) {
    return {
      error: parsed.error,
      account: null,
      openingBalance: 0,
      closingBalance: 0,
      periodDebit: 0,
      periodCredit: 0,
      rows: [],
    };
  }

  const accountId = filters.accountId?.trim() || "";
  if (!accountId) {
    return {
      error: "Account is required",
      account: null,
      openingBalance: 0,
      closingBalance: 0,
      periodDebit: 0,
      periodCredit: 0,
      rows: [],
    };
  }

  if (!mongoose.Types.ObjectId.isValid(accountId)) {
    return {
      error: "Account is invalid",
      account: null,
      openingBalance: 0,
      closingBalance: 0,
      periodDebit: 0,
      periodCredit: 0,
      rows: [],
    };
  }

  const tenantOid = new mongoose.Types.ObjectId(tenantId);
  const account = await ChartOfAccount.findOne({
    _id: accountId,
    tenantId: tenantOid,
  }).select({ code: 1, name: 1, type: 1 });

  if (!account) {
    return {
      error: "Account not found",
      account: null,
      openingBalance: 0,
      closingBalance: 0,
      periodDebit: 0,
      periodCredit: 0,
      rows: [],
    };
  }

  const accountIsDebitNormal = DEBIT_NORMAL_ACCOUNT_TYPES.includes(account.type);
  const openingMatch: Record<string, unknown> = {
    tenantId: tenantOid,
    status: "posted",
    accountId: account._id,
  };
  if (parsed.range?.fromDate) {
    openingMatch.entryDate = { $lt: parsed.range.fromDate };
  }

  const [openingAggregate, entries] = await Promise.all([
    AccountingEntry.aggregate([
      { $match: openingMatch },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]),
    AccountingEntry.find({
      ...buildEntryMatch(tenantOid, parsed.range || {}),
      accountId: account._id,
    })
      .sort({ entryDate: 1, createdAt: 1, _id: 1 })
      .select({
        entryDate: 1,
        kind: 1,
        amount: 1,
        counterpartyName: 1,
        referenceId: 1,
        notes: 1,
      }),
  ]);

  const openingAmount = openingAggregate[0]?.total || 0;
  const openingBalance = accountIsDebitNormal ? openingAmount : -openingAmount;

  let runningBalance = openingBalance;
  let periodDebit = 0;
  let periodCredit = 0;
  const rows = entries.map((entry) => {
    const debit = accountIsDebitNormal ? entry.amount : 0;
    const credit = accountIsDebitNormal ? 0 : entry.amount;
    periodDebit += debit;
    periodCredit += credit;
    runningBalance += debit - credit;

    return {
      id: entry._id.toString(),
      entryDate: entry.entryDate,
      kind: entry.kind,
      counterpartyName: entry.counterpartyName || "",
      referenceId: entry.referenceId || "",
      notes: entry.notes || "",
      debit,
      credit,
      runningBalance,
    };
  });

  return {
    account: {
      id: account._id.toString(),
      code: account.code,
      name: account.name,
      type: account.type,
    },
    openingBalance,
    closingBalance: runningBalance,
    periodDebit,
    periodCredit,
    rows,
  };
}

export async function getProfitAndLossSummary(tenantId: string, filters: ReportFilters) {
  const parsed = parseReportDateRange(filters);
  if (parsed.error) {
    return {
      error: parsed.error,
      revenueByAccount: [],
      expenseByAccount: [],
      totalRevenue: 0,
      totalExpense: 0,
      netProfit: 0,
    };
  }

  const tenantOid = new mongoose.Types.ObjectId(tenantId);
  const match = buildEntryMatch(tenantOid, parsed.range || {});
  const grouped = await AccountingEntry.aggregate([
    { $match: match },
    {
      $lookup: {
        from: "chartofaccounts",
        let: { accountId: "$accountId" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$_id", "$$accountId"] },
              tenantId: tenantOid,
            },
          },
          { $project: { code: 1, name: 1, type: 1 } },
        ],
        as: "account",
      },
    },
    { $unwind: "$account" },
    { $match: { "account.type": { $in: ["revenue", "expense"] } } },
    {
      $group: {
        _id: "$account._id",
        accountCode: { $first: "$account.code" },
        accountName: { $first: "$account.name" },
        accountType: { $first: "$account.type" },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { accountCode: 1 } },
  ]);

  const revenueByAccount = grouped
    .filter((item) => item.accountType === "revenue")
    .map((item) => ({
      accountId: item._id.toString(),
      accountCode: item.accountCode,
      accountName: item.accountName,
      total: item.total,
    }));
  const expenseByAccount = grouped
    .filter((item) => item.accountType === "expense")
    .map((item) => ({
      accountId: item._id.toString(),
      accountCode: item.accountCode,
      accountName: item.accountName,
      total: item.total,
    }));

  const totalRevenue = revenueByAccount.reduce((sum, item) => sum + item.total, 0);
  const totalExpense = expenseByAccount.reduce((sum, item) => sum + item.total, 0);

  return {
    revenueByAccount,
    expenseByAccount,
    totalRevenue,
    totalExpense,
    netProfit: totalRevenue - totalExpense,
  };
}

export async function getCounterpartyOptions(tenantId: mongoose.Types.ObjectId) {
  const [customers, suppliers] = await Promise.all([
    Customer.find({ tenantId, deletedAt: null }).sort({ name: 1 }).limit(100),
    Supplier.find({ tenantId, deletedAt: null, active: true }).sort({ name: 1 }).limit(100),
  ]);

  return {
    customers: customers.map((customer) => ({
      id: customer._id.toString(),
      name: customer.name,
    })),
    suppliers: suppliers.map((supplier) => ({
      id: supplier._id.toString(),
      name: supplier.name,
    })),
  };
}
