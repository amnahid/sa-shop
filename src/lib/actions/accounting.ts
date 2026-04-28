"use server";

import mongoose from "mongoose";
import { getSession } from "@/lib/auth-utils";
import {
  AccountingEntry,
  ChartOfAccount,
  Customer,
  Membership,
  PaymentRecord,
  Supplier,
} from "@/models";
import type { AccountType } from "@/models/accounting/ChartOfAccount";

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

async function requireActiveMembership() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) return null;

  return membership;
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
  const membership = await requireActiveMembership();
  if (!membership) return { error: "Unauthorized" };

  const code = (formData.get("code") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const type = formData.get("type") as AccountType;

  if (!code || !name || !type) {
    return { error: "Code, name, and type are required" };
  }

  const existing = await ChartOfAccount.findOne({ tenantId: membership.tenantId, code });
  if (existing) {
    return { error: "Account code already exists" };
  }

  const account = await ChartOfAccount.create({
    tenantId: membership.tenantId,
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
  const membership = await requireActiveMembership();
  if (!membership) return { error: "Unauthorized" };

  const account = await ChartOfAccount.findOne({
    _id: accountId,
    tenantId: membership.tenantId,
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
  const membership = await requireActiveMembership();
  if (!membership) return { error: "Unauthorized" };

  const accountId = formData.get("accountId") as string;
  const kind = formData.get("kind") as "revenue" | "expense";
  const amountValue = Number(formData.get("amount") as string);

  if (!accountId || !kind || Number.isNaN(amountValue) || amountValue <= 0) {
    return { error: "Account, type, and amount are required" };
  }

  const account = await ChartOfAccount.findOne({
    _id: accountId,
    tenantId: membership.tenantId,
    active: true,
  });

  if (!account) {
    return { error: "Invalid account" };
  }

  const counterpartyType = (formData.get("counterpartyType") as "none" | "customer" | "vendor") || "none";
  const counterpartyName = ((formData.get("counterpartyName") as string) || "").trim() || undefined;
  const customerIdRaw = (formData.get("customerId") as string) || "";
  const supplierIdRaw = (formData.get("supplierId") as string) || "";

  const customerId =
    counterpartyType === "customer" && mongoose.Types.ObjectId.isValid(customerIdRaw)
      ? new mongoose.Types.ObjectId(customerIdRaw)
      : undefined;
  const supplierId =
    counterpartyType === "vendor" && mongoose.Types.ObjectId.isValid(supplierIdRaw)
      ? new mongoose.Types.ObjectId(supplierIdRaw)
      : undefined;

  await AccountingEntry.create({
    tenantId: membership.tenantId,
    accountId: account._id,
    kind,
    amount: amountValue,
    entryDate: formData.get("entryDate") ? new Date(formData.get("entryDate") as string) : new Date(),
    referenceType: "manual",
    referenceId: ((formData.get("referenceId") as string) || "").trim() || undefined,
    counterpartyType,
    counterpartyName,
    customerId,
    supplierId,
    notes: ((formData.get("notes") as string) || "").trim() || undefined,
    status: "posted",
    createdById: membership.userId,
  });

  return { success: true };
}

export async function createPaymentRecord(formData: FormData) {
  const membership = await requireActiveMembership();
  if (!membership) return { error: "Unauthorized" };

  const partyType = formData.get("partyType") as "customer" | "vendor";
  const amount = Number(formData.get("amount") as string);
  const partyName = ((formData.get("partyName") as string) || "").trim();

  if (!partyType || !partyName || Number.isNaN(amount) || amount <= 0) {
    return { error: "Party type, party name, and amount are required" };
  }

  const customerIdRaw = (formData.get("customerId") as string) || "";
  const supplierIdRaw = (formData.get("supplierId") as string) || "";

  await PaymentRecord.create({
    tenantId: membership.tenantId,
    partyType,
    direction: partyType === "customer" ? "in" : "out",
    partyName,
    amount,
    paymentDate: formData.get("paymentDate") ? new Date(formData.get("paymentDate") as string) : new Date(),
    method: (formData.get("method") as string) || "cash",
    referenceNumber: ((formData.get("referenceNumber") as string) || "").trim() || undefined,
    status: (formData.get("status") as "pending" | "completed") || "completed",
    notes: ((formData.get("notes") as string) || "").trim() || undefined,
    customerId:
      partyType === "customer" && mongoose.Types.ObjectId.isValid(customerIdRaw)
        ? new mongoose.Types.ObjectId(customerIdRaw)
        : undefined,
    supplierId:
      partyType === "vendor" && mongoose.Types.ObjectId.isValid(supplierIdRaw)
        ? new mongoose.Types.ObjectId(supplierIdRaw)
        : undefined,
    createdById: membership.userId,
  });

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
