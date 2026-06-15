import Link from "next/link";
import { DollarSign, Package, Users, AlertTriangle, BarChart3 } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/actions/invoices";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Branch } from "@/models";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { StatusBadge } from "@/components/app/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface RecentInvoice {
  _id: { toString(): string };
  invoiceNumber: string;
  branch: { name: string };
  issuedAt: Date;
  grandTotal: { toString(): string };
  status: string;
}

export default async function DashboardPage() {
  const session = await auth();
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  await Branch.find({ tenantId: membership.tenantId, active: true }).sort({ name: 1 });
  const metrics = await getDashboardMetrics(membership.tenantId.toString());
  const maxWeekly = Math.max(...metrics.weeklySales.map(w => w.total), 1);

  const columns: DataTableColumn<RecentInvoice>[] = [
    { key: "invoice", header: "Invoice", render: (r) => r.invoiceNumber },
    { key: "branch", header: "Branch", render: (r) => r.branch.name },
    {
      key: "date",
      header: "Date",
      render: (r) => r.issuedAt.toLocaleDateString(),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (r) =>
        `SAR ${parseFloat(r.grandTotal.toString()).toFixed(2)}`,
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        section="Overview"
        breadcrumbs={[{ label: "Dashboard" }]}
        description={`Welcome back${session?.user?.name ? `, ${session.user.name}` : ""}`}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          variant="success"
          label="Today's Sales"
          value={`SAR ${metrics.todaySales.toFixed(2)}`}
          subLabel={`${metrics.todayCount} transactions`}
          icon={DollarSign}
        />
        <StatCard
          variant="info"
          label="Products"
          value={metrics.productCount}
          icon={Package}
        />
        <StatCard
          variant="primary"
          label="Customers"
          value={metrics.customerCount}
          icon={Users}
        />
        <StatCard
          variant="danger"
          label="Low Stock Alerts"
          value={metrics.lowStockCount}
          icon={AlertTriangle}
          href={metrics.lowStockCount > 0 ? "/inventory/stock" : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mt-8">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 py-4 border-b border-gray-50">
            <BarChart3 className="size-4 text-primary" />
            <CardTitle className="text-sm font-bold uppercase tracking-tight">Weekly Sales Trend</CardTitle>
          </CardHeader>
          <CardContent className="pt-10 pb-6">
            <div className="flex items-end gap-3 h-48 px-2">
              {metrics.weeklySales.map((w, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-3 group relative">
                  <div className="absolute -top-8 start-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    SAR {w.total.toFixed(2)}
                  </div>
                  <div
                    className="w-full bg-soft-primary group-hover:bg-primary/30 transition-colors rounded-t-sm"
                    style={{ height: `${Math.max((w.total / maxWeekly) * 100, 2)}%` }}
                  />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{w.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4 border-b border-gray-50">
            <CardTitle className="text-sm font-bold uppercase tracking-tight">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col gap-3">
            <Button asChild className="w-full justify-start h-11 font-bold uppercase tracking-widest text-[11px]">
              <Link href="/pos">New Sale</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start h-11 font-bold uppercase tracking-widest text-[11px]">
              <Link href="/pos/invoices">View Invoices</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start h-11 font-bold uppercase tracking-widest text-[11px]">
              <Link href="/inventory/products/add">Add Product</Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start h-11 font-bold uppercase tracking-widest text-[11px]">
              <Link href="/accounting/entries">Record Expense</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {metrics.recentInvoices.length > 0 && (
        <div className="mt-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Sales</CardTitle>
              <Link
                href="/pos/invoices"
                className="text-sm text-primary hover:underline"
              >
                View all →
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={columns}
                rows={metrics.recentInvoices as unknown as RecentInvoice[]}
                rowKey={(r) => r._id.toString()}
                noCard
              />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
