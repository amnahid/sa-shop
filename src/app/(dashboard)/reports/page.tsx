

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { FileText, Package, ArrowRightLeft, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <>
      <PageHeader
        title="Reports"
        section="Insights"
        breadcrumbs={[{ label: "Reports" }]}
        description="Explore sales, stock, and profitability analytics."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ReportCard
          href="/reports/sales"
          icon={FileText}
          title="Sales Report"
          description="Daily sales summary, hourly breakdown, revenue by branch, VAT collected"
        />
        <ReportCard
          href="/reports/stock-movements"
          icon={ArrowRightLeft}
          title="Stock Movements"
          description="All stock changes: sales, purchases, adjustments, transfers, waste"
        />
        <ReportCard
          href="/reports/low-stock"
          icon={Package}
          title="Low Stock Alerts"
          description="Products below threshold, stock deficit per branch"
        />
        <ReportCard
          href="/reports/profit"
          icon={TrendingUp}
          title="Profit & Margin"
          description="Revenue, COGS, and gross profit by category or branch"
        />
      </div>
    </>
  );
}

function ReportCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="bg-card border rounded-lg p-6 hover:bg-accent transition-colors group">
      <div className="flex items-start gap-4">
        <div className="bg-primary/10 text-primary p-3 rounded-lg">
          <Icon className="size-6" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground group-hover:text-primary transition-colors">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
    </Link>
  );
}
