import Link from "next/link";
import { redirect } from "next/navigation";
import { Branch, Proposal } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import {
  startProposalInvoiceConversion,
  transitionProposalStatus,
} from "@/lib/actions/proposals";
import { loadEntityAuditTimeline } from "@/lib/actions/audit-trail";
import type { AuditTimelineEntry } from "@/lib/audit-trail";
import type { ProposalStatus } from "@/models/sales/Proposal";

interface Props {
  params: Promise<{ id: string }>;
}

const statusColors: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  converted: "bg-purple-100 text-purple-800",
};

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params;
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }
  if (membership.role === "cashier") {
    redirect("/dashboard");
  }

  const proposal = await Proposal.findOne({
    _id: id,
    tenantId: membership.tenantId,
  });
  if (!proposal) {
    return <div>Proposal not found</div>;
  }

  const branch = await Branch.findById(proposal.branchId);
  const status = proposal.status as ProposalStatus;
  const auditResult = await loadEntityAuditTimeline("proposal", id, "sales.proposals:view");
  const auditTimeline: AuditTimelineEntry[] =
    "timeline" in auditResult && Array.isArray(auditResult.timeline) ? auditResult.timeline : [];

  return (
    <div className="max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{proposal.proposalNumber}</h1>
          <p className="text-muted-foreground">
            Issued {proposal.issuedAt.toLocaleDateString("en-SA")} • {branch?.name || "-"}
          </p>
        </div>
        <Link href="/proposals" className="text-primary hover:underline">
          ← Back to Proposals
        </Link>
      </div>

      <div className="mb-6 rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Proposal Details</h2>
            {proposal.title && <p className="text-sm text-muted-foreground">{proposal.title}</p>}
          </div>
          <span className={`rounded px-3 py-1 text-sm ${statusColors[status] || ""}`}>{status}</span>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Customer</dt>
            <dd className="font-medium">{proposal.customerName || "Walk-in customer"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Customer VAT</dt>
            <dd className="font-medium">{proposal.customerVatNumber || "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Valid Until</dt>
            <dd className="font-medium">
              {proposal.validUntil ? proposal.validUntil.toLocaleDateString("en-SA") : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Currency</dt>
            <dd className="font-medium">{proposal.currency}</dd>
          </div>
          {proposal.notes && (
            <div className="col-span-2 md:col-span-4">
              <dt className="text-muted-foreground">Notes</dt>
              <dd>{proposal.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mb-6 overflow-hidden rounded-lg border bg-card">
        <div className="border-b p-4">
          <h2 className="font-semibold">Line Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="p-3 text-left font-medium">Product</th>
              <th className="p-3 text-center font-medium">Qty</th>
              <th className="p-3 text-right font-medium">Unit Price</th>
              <th className="p-3 text-right font-medium">VAT</th>
              <th className="p-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {proposal.lines.map((line, index) => (
              <tr key={`${line.sku}-${index}`} className="border-t">
                <td className="p-3">
                  <span className="font-medium">{line.name}</span>
                  <span className="block text-xs text-muted-foreground">{line.sku}</span>
                </td>
                <td className="p-3 text-center">{line.quantity}</td>
                <td className="p-3 text-right">SAR {parseFloat(line.unitPrice.toString()).toFixed(2)}</td>
                <td className="p-3 text-right">SAR {parseFloat(line.lineVatAmount.toString()).toFixed(2)}</td>
                <td className="p-3 text-right font-medium">
                  SAR {parseFloat(line.lineTotal.toString()).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 bg-muted text-sm">
            <tr>
              <td colSpan={4} className="p-3 text-right font-medium">
                Subtotal
              </td>
              <td className="p-3 text-right">SAR {parseFloat(proposal.subtotal.toString()).toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="p-3 text-right font-medium">
                VAT
              </td>
              <td className="p-3 text-right">SAR {parseFloat(proposal.vatTotal.toString()).toFixed(2)}</td>
            </tr>
            <tr>
              <td colSpan={4} className="p-3 text-right text-base font-bold">
                Grand Total
              </td>
              <td className="p-3 text-right text-base font-bold">
                SAR {parseFloat(proposal.grandTotal.toString()).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mb-6 rounded-lg border bg-card p-4">
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

      <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-4">
          {status === "draft" && (
            <>
              <TransitionButton proposalId={id} toStatus="sent" label="Mark as Sent" />
              <TransitionButton
                proposalId={id}
                toStatus="rejected"
                label="Reject"
                variant="danger"
              />
            </>
          )}

          {status === "sent" && (
            <>
              <TransitionButton
                proposalId={id}
                toStatus="accepted"
                label="Accept"
                variant="success"
              />
              <TransitionButton
                proposalId={id}
                toStatus="rejected"
                label="Reject"
                variant="danger"
              />
              <TransitionButton proposalId={id} toStatus="draft" label="Move to Draft" />
            </>
          )}

          {status === "rejected" && (
            <TransitionButton proposalId={id} toStatus="draft" label="Re-open Draft" />
          )}

          {(status === "accepted" || status === "converted") && (
            <>
              <ConvertToInvoiceButton proposalId={id} />
              <Link
                href={`/retainers/new?proposalId=${id}`}
                className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium"
              >
                Create Retainer
              </Link>
            </>
          )}
      </div>
    </div>
  );
}

async function TransitionButton({
  proposalId,
  toStatus,
  label,
  variant = "default",
}: {
  proposalId: string;
  toStatus: ProposalStatus;
  label: string;
  variant?: "default" | "success" | "danger";
}) {
  async function action() {
    "use server";
    const result = await transitionProposalStatus(proposalId, toStatus);
    if (result.error) {
      console.error(result.error);
    }
    redirect(`/proposals/${proposalId}`);
  }

  const styleByVariant: Record<string, string> = {
    default: "border border-input bg-background text-foreground hover:bg-accent",
    success: "bg-green-600 text-white hover:bg-green-700",
    danger: "border border-red-300 text-red-600 hover:bg-red-50",
  };

  return (
    <form action={action}>
      <button
        type="submit"
        className={`rounded-md px-4 py-2 text-sm font-medium ${styleByVariant[variant]}`}
      >
        {label}
      </button>
    </form>
  );
}

async function ConvertToInvoiceButton({ proposalId }: { proposalId: string }) {
  async function action() {
    "use server";
    const result = await startProposalInvoiceConversion(proposalId);
    if (result.error || !result.redirectTo) {
      console.error(result.error);
      redirect(`/proposals/${proposalId}`);
    }
    redirect(result.redirectTo);
  }

  return (
    <form action={action}>
      <button
        type="submit"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Convert to Invoice
      </button>
    </form>
  );
}
