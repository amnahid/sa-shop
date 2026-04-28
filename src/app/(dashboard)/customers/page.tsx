import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Customer } from "@/models";
import {
  archiveCustomer,
  bulkArchiveCustomers,
  bulkDeleteCustomers,
  bulkRestoreCustomers,
  createCustomer,
  permanentlyDeleteCustomer,
  restoreCustomer,
} from "@/lib/actions/customers";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { FormField } from "@/components/app/FormField";
import { Plus } from "lucide-react";
import { CustomersBulkActions } from "@/components/app/CustomersBulkActions";
import { FormFeedback } from "@/components/app/FormFeedback";

interface CustomerRow {
  id: string;
  name: string;
  nameAr?: string;
  phone: string;
  email: string;
  totalSpent: number;
  visitCount: number;
  lastVisitAt: Date | null;
  archived: boolean;
}

interface CustomersPageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }
  const { error, success } = await searchParams;

  const customers = await Customer.find({
    tenantId: membership.tenantId,
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
    archived: c.deletedAt !== null,
  }));

  const columns: DataTableColumn<CustomerRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (r) => (
        <div>
          <div className="font-bold text-gray-900">{r.name}</div>
          {r.nameAr && (
            <div className="text-xs text-muted-foreground font-medium" dir="rtl">
              {r.nameAr}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (r) => <span className="font-medium text-gray-600">{r.phone}</span>,
    },
    {
      key: "email",
      header: "Email",
      render: (r) => <span className="text-gray-500">{r.email}</span>,
    },
    {
      key: "totalSpent",
      header: "Total Spent",
      align: "right",
      render: (r) => <span className="font-black text-primary">SAR {r.totalSpent.toFixed(2)}</span>,
    },
    {
      key: "visitCount",
      header: "Visits",
      align: "right",
      render: (r) => <span className="font-bold text-gray-900">{r.visitCount}</span>,
    },
    {
      key: "lastVisitAt",
      header: "Last Visit",
      align: "right",
      render: (r) => (
        <span className="text-gray-500 font-medium">
          {r.lastVisitAt ? r.lastVisitAt.toLocaleDateString() : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <span className={r.archived ? "text-amber-700 font-semibold" : "text-emerald-700 font-semibold"}>
          {r.archived ? "Archived" : "Active"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" size="xs" className="font-bold uppercase text-[10px] tracking-widest px-4" asChild>
            <Link href={`/customers/${r.id}`}>Edit</Link>
          </Button>
          {r.archived ? (
            <>
              <Button
                type="submit"
                formAction={async () => {
                  "use server";
                  const result = await restoreCustomer(r.id);
                  if ("error" in result) {
                    redirect(`/customers?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                  }
                  redirect(`/customers?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
                }}
                variant="outline"
                size="xs"
                className="font-bold uppercase text-[10px] tracking-widest px-4"
              >
                Restore
              </Button>
              <Button
                type="submit"
                formAction={async () => {
                  "use server";
                  const result = await permanentlyDeleteCustomer(r.id);
                  if ("error" in result) {
                    redirect(`/customers?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                  }
                  redirect(`/customers?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
                }}
                variant="destructive"
                size="xs"
                className="font-bold uppercase text-[10px] tracking-widest px-4"
              >
                Delete
              </Button>
            </>
          ) : (
            <Button
              type="submit"
              formAction={async () => {
                "use server";
                const result = await archiveCustomer(r.id);
                if ("error" in result) {
                  redirect(`/customers?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                }
                redirect(`/customers?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
              }}
              variant="destructive"
              size="xs"
              className="font-bold uppercase text-[10px] tracking-widest px-4"
            >
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        section="Sales"
        breadcrumbs={[{ label: "Customers" }]}
        description={`${customers.length} registered customers in your database.`}
        actions={
          <CustomersBulkActions customers={customers.map(c => ({
            name: c.name,
            nameAr: c.nameAr,
            phone: c.phone,
            email: c.email,
            vatNumber: c.vatNumber,
            city: c.city
          }))} />
        }
      />
      <FormFeedback status="error" message={error} />
      <FormFeedback status="success" message={success} />

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center gap-2 py-3 border-b border-gray-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft-primary text-primary">
            <Plus className="size-4" />
          </div>
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Add New Customer</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            action={async (formData) => {
              "use server";
              const result = await createCustomer(formData);
              if ("error" in result) {
                redirect(`/customers?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
              }
              redirect(`/customers?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <FormField label="Full Name" htmlFor="name" required>
                <Input id="name" name="name" type="text" placeholder="e.g. John Doe" required />
              </FormField>
              <FormField label="Phone" htmlFor="phone">
                <Input id="phone" name="phone" type="tel" placeholder="+966..." />
              </FormField>
              <FormField label="Email Address" htmlFor="email">
                <Input id="email" name="email" type="email" placeholder="customer@example.com" />
              </FormField>
              <FormField label="VAT Number" htmlFor="vatNumber">
                <Input id="vatNumber" name="vatNumber" type="text" placeholder="VAT Registration" />
              </FormField>
            </div>
            <div className="flex flex-col md:flex-row items-end justify-between gap-6 pt-2">
              <div className="w-full md:max-w-xs">
                <FormField label="City" htmlFor="city">
                  <Input id="city" name="city" type="text" placeholder="Riyadh" />
                </FormField>
              </div>
              <Button type="submit" className="w-full md:w-auto font-bold uppercase tracking-wider text-[11px] px-12 h-11">
                Save Customer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        bulk={{
          getRowLabel: (r) => r.name,
          actions: [
            {
              key: "archive",
              label: "Archive selected",
              action: async (formData) => {
                "use server";
                const result = await bulkArchiveCustomers(formData);
                if (result.error) {
                  redirect(`/customers?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                }
                redirect(`/customers?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
              },
              variant: "destructive",
            },
            {
              key: "restore",
              label: "Restore selected",
              action: async (formData) => {
                "use server";
                const result = await bulkRestoreCustomers(formData);
                if (result.error) {
                  redirect(`/customers?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                }
                redirect(`/customers?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
              },
            },
            {
              key: "delete",
              label: "Delete selected",
              action: async (formData) => {
                "use server";
                const result = await bulkDeleteCustomers(formData);
                if (result.error) {
                  redirect(`/customers?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                }
                redirect(`/customers?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
              },
              variant: "destructive",
            },
          ],
        }}
        empty={{
          title: "No customers yet",
          description: "Add a customer above or they'll be created at POS checkout",
        }}
      />
    </>
  );
}
