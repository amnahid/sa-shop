"use server";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Supplier, Membership } from "@/models";
import { createSupplier } from "@/lib/actions/suppliers";

export default async function SuppliersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) return <div>No active membership</div>;

  const suppliers = await Supplier.find({
    tenantId: membership.tenantId,
    deletedAt: null,
  }).sort({ name: 1 });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
      </div>

      <form action={async (formData) => {
        "use server";
        await createSupplier(formData);
      }} className="mb-6 p-4 bg-card border rounded-lg space-y-3">
        <h2 className="text-sm font-medium">Add Supplier</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input name="name" type="text" placeholder="Supplier name *" required className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="contactName" type="text" placeholder="Contact person" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="phone" type="tel" placeholder="Phone" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="email" type="email" placeholder="Email" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-3">
          <input name="vatNumber" type="text" placeholder="VAT Number" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="paymentTerms" type="text" placeholder="Payment terms" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium">Add Supplier</button>
        </div>
      </form>

      <div className="bg-card border rounded-lg overflow-hidden">
        {suppliers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No suppliers yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Supplier</th>
                <th className="text-left p-3 font-medium">Contact</th>
                <th className="text-left p-3 font-medium">Phone</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-left p-3 font-medium">Payment Terms</th>
                <th className="text-center p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s._id.toString()} className="border-t">
                  <td className="p-3 font-medium">
                    {s.name}
                    {s.nameAr && <span className="block text-xs text-muted-foreground" dir="rtl">{s.nameAr}</span>}
                  </td>
                  <td className="p-3 text-muted-foreground">{s.contactName || "-"}</td>
                  <td className="p-3 text-muted-foreground">{s.phone || "-"}</td>
                  <td className="p-3 text-muted-foreground">{s.email || "-"}</td>
                  <td className="p-3 text-muted-foreground">{s.paymentTerms || "-"}</td>
                  <td className="p-3 text-center">
                    <Link href={`/inventory/suppliers/${s._id}`} className="text-primary hover:underline">View</Link>
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