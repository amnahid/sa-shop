"use server";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Customer, Membership } from "@/models";
import { createCustomer } from "@/lib/actions/customers";

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return <div>No active membership</div>;
  }

  const customers = await Customer.find({
    tenantId: membership.tenantId,
    deletedAt: null,
  }).sort({ name: 1 });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Customers</h1>
        <span className="text-sm text-muted-foreground">{customers.length} customers</span>
      </div>

      <form action={async (formData) => {
        "use server";
        const result = await createCustomer(formData);
        if (result.error) return;
      }} className="mb-6 p-4 bg-card border rounded-lg">
        <h2 className="text-sm font-medium mb-3">Add New Customer</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input name="name" type="text" placeholder="Name *" required className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="phone" type="tel" placeholder="Phone" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="email" type="email" placeholder="Email" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="vatNumber" type="text" placeholder="VAT Number" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <input name="city" type="text" placeholder="City" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium">Add Customer</button>
        </div>
      </form>

      <div className="bg-card border rounded-lg overflow-hidden">
        {customers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>No customers yet</p>
            <p className="text-sm mt-1">Add a customer above or they&apos;ll be created at POS checkout</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Phone</th>
                <th className="text-left p-3 font-medium">Email</th>
                <th className="text-right p-3 font-medium">Total Spent</th>
                <th className="text-right p-3 font-medium">Visits</th>
                <th className="text-right p-3 font-medium">Last Visit</th>
                <th className="text-center p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c._id.toString()} className="border-t">
                  <td className="p-3 font-medium">
                    {c.name}
                    {c.nameAr && <span className="block text-xs text-muted-foreground" dir="rtl">{c.nameAr}</span>}
                  </td>
                  <td className="p-3 text-muted-foreground">{c.phone || "-"}</td>
                  <td className="p-3 text-muted-foreground">{c.email || "-"}</td>
                  <td className="p-3 text-right font-medium">
                    SAR {parseFloat(c.totalSpent.toString()).toFixed(2)}
                  </td>
                  <td className="p-3 text-right text-muted-foreground">{c.visitCount}</td>
                  <td className="p-3 text-right text-muted-foreground">
                    {c.lastVisitAt ? c.lastVisitAt.toLocaleDateString() : "-"}
                  </td>
                  <td className="p-3 text-center">
                    <Link href={`/customers/${c._id}`} className="text-primary hover:underline">
                      View
                    </Link>
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