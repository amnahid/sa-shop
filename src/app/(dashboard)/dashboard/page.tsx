"use server";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/actions/invoices";
import { Membership, Branch } from "@/models";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return <div>No active membership</div>;
  }

  const branches = await Branch.find({ tenantId: membership.tenantId, active: true }).sort({ name: 1 });
  const metrics = await getDashboardMetrics(membership.tenantId.toString());

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    voided: "bg-gray-100 text-gray-800",
    refunded: "bg-blue-100 text-blue-800",
    draft: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{ session?.user?.name ? `, ${session.user.name}` : "" }
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Today&apos;s Sales</p>
          <p className="text-2xl font-bold text-foreground">
            SAR {metrics.todaySales.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{metrics.todayCount} transactions</p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Products</p>
          <p className="text-2xl font-bold text-foreground">{metrics.productCount}</p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Customers</p>
          <p className="text-2xl font-bold text-foreground">{metrics.customerCount}</p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">Low Stock Alerts</p>
          <p className={`text-2xl font-bold ${metrics.lowStockCount > 0 ? "text-red-500" : "text-foreground"}`}>
            {metrics.lowStockCount}
          </p>
          {metrics.lowStockCount > 0 && (
            <Link href="/inventory/stock" className="text-xs text-primary hover:underline mt-1 block">
              View stock
            </Link>
          )}
        </div>
      </div>

      {metrics.recentInvoices.length > 0 && (
        <div className="mt-8">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Recent Sales</h2>
              <Link href="/pos/invoices" className="text-sm text-primary hover:underline">
                View all →
              </Link>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2 font-medium">Invoice</th>
                  <th className="text-left p-2 font-medium">Branch</th>
                  <th className="text-left p-2 font-medium">Date</th>
                  <th className="text-right p-2 font-medium">Total</th>
                  <th className="text-right p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentInvoices.map(inv => (
                  <tr key={inv._id.toString()} className="border-t">
                    <td className="p-2">{inv.invoiceNumber}</td>
                    <td className="p-2 text-muted-foreground">{inv.branch.name}</td>
                    <td className="p-2 text-muted-foreground">{inv.issuedAt.toLocaleDateString()}</td>
                    <td className="p-2 text-right font-medium">
                      SAR {parseFloat(inv.grandTotal.toString()).toFixed(2)}
                    </td>
                    <td className="p-2 text-right">
                      <span className={`text-xs px-2 py-1 rounded ${statusColors[inv.status] || ""}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="flex gap-4 flex-wrap">
            <Link
              href="/pos"
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-primary/90"
            >
              New Sale
            </Link>
            <Link
              href="/pos/invoices"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              View Invoices
            </Link>
            <Link
              href="/inventory/products/add"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              Add Product
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}