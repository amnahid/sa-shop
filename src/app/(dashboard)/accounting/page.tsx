import type { ComponentType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CreditCard, FileSpreadsheet, Wallet } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { getCurrentMembership } from "@/lib/utils/membership";
import { AccountingEntry, ChartOfAccount, PaymentRecord } from "@/models";
import { ensureTenantChartOfAccounts } from "@/lib/actions/accounting";

export default async function AccountingPage() {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") redirect("/dashboard");

  await ensureTenantChartOfAccounts(membership.tenantId);

  const [accountsCount, entriesCount, paymentsCount] = await Promise.all([
    ChartOfAccount.countDocuments({ tenantId: membership.tenantId, active: true }),
    AccountingEntry.countDocuments({ tenantId: membership.tenantId }),
    PaymentRecord.countDocuments({ tenantId: membership.tenantId }),
  ]);

  return (
    <>
      <PageHeader
        title="Accounting"
        section="Administration"
        breadcrumbs={[{ label: "Accounting" }]}
        description="Manage your chart of accounts, manual revenue/expense entries, and payment tracking."
      />

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatCard label="Active Accounts" value={accountsCount} />
        <StatCard label="Accounting Entries" value={entriesCount} />
        <StatCard label="Payment Records" value={paymentsCount} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FeatureCard
          href="/accounting/chart-of-accounts"
          icon={BookOpen}
          title="Chart of Accounts"
          description="Create and maintain your tenant-specific account structure."
        />
        <FeatureCard
          href="/accounting/entries"
          icon={Wallet}
          title="Revenue & Expenses"
          description="Capture manual posted entries against your chart of accounts."
        />
        <FeatureCard
          href="/accounting/payments"
          icon={CreditCard}
          title="Customer & Vendor Payments"
          description="Track money received from customers and paid to vendors."
        />
        <FeatureCard
          href="/accounting/reports"
          icon={FileSpreadsheet}
          title="Accounting Reports"
          description="View a compact accounting summary by entry type and account."
        />
      </div>
    </>
  );
}

function FeatureCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="rounded-lg border bg-card p-5 hover:bg-accent transition-colors">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
