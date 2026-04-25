"use server";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Supplier, PurchaseOrder, Membership } from "@/models";
import { updateSupplier, deleteSupplier } from "@/lib/actions/suppliers";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SupplierDetailPage({ params }: Props) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) return <div>No active membership</div>;

  const supplier = await Supplier.findOne({ _id: id, tenantId: membership.tenantId, deletedAt: null });
  if (!supplier) return <div>Supplier not found</div>;

  const purchaseOrders = await PurchaseOrder.find({
    tenantId: membership.tenantId,
    supplierId: supplier._id,
  }).sort({ issuedAt: -1 }).limit(20);

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    partially_received: "bg-orange-100 text-orange-800",
    received: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{supplier.name}</h1>
          {supplier.nameAr && <p className="text-muted-foreground" dir="rtl">{supplier.nameAr}</p>}
        </div>
        <Link href="/inventory/suppliers" className="text-primary hover:underline">← Back</Link>
      </div>

      <div className="bg-card border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Supplier Details</h2>
          <form action={async () => {
            "use server";
            await deleteSupplier(id);
            redirect("/inventory/suppliers");
          }}>
            <button type="submit" className="text-sm text-red-500 hover:text-red-700">Delete</button>
          </form>
        </div>

        <form action={async (formData) => {
          "use server";
          await updateSupplier(id, formData);
          redirect(`/inventory/suppliers/${id}`);
        }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input name="name" defaultValue={supplier.name} required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Person</label>
              <input name="contactName" defaultValue={supplier.contactName || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input name="phone" defaultValue={supplier.phone || ""} type="tel" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input name="email" defaultValue={supplier.email || ""} type="email" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">VAT Number</label>
              <input name="vatNumber" defaultValue={supplier.vatNumber || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Terms</label>
              <input name="paymentTerms" defaultValue={supplier.paymentTerms || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium">Save</button>
        </form>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold">Purchase Orders</h2>
          <Link href={`/inventory/purchase-orders/add?supplierId=${id}`} className="text-sm text-primary hover:underline">
            + New PO
          </Link>
        </div>
        {purchaseOrders.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">No purchase orders</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">PO #</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="text-center p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.map(po => (
                <tr key={po._id.toString()} className="border-t">
                  <td className="p-3 font-medium">{po.poNumber}</td>
                  <td className="p-3 text-muted-foreground">{po.issuedAt.toLocaleDateString()}</td>
                  <td className="p-3 text-right">SAR {po.lines.reduce((s: number, l: { totalCost: unknown }) => s + (l.totalCost as number), 0).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded ${statusColors[po.status] || ""}`}>{po.status.replace("_", " ")}</span>
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