import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Branch } from "@/models";
import { getSalesReport } from "@/lib/actions/reports";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart3, Download, Filter } from "lucide-react";

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

  return (
    <div>
      <PageHeader
        title="Sales Report"
        section="Insights"
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Sales" },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/reports">Back to Reports</Link>
          </Button>
        }
      />

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center gap-2 py-3 border-b border-gray-50">
          <Filter className="size-4 text-primary" />
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Filter Report</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-6 items-end">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ml-1">From Date</label>
              <Input
                type="date"
                name="fromDate"
                defaultValue={fromDate || today.toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ml-1">To Date</label>
              <Input
                type="date"
                name="toDate"
                defaultValue={toDate || new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1.5 min-w-[200px]">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ml-1">Branch</label>
              <select
                name="branchId"
                defaultValue={branchId || ""}
                className="flex h-11 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus:border-primary"
              >
                <option value="">All Branches</option>
                {branches.map(b => (
                  <option key={b._id.toString()} value={b._id.toString()}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 ml-auto">
              <Button type="submit" className="font-bold uppercase tracking-wider text-[11px] px-6 h-11">
                Filter Data
              </Button>
              <Button variant="secondary" asChild className="h-11 font-bold uppercase tracking-wider text-[11px]">
                <a
                  href={`/api/reports/export?type=sales&fromDate=${fromDate || today.toISOString().split("T")[0]}&toDate=${toDate || new Date().toISOString().split("T")[0]}${branchId ? `&branchId=${branchId}` : ""}`}
                >
                  <Download className="size-3 mr-2" />
                  CSV
                </a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {[
          { label: "Total Sales", value: `SAR ${report.summary.totalSales.toFixed(2)}`, color: "text-primary" },
          { label: "Transactions", value: report.summary.transactionCount, color: "text-gray-900" },
          { label: "Items Sold", value: report.summary.totalItems, color: "text-gray-900" },
          { label: "Avg Basket", value: `SAR ${(report.summary.transactionCount > 0 ? report.summary.totalSales / report.summary.transactionCount : 0).toFixed(2)}`, color: "text-success" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {report.hourly.length > 0 && (
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center gap-2 py-3 border-b border-gray-50">
            <BarChart3 className="size-4 text-primary" />
            <CardTitle className="text-sm font-bold uppercase tracking-tight">Hourly Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="pt-10 pb-6">
            <div className="flex items-end gap-2 h-48 px-2">
              {report.hourly.map(h => (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-3 group relative">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    SAR {h.total.toFixed(2)}
                  </div>
                  <div
                    className="w-full bg-soft-primary group-hover:bg-primary/30 transition-colors rounded-t-sm"
                    style={{ height: `${Math.max((h.total / maxHourly) * 100, 2)}%` }}
                  />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{h.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {report.byBranch.length > 0 && (
        <Card>
          <CardHeader className="py-3 border-b border-gray-50">
            <CardTitle className="text-sm font-bold uppercase tracking-tight">Performance by Branch</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Branch Name</th>
                  <th className="text-right px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Sales</th>
                  <th className="text-right px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Transactions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.byBranch.map(b => (
                  <tr key={b.branchId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-800">{b.branchName}</td>
                    <td className="px-6 py-4 text-right font-black text-primary">SAR {b.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-medium text-gray-600">{b.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {report.summary.transactionCount === 0 && (
        <div className="bg-white border rounded-xl border-dashed border-gray-200 text-center py-20">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No sales data for this period</p>
        </div>
      )}
    </div>
  );
}
