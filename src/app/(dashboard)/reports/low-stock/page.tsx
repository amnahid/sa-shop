
import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Branch } from "@/models";
import { getLowStockReport } from "@/lib/actions/reports";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Download, Filter, AlertCircle } from "lucide-react";
export default async function LowStockReportPage({
  searchParams,
}: {
  searchParams: { branchId?: string };
}) {
  const branchId = searchParams.branchId;
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const branches = await Branch.find({ tenantId: membership.tenantId }).sort({ name: 1 }).lean();
  const items = await getLowStockReport(membership.tenantId.toString(), branchId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Low Stock Alerts"
        section="Insights"
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Low Stock" },
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
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Filter Alerts</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-6 items-end">
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
                Refresh Alerts
              </Button>
              <Button variant="secondary" asChild className="h-11 font-bold uppercase tracking-wider text-[11px]">
                <a
                  href={`/api/reports/export?type=lowstock${branchId ? `&branchId=${branchId}` : ""}`}
                >
                  <Download className="size-3 me-2" />
                  CSV
                </a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="py-3 border-b border-gray-50">
          <CardTitle className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
            <AlertCircle className="size-4 text-danger" />
            Stock Deficit Report
          </CardTitle>
        </CardHeader>
        {items.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center gap-3">
             <div className="p-4 rounded-full bg-soft-success text-success">
                <Package className="size-8" />
             </div>
             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">All stock levels are healthy</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="text-start px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Product</th>
                  <th className="text-start px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Branch</th>
                  <th className="text-end px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Current Qty</th>
                  <th className="text-end px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Threshold</th>
                  <th className="text-end px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Deficit</th>
                  <th className="text-end px-6 py-4 text-[11px] font-bold uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{item.productName}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{item.productSku}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-600">{item.branchName}</td>
                    <td className={`px-6 py-4 text-end font-black tabular-nums ${item.quantity === 0 ? "text-danger" : "text-warning"}`}>
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-end text-gray-500 font-medium tabular-nums">{item.threshold}</td>
                    <td className="px-6 py-4 text-end text-danger font-black tabular-nums bg-soft-danger/20">
                      {item.deficit > 0 ? item.deficit : 0}
                    </td>
                    <td className="px-6 py-4 text-end">
                      <Button variant="outline" size="xs" className="font-bold uppercase tracking-widest text-[9px]" asChild>
                        <Link href={`/inventory/products/${item.productId}`}>View Details</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
