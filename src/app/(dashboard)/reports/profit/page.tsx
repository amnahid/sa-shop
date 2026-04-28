
import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Branch } from "@/models";
import { getProfitReport } from "@/lib/actions/reports";

interface Props {
  searchParams: Promise<{
    fromDate?: string;
    toDate?: string;
    branchId?: string;
  }>;
}

export default async function ProfitPage({ searchParams }: Props) {
  const { fromDate, toDate, branchId } = await searchParams;

  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;

  const branches = await Branch.find({ tenantId: membership.tenantId, active: true }).sort({ name: 1 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const report = await getProfitReport(membership.tenantId.toString(), {
    fromDate: fromDate ? new Date(fromDate) : today,
    toDate: toDate ? new Date(toDate) : tomorrow,
    branchId,
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Profit & Margin Report</h1>
        <Link href="/reports" className="text-primary hover:underline">← Back to Reports</Link>
      </div>

      <form className="bg-card border rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">From Date</label>
          <input type="date" name="fromDate" defaultValue={fromDate || today.toISOString().split("T")[0]} className="h-11 rounded-md border border-gray-200 bg-white bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To Date</label>
          <input type="date" name="toDate" defaultValue={toDate || new Date().toISOString().split("T")[0]} className="h-11 rounded-md border border-gray-200 bg-white bg-background px-3 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Branch</label>
          <select name="branchId" defaultValue={branchId || ""} className="h-11 rounded-md border border-gray-200 bg-white bg-background px-3 text-sm">
            <option value="">All Branches</option>
            {branches.map(b => <option key={b._id.toString()} value={b._id.toString()}>{b.name}</option>)}
          </select>
        </div>
        <button type="submit" className="h-9 rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium">Filter</button>
      </form>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="text-2xl font-bold">SAR {report.totals.revenue.toFixed(2)}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">COGS</p>
          <p className="text-2xl font-bold">SAR {report.totals.cost.toFixed(2)}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Gross Profit</p>
          <p className={`text-2xl font-bold ${report.totals.profit >= 0 ? "text-green-600" : "text-red-500"}`}>
            SAR {report.totals.profit.toFixed(2)}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Margin</p>
          <p className={`text-2xl font-bold ${report.totals.margin >= 0 ? "text-green-600" : "text-red-500"}`}>
            {report.totals.margin.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">By Category</h2>
        </div>
        {report.byCategory.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">No data for this period</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-right p-3 font-medium">Items Sold</th>
                <th className="text-right p-3 font-medium">Revenue</th>
                <th className="text-right p-3 font-medium">COGS</th>
                <th className="text-right p-3 font-medium">Profit</th>
                <th className="text-right p-3 font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {report.byCategory.map(c => {
                const profit = c.totalRevenue - c.totalCost;
                const margin = c.totalRevenue > 0 ? (profit / c.totalRevenue) * 100 : 0;
                return (
                  <tr key={c._id?.toString() || "uncategorized"} className="border-t">
                    <td className="p-3 font-medium">{c.categoryName || "Uncategorized"}</td>
                    <td className="p-3 text-right">{c.itemsSold}</td>
                    <td className="p-3 text-right">SAR {c.totalRevenue.toFixed(2)}</td>
                    <td className="p-3 text-right text-muted-foreground">SAR {c.totalCost.toFixed(2)}</td>
                    <td className={`p-3 text-right font-medium ${profit >= 0 ? "text-green-600" : "text-red-500"}`}>
                      SAR {profit.toFixed(2)}
                    </td>
                    <td className={`p-3 text-right font-medium ${margin >= 0 ? "text-green-600" : "text-red-500"}`}>
                      {margin.toFixed(1)}%
                    </td>
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
