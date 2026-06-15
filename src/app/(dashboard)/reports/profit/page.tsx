
import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Branch } from "@/models";
import { getProfitReport } from "@/lib/actions/reports";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, Download, Filter } from "lucide-react";
export default async function ProfitReportPage({
  searchParams,
}: {
  searchParams: { fromDate?: string; toDate?: string; branchId?: string };
}) {
  const { fromDate, toDate, branchId } = searchParams;
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const today = new Date();
  today.setMonth(today.getMonth() - 1); // Default to last 30 days

  const branches = await Branch.find({ tenantId: membership.tenantId }).sort({ name: 1 }).lean();
  const report = await getProfitReport(membership.tenantId.toString(), {
    fromDate: fromDate ? new Date(fromDate) : today,
    toDate: toDate ? new Date(toDate) : new Date(),
    branchId,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profit & Margin"
        section="Insights"
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Profit" },
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
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ms-1">From Date</label>
              <Input
                type="date"
                name="fromDate"
                defaultValue={fromDate || today.toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ms-1">To Date</label>
              <Input
                type="date"
                name="toDate"
                defaultValue={toDate || new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-1.5 min-w-[200px]">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ms-1">Branch</label>
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
            <div className="flex gap-3 ms-auto">
              <Button type="submit" className="font-bold uppercase tracking-wider text-[11px] px-6 h-11">
                Filter Data
              </Button>
              <Button variant="secondary" asChild className="h-11 font-bold uppercase tracking-wider text-[11px]">
                <a
                  href={`/api/reports/export?type=profit&fromDate=${fromDate || today.toISOString().split("T")[0]}&toDate=${toDate || new Date().toISOString().split("T")[0]}${branchId ? `&branchId=${branchId}` : ""}`}
                >
                  <Download className="size-3 me-2" />
                  CSV
                </a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        {[
          { label: "Revenue", value: `SAR ${report.totals.revenue.toFixed(2)}`, color: "text-primary" },
          { label: "COGS", value: `SAR ${report.totals.cost.toFixed(2)}`, color: "text-gray-900" },
          { label: "Gross Profit", value: `SAR ${report.totals.profit.toFixed(2)}`, color: report.totals.profit >= 0 ? "text-success" : "text-danger" },
          { label: "Margin", value: `${report.totals.margin.toFixed(1)}%`, color: report.totals.margin >= 0 ? "text-success" : "text-danger" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="py-3 border-b border-gray-50">
          <CardTitle className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            Performance by Category
          </CardTitle>
        </CardHeader>
        {report.byCategory.length === 0 ? (
          <div className="p-20 text-center">
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No data for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="text-start px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Category</th>
                  <th className="text-end px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Items Sold</th>
                  <th className="text-end px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Revenue</th>
                  <th className="text-end px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">COGS</th>
                  <th className="text-end px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Profit</th>
                  <th className="text-end px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.byCategory.map(c => {
                  const profit = c.totalRevenue - c.totalCost;
                  const margin = c.totalRevenue > 0 ? (profit / c.totalRevenue) * 100 : 0;
                  return (
                    <tr key={c._id?.toString() || "uncategorized"} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-800">{c.categoryName || "Uncategorized"}</td>
                      <td className="px-6 py-4 text-end font-medium text-gray-600">{c.itemsSold}</td>
                      <td className="px-6 py-4 text-end font-bold text-gray-900">SAR {c.totalRevenue.toFixed(2)}</td>
                      <td className="px-6 py-4 text-end text-gray-500">SAR {c.totalCost.toFixed(2)}</td>
                      <td className={`px-6 py-4 text-end font-black ${profit >= 0 ? "text-success" : "text-danger"}`}>
                        SAR {profit.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 text-end font-black ${margin >= 0 ? "text-success" : "text-danger"}`}>
                        {margin.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
