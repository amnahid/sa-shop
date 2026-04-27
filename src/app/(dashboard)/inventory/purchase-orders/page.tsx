import mongoose from "mongoose";
import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { loadPurchaseOrders } from "@/lib/actions/purchase-orders";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function PurchaseOrdersPage({ searchParams }: Props) {
  const { status } = await searchParams;

  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;

  const pos = await loadPurchaseOrders(membership.tenantId.toString(), status);

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    partially_received: "bg-orange-100 text-orange-800",
    received: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const statuses = ["draft", "submitted", "partially_received", "received", "cancelled"];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
        <Link href="/inventory/purchase-orders/add" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 text-sm font-medium">
          + New PO
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        <Link
          href="/inventory/purchase-orders"
          className={`px-3 py-1.5 rounded-md text-sm font-medium ${!status ? "bg-primary text-primary-foreground" : "border border-input bg-background"}`}
        >
          All
        </Link>
        {statuses.map(s => (
          <Link
            key={s}
            href={`/inventory/purchase-orders?status=${s}`}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${status === s ? "bg-primary text-primary-foreground" : "border border-input bg-background"}`}
          >
            {s.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        {pos.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No purchase orders found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">PO #</th>
                <th className="text-left p-3 font-medium">Supplier</th>
                <th className="text-left p-3 font-medium">Branch</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="text-center p-3 font-medium">Lines</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-center p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pos.map(po => (
                <tr key={po._id.toString()} className="border-t">
                  <td className="p-3 font-medium">{po.poNumber}</td>
                  <td className="p-3">{po.supplier?.name || "-"}</td>
                  <td className="p-3 text-muted-foreground">{po.branch?.name || "-"}</td>
                  <td className="p-3 text-muted-foreground">{new Date(po.issuedAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right font-medium">SAR {po.totalValue.toFixed(2)}</td>
                  <td className="p-3 text-center">{po.lineCount}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded ${statusColors[po.status] || ""}`}>
                      {po.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <Link href={`/inventory/purchase-orders/${po._id.toString()}`} className="text-primary hover:underline">
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
