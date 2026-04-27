
import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Customer } from "@/models";
import { createCustomer } from "@/lib/actions/customers";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";

interface CustomerRow {
  id: string;
  name: string;
  nameAr?: string;
  phone: string;
  email: string;
  totalSpent: number;
  visitCount: number;
  lastVisitAt: Date | null;
}

export default async function CustomersPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  const customers = await Customer.find({
    tenantId: membership.tenantId,
    deletedAt: null,
  }).sort({ name: 1 });

  const rows: CustomerRow[] = customers.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    nameAr: c.nameAr,
    phone: c.phone || "-",
    email: c.email || "-",
    totalSpent: parseFloat(c.totalSpent.toString()),
    visitCount: c.visitCount,
    lastVisitAt: c.lastVisitAt ?? null,
  }));

  const columns: DataTableColumn<CustomerRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          {r.nameAr && (
            <div className="text-xs text-muted-foreground" dir="rtl">
              {r.nameAr}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (r) => <span className="text-muted-foreground">{r.phone}</span>,
    },
    {
      key: "email",
      header: "Email",
      render: (r) => <span className="text-muted-foreground">{r.email}</span>,
    },
    {
      key: "totalSpent",
      header: "Total Spent",
      align: "right",
      render: (r) => <span className="font-medium">SAR {r.totalSpent.toFixed(2)}</span>,
    },
    {
      key: "visitCount",
      header: "Visits",
      align: "right",
      render: (r) => <span className="text-muted-foreground">{r.visitCount}</span>,
    },
    {
      key: "lastVisitAt",
      header: "Last Visit",
      align: "right",
      render: (r) => (
        <span className="text-muted-foreground">
          {r.lastVisitAt ? r.lastVisitAt.toLocaleDateString() : "-"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "center",
      render: (r) => (
        <Link href={`/customers/${r.id}`} className="text-primary hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${customers.length} customers`}
      />

      <form
        action={async (formData) => {
          "use server";
          const result = await createCustomer(formData);
          if (result.error) return;
        }}
        className="mb-6 p-4 bg-card border rounded-lg"
      >
        <h2 className="text-sm font-medium mb-3">Add New Customer</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input name="name" type="text" placeholder="Name *" required className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="phone" type="tel" placeholder="Phone" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="email" type="email" placeholder="Email" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="vatNumber" type="text" placeholder="VAT Number" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <input name="city" type="text" placeholder="City" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <Button type="submit">Add Customer</Button>
        </div>
      </form>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={{
          title: "No customers yet",
          description: "Add a customer above or they'll be created at POS checkout",
        }}
      />
    </>
  );
}
