"use server";

import mongoose from "mongoose";
import { Branch, Customer, Proposal, Retainer } from "@/models";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";
import { buildLifecycleTransitionMetadata, createAuditEntry } from "@/lib/audit-trail";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

async function getActiveMembership() {
  return getAuthorizedSessionMembership("sales.retainers:view");
}

async function getNextRetainerNumber(tenantId: mongoose.Types.ObjectId) {
  const count = await Retainer.countDocuments({ tenantId });
  return `RET-${(count + 1).toString().padStart(8, "0")}`;
}

export async function createRetainer(formData: FormData) {
  const auth = await getActiveMembership();
  if ("error" in auth) return { error: auth.error };

  const branchId = formData.get("branchId") as string;
  const customerId = formData.get("customerId") as string;
  const proposalId = (formData.get("proposalId") as string) || undefined;
  const totalAmount = Number(formData.get("totalAmount"));

  if (!branchId) return { error: "Branch is required" };
  if (!customerId) return { error: "Customer is required" };
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return { error: "Retainer total must be greater than zero" };
  }

  const branch = await Branch.findOne({
    _id: new mongoose.Types.ObjectId(branchId),
    tenantId: auth.membership.tenantId,
  });
  if (!branch) return { error: "Branch not found" };

  const customer = await Customer.findOne({
    _id: new mongoose.Types.ObjectId(customerId),
    tenantId: auth.membership.tenantId,
    deletedAt: null,
  });
  if (!customer) return { error: "Customer not found" };

  let linkedProposalId: mongoose.Types.ObjectId | undefined;
  if (proposalId) {
    const proposal = await Proposal.findOne({
      _id: new mongoose.Types.ObjectId(proposalId),
      tenantId: auth.membership.tenantId,
    });
    if (!proposal) return { error: "Proposal not found" };
    if (proposal.customerId && proposal.customerId.toString() !== customerId) {
      return { error: "Retainer customer must match proposal customer" };
    }
    if (proposal.branchId.toString() !== branchId) {
      return { error: "Retainer branch must match proposal branch" };
    }
    linkedProposalId = proposal._id as mongoose.Types.ObjectId;
  }

  const totalRounded = round2(totalAmount);
  const retainer = await Retainer.create({
    tenantId: auth.membership.tenantId,
    branchId: new mongoose.Types.ObjectId(branchId),
    createdById: new mongoose.Types.ObjectId(auth.sessionUserId),
    customerId: new mongoose.Types.ObjectId(customerId),
    proposalId: linkedProposalId,
    retainerNumber: await getNextRetainerNumber(auth.membership.tenantId),
    title: (formData.get("title") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
    currency: "SAR",
    totalAmount: mongoose.Types.Decimal128.fromString(totalRounded.toFixed(2)),
    consumedAmount: mongoose.Types.Decimal128.fromString("0.00"),
    status: "active",
  });

  await createAuditEntry({
    tenantId: auth.membership.tenantId,
    actorUserId: auth.membership.userId,
    entityType: "retainer",
    entityId: retainer._id as mongoose.Types.ObjectId,
    action: "create",
    after: {
      status: retainer.status,
      retainerNumber: retainer.retainerNumber,
      totalAmount: retainer.totalAmount,
    },
    metadata: {
      changedFields: ["status", "retainerNumber", "totalAmount"],
      summary: "retainer created",
    },
  });

  return { retainerId: retainer._id.toString() };
}

export async function loadRetainers(tenantId: string, status?: "active" | "closed") {
  const filter: Record<string, unknown> = {
    tenantId: new mongoose.Types.ObjectId(tenantId),
  };
  if (status) filter.status = status;

  const retainers = await Retainer.aggregate([
    { $match: filter },
    { $sort: { createdAt: -1 } },
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
    { $unwind: "$customer" },
    {
      $lookup: {
        from: "proposals",
        localField: "proposalId",
        foreignField: "_id",
        as: "proposal",
      },
    },
    { $unwind: { path: "$proposal", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        retainerNumber: 1,
        title: 1,
        status: 1,
        createdAt: 1,
        totalAmount: 1,
        consumedAmount: 1,
        "branch.name": 1,
        "customer.name": 1,
        "proposal.proposalNumber": 1,
      },
    },
  ]);

  return retainers;
}

export async function startRetainerInvoiceConsumption(retainerId: string) {
  const auth = await getActiveMembership();
  if ("error" in auth) return { error: auth.error };

  const retainer = await Retainer.findOne({
    _id: new mongoose.Types.ObjectId(retainerId),
    tenantId: auth.membership.tenantId,
  });
  if (!retainer) return { error: "Retainer not found" };
  if (retainer.status !== "active") return { error: "Retainer is closed" };

  return { redirectTo: `/pos?retainerId=${retainer._id.toString()}` };
}

export async function closeRetainer(retainerId: string) {
  const auth = await getActiveMembership();
  if ("error" in auth) return { error: auth.error };

  const retainer = await Retainer.findOne({
    _id: new mongoose.Types.ObjectId(retainerId),
    tenantId: auth.membership.tenantId,
  });
  if (!retainer) return { error: "Retainer not found" };
  if (retainer.status === "closed") return { error: "Retainer already closed" };

  const previousStatus = retainer.status;
  await Retainer.findByIdAndUpdate(retainer._id, {
    status: "closed",
    closedAt: new Date(),
    closedById: new mongoose.Types.ObjectId(auth.sessionUserId),
  });
  await createAuditEntry({
    tenantId: auth.membership.tenantId,
    actorUserId: auth.membership.userId,
    entityType: "retainer",
    entityId: retainer._id as mongoose.Types.ObjectId,
    action: "update",
    before: { status: previousStatus },
    after: { status: "closed" },
    metadata: {
      ...buildLifecycleTransitionMetadata("retainer", previousStatus, "closed", [
        "status",
        "closedAt",
        "closedById",
      ]),
    },
  });

  return { success: true };
}
