"use server";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Supplier, Membership } from "@/models";
import { createSupplier } from "@/lib/actions/suppliers";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { FormField } from "@/components/app/FormField";

interface SupplierRow {
  id: string;
  name: string;
  nameAr?: string;
  contactName: string;
  phone: string;
  email: string;
  paymentTerms: string;
}

export default async function SuppliersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) return <div>No active membership</div>;

  const suppliers = await Supplier.find({
    tenantId: membership.tenantId,
    deletedAt: null,
  }).sort({ name: 1 });

  const rows: SupplierRow[] = suppliers.map((s) => ({
    id: s._id.toString(),
    name: s.name,
    nameAr: s.nameAr,
    contactName: s.contactName || "-",
    phone: s.phone || "-",
    email: s.email || "-",
    paymentTerms: s.paymentTerms || "-",
  }));

  const columns: DataTableColumn<SupplierRow>[] = [
    {
      key: "name",
      header: "Supplier",
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
      key: "contactName",
      header: "Contact",
      render: (r) => <span className="text-muted-foreground">{r.contactName}</span>,
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
      key: "paymentTerms",
      header: "Payment Terms",
      render: (r) => <span className="text-muted-foreground">{r.paymentTerms}</span>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <Link href={`/inventory/suppliers/${r.id}`} className="text-primary hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Suppliers" />

      <form
        action={async (formData) => {
          "use server";
          await createSupplier(formData);
        }}
        className="mb-6 p-4 bg-card border rounded-lg space-y-3"
      >
        <h2 className="text-sm font-medium">Add Supplier</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FormField label="Supplier name" htmlFor="name" required>
            <Input id="name" name="name" type="text" placeholder="Supplier name" required />
          </FormField>
          <FormField label="Contact person" htmlFor="contactName">
            <Input id="contactName" name="contactName" type="text" placeholder="Contact person" />
          </FormField>
          <FormField label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" placeholder="Phone" />
          </FormField>
          <FormField label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" placeholder="Email" />
          </FormField>
        </div>
        <div className="flex gap-3 items-end">
          <FormField label="VAT Number" htmlFor="vatNumber">
            <Input id="vatNumber" name="vatNumber" type="text" placeholder="VAT Number" />
          </FormField>
          <FormField label="Payment terms" htmlFor="paymentTerms">
            <Input id="paymentTerms" name="paymentTerms" type="text" placeholder="Payment terms" />
          </FormField>
          <Button type="submit">Add Supplier</Button>
        </div>
      </form>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={{ title: "No suppliers yet" }}
      />
    </>
  );
}
