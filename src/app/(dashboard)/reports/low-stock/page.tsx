
import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Branch } from "@/models";
import { getLowStockReport } from "@/lib/actions/reports";

interface Props {
  searchParams: Promise<{ branchId?: string }>;
}

export default async function LowStockPage({ searchParams }: Props) {
  const { branchId } = await searchParams;

  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;

  const branches = await Branch.find({ tenantId: membership.tenantId, active: true }).sort({ name: 1 });
  const items = await getLowStockReport(membership.tenantId.toString(), branchId);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Low Stock Alerts</h1>
        <Link href="/reports" className="text-primary hover:underline">← Back to Reports</Link>
      </div>

      <form className="bg-card border rounded-lg p-4 mb-6 flex gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Branch</label>
          <select name="branchId" defaultValue={branchId || ""} className="h-11 rounded-md border border-gray-200 bg-white bg-background px-3 text-sm">
            <option value="">All Branches</option>
            {branches.map(b => <option key={b._id.toString()} value={b._id.toString()}>{b.name}</option>)}
          </select>
        </div>
        <button type="submit" className="h-9 rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium">Filter</button>
        <a href={`/api/reports/export?type=lowstock${branchId ? `&branchId=${branchId}` : ""}`}
          className="h-11 rounded-md border border-gray-200 bg-white bg-background px-4 text-sm font-medium flex items-center hover:bg-accent">
          Export CSV
        </a>
      </form>

      <div className="bg-card border rounded-lg overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">All stock levels are healthy</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Product</th>
                <th className="text-left p-3 font-medium">Branch</th>
                <th className="text-right p-3 font-medium">Current</th>
                <th className="text-right p-3 font-medium">Threshold</th>
                <th className="text-right p-3 font-medium">Deficit</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-t">
                  <td className="p-3">
                    <span className="font-medium">{item.productName}</span>
                    <span className="block text-xs text-muted-foreground">{item.productSku}</span>
                  </td>
                  <td className="p-3">{item.branchName}</td>
                  <td className={`p-3 text-right font-medium ${item.quantity === 0 ? "text-red-600" : "text-yellow-600"}`}>
                    {item.quantity}
                  </td>
                  <td className="p-3 text-right text-muted-foreground">{item.threshold}</td>
                  <td className="p-3 text-right text-red-500 font-medium">{item.deficit > 0 ? item.deficit : 0}</td>
                  <td className="p-3 text-right">
                    <Link href={`/inventory/stock/${item.productId}`} className="text-primary hover:underline text-sm">View</Link>
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
