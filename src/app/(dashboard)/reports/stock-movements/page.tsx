
import { Branch } from "@/models";
import { getStockMovements } from "@/lib/actions/reports";
import { getCurrentMembership } from "@/lib/utils/membership";
import { PageHeader } from "@/components/app/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Download } from "lucide-react";

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

  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;

  const branches = await Branch.find({ tenantId: membership.tenantId, active: true }).sort({ name: 1 });
  
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  const data = await getStockMovements(membership.tenantId.toString(), {
    fromDate: params.fromDate ? new Date(params.fromDate) : sevenDaysAgo,
    toDate: params.toDate ? new Date(params.toDate) : now,
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
    <div className="space-y-6">
      <PageHeader
        title="Stock Movements"
        section="Reports"
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Movements" }]}
        description="Comprehensive audit trail of all inventory changes across all branches."
      />

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center gap-2 py-3 border-b border-gray-50">
          <Filter className="size-4 text-primary" />
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Filter Movements</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-6 items-end">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ms-1">From Date</label>
              <Input type="date" name="fromDate" defaultValue={params.fromDate || ""} className="h-11 w-44" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ms-1">To Date</label>
              <Input type="date" name="toDate" defaultValue={params.toDate || ""} className="h-11 w-44" />
            </div>
            <div className="space-y-1.5 min-w-[200px]">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ms-1">Branch</label>
              <Select name="branchId" defaultValue={params.branchId || "all"}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b._id.toString()} value={b._id.toString()}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[200px]">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 ms-1">Type</label>
              <Select name="type" defaultValue={params.type || "all"}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 ms-auto">
              <Button type="submit" className="font-bold uppercase tracking-wider text-[11px] px-6 h-11">
                Filter Data
              </Button>
              <Button variant="secondary" asChild className="h-11 font-bold uppercase tracking-wider text-[11px]">
                <a href={`/api/reports/export?type=movements&${new URLSearchParams({
                  ...(params.fromDate ? { fromDate: params.fromDate } : {}),
                  ...(params.toDate ? { toDate: params.toDate } : {}),
                  ...(params.branchId ? { branchId: params.branchId } : {}),
                  ...(params.type ? { moveType: params.type } : {}),
                })}`}>
                  <Download className="size-3 me-2" />
                  CSV
                </a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {data.typeSummary.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {data.typeSummary.map(t => (
            <div key={t._id} className="bg-white border rounded-lg px-4 py-3 shadow-sm flex flex-col gap-0.5 min-w-[140px]">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{typeLabels[t._id] || t._id}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-gray-900">{t.count}</span>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">({t.totalQty} units)</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border rounded-lg overflow-hidden shadow-sm">
        {data.movements.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center gap-3">
             <div className="p-4 rounded-full bg-gray-50">
                <Filter className="size-8 text-gray-300" />
             </div>
             <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No movements found for the selected filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-start px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Date</th>
                  <th className="text-start px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Product</th>
                  <th className="text-start px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Branch</th>
                  <th className="text-start px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Type</th>
                  <th className="text-end px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Qty</th>
                  <th className="text-start px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">Reason</th>
                  <th className="text-start px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.movements.map((m, i) => {
                  const qty = parseFloat(m.quantityDelta.toString());
                  return (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 text-gray-500 font-medium tabular-nums">{m.createdAt.toLocaleDateString()}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-gray-900">{m.product?.name || "-"}</div>
                        {m.product?.sku && <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-tight">{m.product.sku}</span>}
                      </td>
                      <td className="px-4 py-4 font-semibold text-gray-600">{m.branch?.name || "-"}</td>
                      <td className="px-4 py-4 font-bold text-gray-600 uppercase text-[11px] tracking-tight">{typeLabels[m.type] || m.type}</td>
                      <td className={`px-4 py-4 text-end font-black tabular-nums ${qty > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {qty > 0 ? "+" : ""}{qty}
                      </td>
                      <td className="px-4 py-4 text-gray-500 font-medium">{m.reason || "-"}</td>
                      <td className="px-4 py-4 text-gray-900 font-bold">{m.user?.name || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
