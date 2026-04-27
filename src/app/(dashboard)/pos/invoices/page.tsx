
import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { loadInvoices } from "@/lib/actions/invoices";
import { Branch } from "@/models";

export default async function InvoicesPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  const tenantId = membership.tenantId;
  const branches = await Branch.find({ tenantId, active: true }).sort({ name: 1 });

  const invoices = await loadInvoices(tenantId.toString(), { tenantId });

  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    voided: "bg-gray-100 text-gray-800",
    refunded: "bg-blue-100 text-blue-800",
    draft: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Invoice History</h1>
        <Link href="/pos" className="text-primary hover:underline">
          ← Back to POS
        </Link>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>No invoices yet</p>
            <Link href="/pos" className="text-primary hover:underline mt-2 inline-block">
              Start a new sale
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Invoice #</th>
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Branch</th>
                <th className="text-left p-3 font-medium">Cashier</th>
                <th className="text-right p-3 font-medium">Items</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-center p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv._id.toString()} className="border-t">
                  <td className="p-3 font-medium">{inv.invoiceNumber}</td>
                  <td className="p-3 text-muted-foreground">
                    {inv.issuedAt.toLocaleDateString("en-SA", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="p-3">{inv.branch?.name || "-"}</td>
                  <td className="p-3 text-muted-foreground">{inv.cashier?.name || "-"}</td>
                  <td className="p-3 text-right">{inv.itemCount}</td>
                  <td className="p-3 text-right font-medium">
                    SAR {parseFloat(inv.grandTotal.toString()).toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded ${statusColors[inv.status] || ""}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <Link
                      href={`/pos/invoices/${inv._id}`}
                      className="text-primary hover:underline text-sm"
                    >
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
