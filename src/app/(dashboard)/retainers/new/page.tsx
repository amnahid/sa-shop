import Link from "next/link";
import { redirect } from "next/navigation";
import { Branch, Customer, Proposal } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { createRetainer } from "@/lib/actions/retainers";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/app/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
    <div className="space-y-6">
      <PageHeader
        title="New Retainer"
        section="Sales"
        breadcrumbs={[{ label: "Retainers", href: "/retainers" }, { label: "New Retainer" }]}
        description="Establish a prepaid balance for a customer with linked proposals."
      />

      <form
        action={async (formData) => {
          "use server";
          const result = await createRetainer(formData);
          if (result.retainerId) {
            redirect(`/retainers/${result.retainerId}`);
          }
        }}
        className="space-y-8 max-w-4xl"
      >
        <Card>
          <CardHeader className="py-4 border-b border-gray-100">
             <CardTitle className="text-sm font-bold uppercase tracking-tight">Retainer Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-8 space-y-6">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <FormField label="Retainer Title" htmlFor="title">
                <Input
                  type="text"
                  name="title"
                  id="title"
                  defaultValue={prefillProposal?.title || ""}
                  placeholder="Support retainer - Q4"
                />
              </FormField>
              <FormField label="Linked Proposal" htmlFor="proposalId">
                <select
                  name="proposalId"
                  id="proposalId"
                  defaultValue={prefillProposal?._id.toString() || ""}
                  className="flex h-11 w-full rounded-md border border-gray-400 bg-white px-3 text-sm focus:border-primary outline-none"
                >
                  <option value="">Not linked</option>
                  {proposals.map((proposal) => (
                    <option key={proposal._id.toString()} value={proposal._id.toString()}>
                      {proposal.proposalNumber} • {proposal.customerName || "Walk-in"} • SAR{" "}
                      {parseFloat(proposal.grandTotal.toString()).toFixed(2)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <FormField label="Customer *" htmlFor="customerId" required>
                <select
                  name="customerId"
                  id="customerId"
                  defaultValue={prefillProposal?.customerId?.toString() || ""}
                  required
                  className="flex h-11 w-full rounded-md border border-gray-400 bg-white px-3 text-sm focus:border-primary outline-none"
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer._id.toString()} value={customer._id.toString()}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Branch *" htmlFor="branchId" required>
                <select
                  name="branchId"
                  id="branchId"
                  defaultValue={prefillProposal?.branchId?.toString() || ""}
                  required
                  className="flex h-11 w-full rounded-md border border-gray-400 bg-white px-3 text-sm focus:border-primary outline-none"
                >
                  <option value="">Select branch</option>
                  {branches.map((branch) => (
                    <option key={branch._id.toString()} value={branch._id.toString()}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Retainer Total (SAR) *" htmlFor="totalAmount" required>
                <Input
                  type="number"
                  name="totalAmount"
                  id="totalAmount"
                  min="0.01"
                  step="0.01"
                  required
                  defaultValue={prefillProposal ? parseFloat(prefillProposal.grandTotal.toString()).toFixed(2) : ""}
                />
              </FormField>
            </div>

            <FormField label="Notes" htmlFor="notes">
              <Textarea
                name="notes"
                id="notes"
                placeholder="Billing scope, usage policy, or close conditions..."
              />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-4">
          <Button asChild variant="outline" className="font-black uppercase tracking-widest text-[11px] px-8 h-11">
             <Link href="/retainers">Cancel</Link>
          </Button>
          <Button type="submit" className="font-black uppercase tracking-widest text-[11px] px-12 h-11 shadow-lg">
            Create Retainer
          </Button>
        </div>
      </form>
    </div>
  );
}
