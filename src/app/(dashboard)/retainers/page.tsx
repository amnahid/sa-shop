import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/utils/membership";
import { loadRetainers } from "@/lib/actions/retainers";
import { PageHeader } from "@/components/app/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface RetainerRow {
  id: string;
  number: string;
  customer: string;
  branch: string;
  total: number;
  consumed: number;
  remaining: number;
  status: string;
}

interface Props {
  searchParams: Promise<{ status?: "active" | "closed" }>;
}

export default async function RetainersPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const membership = await getCurrentMembership();

  if (!membership) return <div>No active membership</div>;
  if (membership.role === "cashier") redirect("/dashboard");

  const retainers = await loadRetainers(
    membership.tenantId.toString(),
    status === "active" || status === "closed" ? status : undefined
  );

  const rows: RetainerRow[] = retainers.map((r) => {
    const total = parseFloat(r.totalAmount.toString());
    const consumed = parseFloat(r.consumedAmount.toString());
    return {
      id: r._id.toString(),
      number: r.retainerNumber,
      customer: r.customer?.name || "-",
      branch: r.branch?.name || "-",
      total,
      consumed,
      remaining: Math.max(0, total - consumed),
      status: r.status,
    };
  });

  const columns: DataTableColumn<RetainerRow>[] = [
    {
      key: "number",
      header: "Retainer #",
      render: (r) => <span className="font-bold text-gray-900">{r.number}</span>,
    },
    {
      key: "customer",
      header: "Customer",
      render: (r) => <span className="font-medium text-gray-700">{r.customer}</span>,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (r) => <span className="font-bold text-gray-600">SAR {r.total.toFixed(2)}</span>,
    },
    {
      key: "remaining",
      header: "Remaining",
      align: "right",
      render: (r) => <span className="font-black text-primary">SAR {r.remaining.toFixed(2)}</span>,
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
          <Link href={`/retainers/${r.id}`}>
            View
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Retainers"
        section="Sales"
        breadcrumbs={[{ label: "Retainers" }]}
        description="Track prepaid customer balances and consume them during invoicing."
        actions={
          <Button asChild size="sm" className="font-bold uppercase tracking-wider text-[11px] px-6">
            <Link href="/retainers/new">
              <Plus className="size-3.5 mr-2" />
              New Retainer
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex gap-2">
        <Button
          variant={!status ? "default" : "outline"}
          size="sm"
          className="h-8 font-bold uppercase tracking-widest text-[10px]"
          asChild
        >
          <Link href="/retainers">All</Link>
        </Button>
        <Button
          variant={status === "active" ? "default" : "outline"}
          size="sm"
          className="h-8 font-bold uppercase tracking-widest text-[10px]"
          asChild
        >
          <Link href="/retainers?status=active">Active</Link>
        </Button>
        <Button
          variant={status === "closed" ? "default" : "outline"}
          size="sm"
          className="h-8 font-bold uppercase tracking-widest text-[10px]"
          asChild
        >
          <Link href="/retainers?status=closed">Closed</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={{
          title: "No retainers found",
          description: "Start by tracking a customer's prepaid balance.",
          action: (
            <Button asChild>
              <Link href="/retainers/new">Create Retainer</Link>
            </Button>
          ),
        }}
      />
    </div>
  );
}
