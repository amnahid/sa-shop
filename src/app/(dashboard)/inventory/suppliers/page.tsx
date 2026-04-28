import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Supplier } from "@/models";
import { createSupplier } from "@/lib/actions/suppliers";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { FormField } from "@/components/app/FormField";
import { Plus, Truck } from "lucide-react";
import { SuppliersBulkActions } from "@/components/app/SuppliersBulkActions";

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
  const membership = await getCurrentMembership();
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
      header: "Supplier Name",
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
      key: "contactName",
      header: "Contact Person",
      render: (r) => <span className="font-medium text-gray-600">{r.contactName}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      render: (r) => <span className="text-gray-500 font-medium">{r.phone}</span>,
    },
    {
      key: "email",
      header: "Email",
      render: (r) => <span className="text-gray-500 font-medium">{r.email}</span>,
    },
    {
      key: "paymentTerms",
      header: "Payment Terms",
      render: (r) => (
        <span className="text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 px-2 py-1 rounded border border-gray-100">
           {r.paymentTerms}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <Button variant="secondary" size="xs" className="font-bold uppercase text-[10px] tracking-widest px-4" asChild>
          <Link href={`/inventory/suppliers/${r.id}`}>
            View
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader 
        title="Inventory Suppliers" 
        section="Inventory"
        breadcrumbs={[{ label: "Suppliers" }]}
        description={`Manage ${suppliers.length} vendors and procurement partners.`}
        actions={
          <SuppliersBulkActions suppliers={suppliers.map(s => ({
            name: s.name,
            contactName: s.contactName,
            phone: s.phone,
            email: s.email,
            vatNumber: s.vatNumber,
            paymentTerms: s.paymentTerms
          }))} />
        }
      />

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center gap-2 py-3 border-b border-gray-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft-primary text-primary">
            <Plus className="size-4" />
          </div>
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Register New Supplier</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            action={async (formData) => {
              "use server";
              await createSupplier(formData);
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <FormField label="Supplier Name" htmlFor="name" required>
                <Input id="name" name="name" type="text" placeholder="Vendor Co." required />
              </FormField>
              <FormField label="Contact Person" htmlFor="contactName">
                <Input id="contactName" name="contactName" type="text" placeholder="Manager Name" />
              </FormField>
              <FormField label="Phone" htmlFor="phone">
                <Input id="phone" name="phone" type="tel" placeholder="+966..." />
              </FormField>
              <FormField label="Email Address" htmlFor="email">
                <Input id="email" name="email" type="email" placeholder="vendor@example.com" />
              </FormField>
            </div>
            <div className="flex flex-col md:flex-row items-end justify-between gap-6 pt-2 border-t border-gray-50">
              <div className="grid grid-cols-2 gap-6 flex-1 w-full max-w-2xl">
                <FormField label="VAT Registration" htmlFor="vatNumber">
                  <Input id="vatNumber" name="vatNumber" type="text" placeholder="VAT Number" />
                </FormField>
                <FormField label="Payment Terms" htmlFor="paymentTerms">
                  <Input id="paymentTerms" name="paymentTerms" type="text" placeholder="e.g. Net 30" />
                </FormField>
              </div>
              <Button type="submit" className="w-full md:w-auto font-bold uppercase tracking-wider text-[11px] px-12 h-11">
                Create Supplier
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={{ 
          title: "No suppliers yet",
          description: "Start by registering your first inventory procurement partner.",
        }}
      />
    </>
  );
}
