import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/utils/membership";
import { loadProposals } from "@/lib/actions/proposals";
import { PageHeader } from "@/components/app/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import type { ProposalStatus } from "@/models/sales/Proposal";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProposalRow {
  id: string;
  number: string;
  customer: string;
  branch: string;
  issued: Date;
  validUntil: Date | null;
  total: number;
  status: string;
}

interface Props {
  searchParams: Promise<{ status?: ProposalStatus }>;
}

const statuses: ProposalStatus[] = ["draft", "sent", "accepted", "rejected", "converted"];

export default async function ProposalsPage({ searchParams }: Props) {
  const { status } = await searchParams;

  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }
  if (membership.role === "cashier") {
    redirect("/dashboard");
  }

  const proposals = await loadProposals(membership.tenantId.toString(), status);

  const rows: ProposalRow[] = proposals.map((p) => ({
    id: p._id.toString(),
    number: p.proposalNumber,
    customer: p.customer?.name || p.customerName || "Walk-in customer",
    branch: p.branch?.name || "-",
    issued: new Date(p.issuedAt),
    validUntil: p.validUntil ? new Date(p.validUntil) : null,
    total: parseFloat(p.grandTotal.toString()),
    status: p.status,
  }));

  const columns: DataTableColumn<ProposalRow>[] = [
    {
      key: "number",
      header: "Proposal #",
      render: (r) => <span className="font-bold text-gray-900">{r.number}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (r) => <span className="font-medium text-gray-700">{r.customer}</span>,
    },
    {
      key: "issued",
      header: "Issued",
      render: (r) => <span className="text-gray-500">{r.issued.toLocaleDateString("en-SA")}</span>,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (r) => <span className="font-black text-primary">SAR {r.total.toFixed(2)}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <Button variant="secondary" size="xs" className="font-bold uppercase text-[10px] tracking-widest px-4" asChild>
          <Link href={`/proposals/${r.id}`}>
            View
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Sales Proposals"
        section="Sales"
        breadcrumbs={[{ label: "Sales Proposals" }]}
        description="Create and track customer proposals before invoicing."
        actions={
          <Button asChild size="sm" className="font-bold uppercase tracking-wider text-[11px] px-6">
            <Link href="/proposals/new">
              <Plus className="size-3.5 mr-2" />
              New Proposal
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={!status ? "default" : "outline"}
          size="sm"
          className="h-8 font-bold uppercase tracking-widest text-[10px]"
          asChild
        >
          <Link href="/proposals">All</Link>
        </Button>
        {statuses.map((proposalStatus) => (
          <Button
            key={proposalStatus}
            variant={status === proposalStatus ? "default" : "outline"}
            size="sm"
            className="h-8 font-bold uppercase tracking-widest text-[10px]"
            asChild
          >
            <Link href={`/proposals?status=${proposalStatus}`}>{proposalStatus}</Link>
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={{
          title: "No proposals found",
          description: "Start by creating your first sales proposal for a customer.",
          action: (
            <Button asChild>
              <Link href="/proposals/new">Create Proposal</Link>
            </Button>
          ),
        }}
      />
    </div>
  );
}
