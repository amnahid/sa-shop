import Link from "next/link";
import { redirect } from "next/navigation";
import { Branch, Customer, Proposal, Retainer } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { closeRetainer, startRetainerInvoiceConsumption } from "@/lib/actions/retainers";
import { loadEntityAuditTimeline } from "@/lib/actions/audit-trail";
import type { AuditTimelineEntry } from "@/lib/audit-trail";

interface Props {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

export default async function RetainerDetailPage({ params }: Props) {
  const { id } = await params;
  const membership = await getCurrentMembership();

  if (!membership) return <div>No active membership</div>;
  if (membership.role === "cashier") redirect("/dashboard");

  const retainer = await Retainer.findOne({
    _id: id,
    tenantId: membership.tenantId,
  });
  if (!retainer) return <div>Retainer not found</div>;

  const [branch, customer, proposal] = await Promise.all([
    Branch.findById(retainer.branchId).select("name"),
    Customer.findById(retainer.customerId).select("name vatNumber"),
    retainer.proposalId ? Proposal.findById(retainer.proposalId).select("proposalNumber") : Promise.resolve(null),
  ]);
  const auditResult = await loadEntityAuditTimeline("retainer", id, "sales.retainers:view");
  const auditTimeline: AuditTimelineEntry[] =
    "timeline" in auditResult && Array.isArray(auditResult.timeline) ? auditResult.timeline : [];

  const total = parseFloat(retainer.totalAmount.toString());
  const consumed = parseFloat(retainer.consumedAmount.toString());
  const remaining = Math.max(0, total - consumed);

  return (
    <div className="max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{retainer.retainerNumber}</h1>
          <p className="text-muted-foreground">
            Created {retainer.createdAt.toLocaleDateString("en-SA")} • {branch?.name || "-"}
          </p>
        </div>
        <Link href="/retainers" className="text-primary hover:underline">
          ← Back to Retainers
        </Link>
      </div>

      <div className="mb-6 rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Retainer Details</h2>
            {retainer.title && <p className="text-sm text-muted-foreground">{retainer.title}</p>}
          </div>
          <span className={`rounded px-3 py-1 text-sm ${statusColors[retainer.status] || ""}`}>
            {retainer.status}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Customer</dt>
            <dd className="font-medium">{customer?.name || "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Customer VAT</dt>
            <dd className="font-medium">{customer?.vatNumber || "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Linked Proposal</dt>
            <dd className="font-medium">
              {proposal ? (
                <Link className="text-primary hover:underline" href={`/proposals/${retainer.proposalId?.toString()}`}>
                  {proposal.proposalNumber}
                </Link>
              ) : (
                "-"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Currency</dt>
            <dd className="font-medium">{retainer.currency}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-medium">SAR {total.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Consumed</dt>
            <dd className="font-medium">SAR {consumed.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Remaining</dt>
            <dd className="font-medium">SAR {remaining.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Closed At</dt>
            <dd className="font-medium">
              {retainer.closedAt ? retainer.closedAt.toLocaleDateString("en-SA") : "-"}
            </dd>
          </div>
          {retainer.notes && (
            <div className="col-span-2 md:col-span-4">
              <dt className="text-muted-foreground">Notes</dt>
              <dd>{retainer.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {retainer.status === "active" && (
        <div className="mb-6 flex flex-wrap gap-2 rounded-lg border bg-card p-4">
          <ConsumeButton retainerId={id} disabled={remaining <= 0} />
          <CloseButton retainerId={id} />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Consumption History</h2>
        </div>
        {retainer.consumptions.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No invoices consumed from this retainer yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left font-medium">Invoice #</th>
                <th className="p-3 text-left font-medium">Consumed At</th>
                <th className="p-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {retainer.consumptions.map((consumption) => (
                <tr
                  key={`${consumption.invoiceId.toString()}-${consumption.consumedAt.toISOString()}`}
                  className="border-t"
                >
                  <td className="p-3">
                    <Link
                      href={`/pos/invoices/${consumption.invoiceId.toString()}`}
                      className="text-primary hover:underline"
                    >
                      {consumption.invoiceNumber}
                    </Link>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {consumption.consumedAt.toLocaleDateString("en-SA")}
                  </td>
                  <td className="p-3 text-right font-medium">
                    SAR {parseFloat(consumption.amount.toString()).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 rounded-lg border bg-card p-4">
        <h2 className="mb-3 font-semibold">Audit Trail</h2>
        {auditTimeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit entries yet.</p>
        ) : (
          <ul className="space-y-3">
            {auditTimeline.map((event) => (
              <li key={event.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{event.summary || event.action}</p>
                <p className="text-muted-foreground">
                  {event.timestamp.toLocaleString("en-SA")} • {event.actorName || event.actorUserId}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

async function ConsumeButton({ retainerId, disabled }: { retainerId: string; disabled: boolean }) {
  async function action() {
    "use server";
    const result = await startRetainerInvoiceConsumption(retainerId);
    if (result.error || !result.redirectTo) {
      console.error(result.error);
      redirect(`/retainers/${retainerId}`);
    }
    redirect(result.redirectTo);
  }

  return (
    <form action={action}>
      <button
        type="submit"
        disabled={disabled}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Consume in POS
      </button>
    </form>
  );
}

async function CloseButton({ retainerId }: { retainerId: string }) {
  async function action() {
    "use server";
    const result = await closeRetainer(retainerId);
    if (result.error) {
      console.error(result.error);
    }
    redirect(`/retainers/${retainerId}`);
  }

  return (
    <form action={action}>
      <button
        type="submit"
        className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium"
      >
        Close Retainer
      </button>
    </form>
  );
}
