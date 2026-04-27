

import { redirect } from "next/navigation";
import Link from "next/link";
import { getCustomerWithHistory, updateCustomer, deleteCustomer } from "@/lib/actions/customers";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getCurrentMembership } from "@/lib/utils/membership";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;

  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  const result = await getCustomerWithHistory(id, membership.tenantId.toString());
  if (!result) {
    return <div>Customer not found</div>;
  }

  const { customer, invoices } = result;

  return (
    <div className="p-6 max-w-3xl">
      <Breadcrumb items={[{ label: "Customers", href: "/customers" }, { label: customer.name }]} />
      <div className="flex items-center justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
          {customer.nameAr && <p className="text-muted-foreground" dir="rtl">{customer.nameAr}</p>}
        </div>
        <Link href="/customers" className="text-primary hover:underline">← Back to Customers</Link>
      </div>

      <div className="bg-card border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Customer Details</h2>
          <form action={async () => {
            "use server";
            await deleteCustomer(id);
            redirect("/customers");
          }}>
            <button type="submit" className="text-sm text-red-500 hover:text-red-700">Delete</button>
          </form>
        </div>

        <form action={async (formData) => {
          "use server";
          await updateCustomer(id, formData);
          redirect(`/customers/${id}`);
        }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input name="name" defaultValue={customer.name} required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Name (Arabic)</label>
              <input name="nameAr" defaultValue={customer.nameAr || ""} dir="rtl" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input name="phone" defaultValue={customer.phone || ""} type="tel" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input name="email" defaultValue={customer.email || ""} type="email" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">VAT Number</label>
              <input name="vatNumber" defaultValue={customer.vatNumber || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input name="city" defaultValue={customer.city || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input name="addressLines" defaultValue={customer.addressLines || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium">Save Changes</button>
        </form>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <dl className="grid grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-muted-foreground">Total Spent</p>
            <p className="text-xl font-bold">SAR {customer.totalSpent.toFixed(2)}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-muted-foreground">Visits</p>
            <p className="text-xl font-bold">{customer.visitCount}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-muted-foreground">Last Visit</p>
            <p className="text-xl font-bold">
              {customer.lastVisitAt ? customer.lastVisitAt.toLocaleDateString() : "Never"}
            </p>
          </div>
        </dl>
      </div>

      <div className="mt-6 bg-card border rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Purchase History</h2>
        </div>
        {invoices.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No purchases yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Invoice</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="text-center p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv._id} className="border-t">
                  <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                  <td className="p-3 text-muted-foreground">{inv.issuedAt.toLocaleDateString()}</td>
                  <td className="p-3 text-right font-medium">SAR {inv.grandTotal.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded ${
                      inv.status === "completed" ? "bg-green-100 text-green-800" :
                      inv.status === "refunded" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
                    }`}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
