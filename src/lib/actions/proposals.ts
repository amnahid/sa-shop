"use server";

import mongoose from "mongoose";
import { Branch, Customer, Proposal } from "@/models";
import type { ProposalStatus } from "@/models/sales/Proposal";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";
import { buildLifecycleTransitionMetadata, createAuditEntry } from "@/lib/audit-trail";

type ParsedProposalLine = {
  productId: mongoose.Types.ObjectId;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: mongoose.Types.Decimal128;
  vatRate: number;
  lineSubtotal: mongoose.Types.Decimal128;
  lineVatAmount: mongoose.Types.Decimal128;
  lineTotal: mongoose.Types.Decimal128;
};

const ALLOWED_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  draft: ["sent", "rejected"],
  sent: ["accepted", "rejected", "draft"],
  accepted: [],
  rejected: ["draft"],
  converted: [],
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

async function getActiveMembership() {
  return getAuthorizedSessionMembership("sales.proposals:view");
}

async function getNextProposalNumber(tenantId: mongoose.Types.ObjectId) {
  const count = await Proposal.countDocuments({ tenantId });
  return `PROP-${(count + 1).toString().padStart(8, "0")}`;
}

function parseProposalLines(linesRaw: string): ParsedProposalLine[] {
  const input = JSON.parse(linesRaw) as Array<{
    productId: string;
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
  }>;

  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("At least one line item is required");
  }

  return input.map((line) => {
    if (!line.productId || !line.name || !line.sku) {
      throw new Error("Each line item must include product, SKU and name");
    }

    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);
    const vatRate = Number(line.vatRate);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error("Unit price cannot be negative");
    }
    if (![0, 0.15].includes(vatRate)) {
      throw new Error("VAT rate must be 0% or 15%");
    }

    const lineSubtotal = round2(quantity * unitPrice);
    const lineVatAmount = round2(lineSubtotal * vatRate);
    const lineTotal = round2(lineSubtotal + lineVatAmount);

    return {
      productId: new mongoose.Types.ObjectId(line.productId),
      sku: line.sku,
      name: line.name,
      quantity,
      unitPrice: mongoose.Types.Decimal128.fromString(unitPrice.toFixed(2)),
      vatRate,
      lineSubtotal: mongoose.Types.Decimal128.fromString(lineSubtotal.toFixed(2)),
      lineVatAmount: mongoose.Types.Decimal128.fromString(lineVatAmount.toFixed(2)),
      lineTotal: mongoose.Types.Decimal128.fromString(lineTotal.toFixed(2)),
    };
  });
}

export async function createProposal(formData: FormData) {
  const auth = await getActiveMembership();
  if ("error" in auth) return { error: auth.error };

  const branchId = formData.get("branchId") as string;
  const customerId = formData.get("customerId") as string;
  const linesRaw = formData.get("lines") as string;

  if (!branchId) return { error: "Branch is required" };
  if (!linesRaw) return { error: "At least one line item is required" };

  const branch = await Branch.findOne({
    _id: new mongoose.Types.ObjectId(branchId),
    tenantId: auth.membership.tenantId,
  });
  if (!branch) return { error: "Branch not found" };

  let proposalCustomerId: mongoose.Types.ObjectId | undefined;
  let proposalCustomerName: string | undefined;
  let proposalCustomerVatNumber: string | undefined;
  if (customerId) {
    const customer = await Customer.findOne({
      _id: new mongoose.Types.ObjectId(customerId),
      tenantId: auth.membership.tenantId,
      deletedAt: null,
    });
    if (!customer) return { error: "Customer not found" };
    proposalCustomerId = customer._id as mongoose.Types.ObjectId;
    proposalCustomerName = customer.name;
    proposalCustomerVatNumber = customer.vatNumber || undefined;
  }

  let lines: ParsedProposalLine[];
  try {
    lines = parseProposalLines(linesRaw);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid line items" };
  }

  const subtotal = round2(
    lines.reduce((sum, line) => sum + parseFloat(line.lineSubtotal.toString()), 0)
  );
  const vatTotal = round2(
    lines.reduce((sum, line) => sum + parseFloat(line.lineVatAmount.toString()), 0)
  );
  const grandTotal = round2(subtotal + vatTotal);

  const proposal = await Proposal.create({
    tenantId: auth.membership.tenantId,
    branchId: new mongoose.Types.ObjectId(branchId),
    createdById: new mongoose.Types.ObjectId(auth.sessionUserId),
    proposalNumber: await getNextProposalNumber(auth.membership.tenantId),
    title: (formData.get("title") as string) || undefined,
    customerId: proposalCustomerId,
    customerName: proposalCustomerName,
    customerVatNumber: proposalCustomerVatNumber,
    validUntil: formData.get("validUntil")
      ? new Date(formData.get("validUntil") as string)
      : undefined,
    notes: (formData.get("notes") as string) || undefined,
    currency: "SAR",
    subtotal: mongoose.Types.Decimal128.fromString(subtotal.toFixed(2)),
    vatTotal: mongoose.Types.Decimal128.fromString(vatTotal.toFixed(2)),
    grandTotal: mongoose.Types.Decimal128.fromString(grandTotal.toFixed(2)),
    lines,
  });

  await createAuditEntry({
    tenantId: auth.membership.tenantId,
    actorUserId: auth.membership.userId,
    entityType: "proposal",
    entityId: proposal._id as mongoose.Types.ObjectId,
    action: "create",
    after: {
      status: proposal.status,
      proposalNumber: proposal.proposalNumber,
      grandTotal: proposal.grandTotal,
    },
    metadata: {
      changedFields: ["status", "proposalNumber", "grandTotal"],
      summary: "proposal created",
    },
  });

  return { proposalId: proposal._id.toString() };
}

export async function loadProposals(tenantId: string, status?: ProposalStatus) {
  const filter: Record<string, unknown> = {
    tenantId: new mongoose.Types.ObjectId(tenantId),
  };
  if (status) filter.status = status;

  const proposals = await Proposal.aggregate([
    { $match: filter },
    { $sort: { issuedAt: -1 } },
    { $limit: 100 },
    {
      $lookup: {
        from: "branches",
        localField: "branchId",
        foreignField: "_id",
        as: "branch",
      },
    },
    { $unwind: "$branch" },
    {
      $lookup: {
        from: "customers",
        localField: "customerId",
        foreignField: "_id",
        as: "customer",
      },
    },
    { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        proposalNumber: 1,
        title: 1,
        status: 1,
        issuedAt: 1,
        validUntil: 1,
        grandTotal: 1,
        customerName: 1,
        "customer.name": 1,
        "branch.name": 1,
        lineCount: { $size: "$lines" },
      },
    },
  ]);

  return proposals;
}

export async function transitionProposalStatus(proposalId: string, nextStatus: ProposalStatus) {
  const auth = await getActiveMembership();
  if ("error" in auth) return { error: auth.error };

  const proposal = await Proposal.findOne({
    _id: new mongoose.Types.ObjectId(proposalId),
    tenantId: auth.membership.tenantId,
  });
  if (!proposal) return { error: "Proposal not found" };

  const currentStatus = proposal.status as ProposalStatus;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    return { error: `Cannot change proposal from ${currentStatus} to ${nextStatus}` };
  }

  const previousStatus = proposal.status;
  await Proposal.findByIdAndUpdate(proposal._id, { status: nextStatus });
  await createAuditEntry({
    tenantId: auth.membership.tenantId,
    actorUserId: auth.membership.userId,
    entityType: "proposal",
    entityId: proposal._id as mongoose.Types.ObjectId,
    action: "update",
    before: { status: previousStatus },
    after: { status: nextStatus },
    metadata: {
      ...buildLifecycleTransitionMetadata("proposal", previousStatus, nextStatus, ["status"]),
    },
  });

  return { success: true };
}

export async function startProposalInvoiceConversion(proposalId: string) {
  const auth = await getActiveMembership();
  if ("error" in auth) return { error: auth.error };

  const proposal = await Proposal.findOne({
    _id: new mongoose.Types.ObjectId(proposalId),
    tenantId: auth.membership.tenantId,
  });
  if (!proposal) return { error: "Proposal not found" };
  if (proposal.status !== "accepted" && proposal.status !== "converted") {
    return { error: "Only accepted proposals can be converted" };
  }

  if (proposal.status !== "converted") {
    const previousStatus = proposal.status;
    await Proposal.findByIdAndUpdate(proposal._id, {
      status: "converted",
      convertedAt: new Date(),
      convertedById: new mongoose.Types.ObjectId(auth.sessionUserId),
    });
    await createAuditEntry({
      tenantId: auth.membership.tenantId,
      actorUserId: auth.membership.userId,
      entityType: "proposal",
      entityId: proposal._id as mongoose.Types.ObjectId,
      action: "update",
      before: { status: previousStatus },
      after: { status: "converted" },
      metadata: {
        ...buildLifecycleTransitionMetadata("proposal", previousStatus, "converted", [
          "status",
          "convertedAt",
          "convertedById",
        ]),
      },
    });
  }

  return { redirectTo: `/pos?proposalId=${proposal._id.toString()}` };
}
