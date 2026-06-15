import { redirect } from "next/navigation";
import { Branch, Customer, Proposal } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { PageHeader } from "@/components/app/PageHeader";
import { RetainerFormClient } from "./RetainerFormClient";

interface Props {
  searchParams: Promise<{ proposalId?: string }>;
}

export default async function NewRetainerPage({ searchParams }: Props) {
  const { proposalId } = await searchParams;
  const membership = await getCurrentMembership();

  if (!membership) return <div>No active membership</div>;
  if (membership.role === "cashier") redirect("/dashboard");

  const branches = await Branch.find({ tenantId: membership.tenantId, active: true }).sort({ name: 1 });
  const customers = await Customer.find({
    tenantId: membership.tenantId,
    deletedAt: null,
  }).sort({ name: 1 }).limit(100);

  const proposals = await Proposal.find({
    tenantId: membership.tenantId,
    status: { $in: ["accepted", "converted", "sent"] },
  })
    .sort({ issuedAt: -1 })
    .limit(100)
    .select("_id proposalNumber customerId customerName branchId grandTotal title");

  const prefillProposalRaw = proposalId
    ? await Proposal.findOne({ _id: proposalId, tenantId: membership.tenantId }).select(
        "_id proposalNumber customerId branchId grandTotal title"
      )
    : null;

  const prefillProposal = prefillProposalRaw ? {
    _id: prefillProposalRaw._id.toString(),
    title: prefillProposalRaw.title || "",
    customerId: prefillProposalRaw.customerId?.toString() || "",
    branchId: prefillProposalRaw.branchId?.toString() || "",
    grandTotal: parseFloat(prefillProposalRaw.grandTotal.toString())
  } : null;

  const customerOptions = customers.map(c => ({ value: c._id.toString(), label: c.name }));
  const branchOptions = branches.map(b => ({ value: b._id.toString(), label: b.name }));
  const proposalOptions = proposals.map(p => ({
    value: p._id.toString(),
    label: `${p.proposalNumber} • ${p.customerName || "Walk-in"} • SAR ${parseFloat(p.grandTotal.toString()).toFixed(2)}`
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Retainer"
        section="Sales"
        breadcrumbs={[{ label: "Retainers", href: "/retainers" }, { label: "New Retainer" }]}
        description="Establish a prepaid balance for a customer with linked proposals."
      />

      <RetainerFormClient 
        prefillProposal={prefillProposal}
        customers={customerOptions}
        branches={branchOptions}
        proposals={proposalOptions}
      />
    </div>
  );
}
