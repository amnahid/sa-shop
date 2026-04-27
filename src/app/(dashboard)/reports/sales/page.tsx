
import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Branch } from "@/models";
import { getSalesReport } from "@/lib/actions/reports";

interface Props {
  searchParams: Promise<{
    fromDate?: string;
    toDate?: string;
    branchId?: string;
  }>;
}

export default async function SalesReportPage({ searchParams }: Props) {
  const { fromDate, toDate, branchId } = await searchParams;

  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;

  const branches = await Branch.find({ tenantId: membership.tenantId, active: true }).sort({ name: 1 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const report = await getSalesReport(membership.tenantId.toString(), {
    fromDate: fromDate ? new Date(fromDate) : today,
    toDate: toDate ? new Date(toDate) : tomorrow,
    branchId,
  });

  const maxHourly = Math.max(...report.hourly.map(h => h.total), 1);
  const statusColors: Record<string, string> = {
    completed: "bg-green-100 text-green-800",
    voided: "bg-gray-100 text-gray-800",
    refunded: "bg-blue-100 text-blue-800",
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Sales Report</h1>
        <Link href="/reports" className="text-primary hover:underline">← Back to Reports</Link>
      </div>

      <form className="bg-card border rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">From Date</label>
          <input
            type="date"
            name="fromDate"
            defaultValue={fromDate || today.toISOString().split("T")[0]}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">To Date</label>
          <input
            type="date"
            name="toDate"
            defaultValue={toDate || new Date().toISOString().split("T")[0]}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Branch</label>
          <select
            name="branchId"
            defaultValue={branchId || ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b._id.toString()} value={b._id.toString()}>{b.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="h-9 rounded-md bg-primary text-primary-foreground px-4 text-sm font-medium">Filter</button>
        <a
          href={`/api/reports/export?type=sales&fromDate=${fromDate || today.toISOString().split("T")[0]}&toDate=${toDate || new Date().toISOString().split("T")[0]}${branchId ? `&branchId=${branchId}` : ""}`}
          className="h-9 rounded-md border border-input bg-background px-4 text-sm font-medium flex items-center hover:bg-accent"
        >
          Export CSV
        </a>
      </form>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Sales</p>
          <p className="text-2xl font-bold">SAR {report.summary.totalSales.toFixed(2)}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Transactions</p>
          <p className="text-2xl font-bold">{report.summary.transactionCount}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Items Sold</p>
          <p className="text-2xl font-bold">{report.summary.totalItems}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Avg Basket</p>
          <p className="text-2xl font-bold">
            SAR {(report.summary.transactionCount > 0 ? report.summary.totalSales / report.summary.transactionCount : 0).toFixed(2)}
          </p>
        </div>
      </div>

      {report.hourly.length > 0 && (
        <div className="bg-card border rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-4">Hourly Breakdown</h2>
          <div className="flex items-end gap-1 h-32">
            {report.hourly.map(h => (
              <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-primary/20 rounded-t"
                  style={{ height: `${Math.max((h.total / maxHourly) * 100, 4)}%` }}
                />
                <span className="text-xs text-muted-foreground rotate-0">{h.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.byBranch.length > 0 && (
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold">By Branch</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Branch</th>
                <th className="text-right p-3 font-medium">Total</th>
                <th className="text-right p-3 font-medium">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {report.byBranch.map(b => (
                <tr key={b.branchId} className="border-t">
                  <td className="p-3">{b.branchName}</td>
                  <td className="p-3 text-right font-medium">SAR {b.total.toFixed(2)}</td>
                  <td className="p-3 text-right">{b.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.summary.transactionCount === 0 && (
        <div className="text-center text-muted-foreground py-12">No sales data for this period</div>
      )}
    </div>
  );
}
