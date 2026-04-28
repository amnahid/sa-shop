import Link from "next/link";
import { redirect } from "next/navigation";
import { Branch, Customer, Proposal } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { createRetainer } from "@/lib/actions/retainers";

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

  const prefillProposal = proposalId
    ? await Proposal.findOne({ _id: proposalId, tenantId: membership.tenantId }).select(
        "_id proposalNumber customerId branchId grandTotal title"
      )
    : null;

  return (
    <div className="max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">New Retainer</h1>
        <Link href="/retainers" className="text-primary hover:underline">
          ← Back to Retainers
        </Link>
      </div>

      <form
        action={async (formData) => {
          "use server";
          const result = await createRetainer(formData);
          if (result.retainerId) {
            redirect(`/retainers/${result.retainerId}`);
          }
          console.error(result.error);
        }}
        className="space-y-6 rounded-lg border bg-card p-6"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Retainer Title</label>
            <input
              type="text"
              name="title"
              defaultValue={prefillProposal?.title || ""}
              placeholder="Support retainer - Q4"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Linked Proposal</label>
            <select
              name="proposalId"
              defaultValue={prefillProposal?._id.toString() || ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Not linked</option>
              {proposals.map((proposal) => (
                <option key={proposal._id.toString()} value={proposal._id.toString()}>
                  {proposal.proposalNumber} • {proposal.customerName || "Walk-in"} • SAR{" "}
                  {parseFloat(proposal.grandTotal.toString()).toFixed(2)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Customer *</label>
            <select
              name="customerId"
              defaultValue={prefillProposal?.customerId?.toString() || ""}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer._id.toString()} value={customer._id.toString()}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Branch *</label>
            <select
              name="branchId"
              defaultValue={prefillProposal?.branchId?.toString() || ""}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select branch</option>
              {branches.map((branch) => (
                <option key={branch._id.toString()} value={branch._id.toString()}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Retainer Total (SAR) *</label>
            <input
              type="number"
              name="totalAmount"
              min="0.01"
              step="0.01"
              required
              defaultValue={prefillProposal ? parseFloat(prefillProposal.grandTotal.toString()).toFixed(2) : ""}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Notes</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Billing scope, usage policy, or close conditions..."
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <Link
            href="/retainers"
            className="flex h-10 items-center rounded-md border border-input bg-background px-4 text-sm font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Create Retainer
          </button>
        </div>
      </form>
    </div>
  );
}
