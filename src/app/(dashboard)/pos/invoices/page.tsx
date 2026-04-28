import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { loadInvoices } from "@/lib/actions/invoices";
import { PageHeader } from "@/components/app/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";

interface InvoiceRow {
  id: string;
  number: string;
  date: Date;
  branch: string;
  cashier: string;
  items: number;
  total: number;
  status: string;
}

export default async function InvoicesPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  const tenantId = membership.tenantId;
  const invoices = await loadInvoices(tenantId.toString(), { tenantId });

  const rows: InvoiceRow[] = invoices.map(inv => ({
    id: inv._id.toString(),
    number: inv.invoiceNumber,
    date: inv.issuedAt,
    branch: inv.branch?.name || "-",
    cashier: inv.cashier?.name || "-",
    items: inv.itemCount,
    total: parseFloat(inv.grandTotal.toString()),
    status: inv.status,
  }));

  const columns: DataTableColumn<InvoiceRow>[] = [
    {
      key: "number",
      header: "Invoice #",
      render: (r) => <span className="font-bold text-gray-900">{r.number}</span>,
    },
    {
      key: "date",
      header: "Date",
      render: (r) => (
        <span className="text-gray-500 font-medium">
          {r.date.toLocaleDateString("en-SA", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "branch",
      header: "Branch",
      render: (r) => <span className="font-medium text-gray-700">{r.branch}</span>,
    },
    {
      key: "cashier",
      header: "Cashier",
      render: (r) => <span className="text-gray-500">{r.cashier}</span>,
    },
    {
      key: "items",
      header: "Items",
      align: "right",
      render: (r) => <span className="font-bold text-gray-600">{r.items}</span>,
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
          <Link href={`/pos/invoices/${r.id}`}>
            View
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Invoice History"
        section="Sales"
        breadcrumbs={[
          { label: "Point of Sale", href: "/pos" },
          { label: "Invoices" },
        ]}
        actions={
          <Button variant="outline" size="sm" className="font-bold uppercase tracking-wider text-[11px]" asChild>
            <Link href="/pos">Back to POS</Link>
          </Button>
        }
        description={`Displaying ${invoices.length} recent sales transactions.`}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={{
          title: "No invoices yet",
          description: "Start your first sale at the POS to generate invoices.",
          action: (
            <Button asChild>
              <Link href="/pos">Go to POS</Link>
            </Button>
          ),
        }}
      />
    </div>
  );
}
