"use server";

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Membership, Branch, Product } from "@/models";
import { getStockMovements } from "@/lib/actions/reports";

interface Props {
  searchParams: Promise<{
    fromDate?: string;
    toDate?: string;
    branchId?: string;
    productId?: string;
    type?: string;
  }>;
}

export default async function StockMovementsPage({ searchParams }: Props) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) return <div>No active membership</div>;

  const branches = await Branch.find({ tenantId: membership.tenantId, active: true }).sort({ name: 1 });
  const products = await Product.find({ tenantId: membership.tenantId, deletedAt: null, active: true }).sort({ name: 1 }).limit(50);

  const data = await getStockMovements(membership.tenantId.toString(), {
    fromDate: params.fromDate ? new Date(params.fromDate) : new Date(Date.now() - 7 * 86400000),
    toDate: params.toDate ? new Date(params.toDate) : new Date(),
    branchId: params.branchId,
    productId: params.productId,
    type: params.type,
    limit: 200,
  });

  const typeLabels: Record<string, string> = {
    sale: "Sale",
    refund: "Refund",
    purchase: "Purchase",
    adjustment: "Adjustment",
    transfer_out: "Transfer Out",
    transfer_in: "Transfer In",
    void: "Void",
    waste: "Waste",
    expired: "Expired",
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Stock Movements</h1>
        <Link href="/reports" className="text-primary hover:underline">← Back to Reports</Link>
      </div>

      <form className="bg-card border rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">From Date</label>
          <input type="date" name="fromDate" defaultValue={params.fromDate || ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To Date</label>
          <input type="date" name="toDate" defaultValue={params.toDate || ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Branch</label>
          <select name="branchId" defaultValue={params.branchId || ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All Branches</option>
            {branches.map(b => <option key={b._id.toString()} value={b._id.toString()}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select name="type" defaultValue={params.type || ""} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">All Types</option>
            {Object.entries(typeLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-9 rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium">Filter</button>
        <a href={`/api/reports/export?type=movements&${new URLSearchParams({
          ...(params.fromDate ? { fromDate: params.fromDate } : {}),
          ...(params.toDate ? { toDate: params.toDate } : {}),
          ...(params.branchId ? { branchId: params.branchId } : {}),
          ...(params.type ? { moveType: params.type } : {}),
        })}`} className="h-9 rounded-md border border-input bg-background px-4 text-sm font-medium flex items-center hover:bg-accent">
          Export CSV
        </a>
      </form>

      {data.typeSummary.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {data.typeSummary.map(t => (
            <div key={t._id} className="bg-card border rounded-lg px-3 py-2 text-sm">
              <span className="text-muted-foreground">{typeLabels[t._id] || t._id}: </span>
              <span className="font-medium">{t.count}</span>
              <span className="text-muted-foreground ml-2">({t.totalQty} units)</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border rounded-lg overflow-hidden">
        {data.movements.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No movements found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Product</th>
                <th className="text-left p-3 font-medium">Branch</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-right p-3 font-medium">Qty</th>
                <th className="text-left p-3 font-medium">Reason</th>
                <th className="text-left p-3 font-medium">User</th>
              </tr>
            </thead>
            <tbody>
              {data.movements.map((m, i) => {
                const qty = parseFloat(m.quantityDelta.toString());
                return (
                  <tr key={i} className="border-t">
                    <td className="p-3 text-muted-foreground">{m.createdAt.toLocaleDateString()}</td>
                    <td className="p-3">
                      <span className="font-medium">{m.product?.name || "-"}</span>
                      {m.product?.sku && <span className="block text-xs text-muted-foreground">{m.product.sku}</span>}
                    </td>
                    <td className="p-3">{m.branch?.name || "-"}</td>
                    <td className="p-3">{typeLabels[m.type] || m.type}</td>
                    <td className={`p-3 text-right font-medium ${qty > 0 ? "text-green-600" : "text-red-600"}`}>
                      {qty > 0 ? "+" : ""}{qty}
                    </td>
                    <td className="p-3 text-muted-foreground">{m.reason || "-"}</td>
                    <td className="p-3 text-muted-foreground">{m.user?.name || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}