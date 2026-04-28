import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { loadPurchaseOrders } from "@/lib/actions/purchase-orders";
import { PageHeader } from "@/components/app/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface PORow {
  id: string;
  number: string;
  supplier: string;
  branch: string;
  date: Date;
  total: number;
  lines: number;
  status: string;
}

interface Props {
  searchParams: Promise<{ status?: string }>;
}

const statuses = ["draft", "submitted", "partially_received", "received", "cancelled"];

export default async function PurchaseOrdersPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;

  const pos = await loadPurchaseOrders(membership.tenantId.toString(), status);

  const rows: PORow[] = pos.map((po) => ({
    id: po._id.toString(),
    number: po.poNumber,
    supplier: po.supplier?.name || "-",
    branch: po.branch?.name || "-",
    date: new Date(po.issuedAt),
    total: parseFloat(po.totalValue.toString()),
    lines: po.lineCount,
    status: po.status,
  }));

  const columns: DataTableColumn<PORow>[] = [
    {
      key: "number",
      header: "PO #",
      render: (r) => <span className="font-bold text-gray-900">{r.number}</span>,
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (r) => <span className="font-medium text-gray-700">{r.supplier}</span>,
    },
    {
      key: "date",
      header: "Issued",
      render: (r) => <span className="text-gray-500">{r.date.toLocaleDateString("en-SA")}</span>,
    },
    {
      key: "total",
      header: "Value",
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
          <Link href={`/inventory/purchase-orders/${r.id}`}>
            View
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        section="Inventory"
        breadcrumbs={[{ label: "Purchase Orders" }]}
        description="Manage procurement from suppliers and track stock receipts."
        actions={
          <Button asChild size="sm" className="font-bold uppercase tracking-wider text-[11px] px-6">
            <Link href="/inventory/purchase-orders/add">
              <Plus className="size-3.5 mr-2" />
              New PO
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
          <Link href="/inventory/purchase-orders">All</Link>
        </Button>
        {statuses.map((s) => (
          <Button
            key={s}
            variant={status === s ? "default" : "outline"}
            size="sm"
            className="h-8 font-bold uppercase tracking-widest text-[10px]"
            asChild
          >
            <Link href={`/inventory/purchase-orders?status=${s}`}>{s.replace("_", " ")}</Link>
          </Button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={{
          title: "No purchase orders found",
          description: "Start procurement by creating your first purchase order.",
          action: (
            <Button asChild>
              <Link href="/inventory/purchase-orders/add">Create PO</Link>
            </Button>
          ),
        }}
      />
    </div>
  );
}
