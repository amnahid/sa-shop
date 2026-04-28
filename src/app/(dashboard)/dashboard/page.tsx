import Link from "next/link";
import { DollarSign, Package, Users, AlertTriangle } from "lucide-react";
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

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/pos">New Sale</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pos/invoices">View Invoices</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/inventory/products/add">Add Product</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
