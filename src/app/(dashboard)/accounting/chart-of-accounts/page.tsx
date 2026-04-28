import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/app/FormField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCurrentMembership } from "@/lib/utils/membership";
import { hasAccountingRouteAccess } from "@/lib/utils/accounting-access";
import { createChartAccount, ensureTenantChartOfAccounts } from "@/lib/actions/accounting";
import { ChartOfAccount } from "@/models";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountRow {
  id: string;
  code: string;
  name: string;
  type: string;
  allowPosting: boolean;
  active: boolean;
}

export default async function ChartOfAccountsPage() {
  const membership = await getCurrentMembership();
  if (!hasAccountingRouteAccess(membership)) redirect("/dashboard");

  await ensureTenantChartOfAccounts(membership.tenantId);

  const accounts = await ChartOfAccount.find({ tenantId: membership.tenantId }).sort({ code: 1 });

  const rows: AccountRow[] = accounts.map((account) => ({
    id: account._id.toString(),
    code: account.code,
    name: account.name,
    type: account.type,
    allowPosting: account.allowPosting,
    active: account.active,
  }));

  const columns: DataTableColumn<AccountRow>[] = [
    {
      key: "code",
      header: "Code",
      render: (row) => <span className="font-bold text-gray-900">{row.code}</span>,
    },
    {
      key: "name",
      header: "Account Name",
      render: (row) => <span className="font-medium text-gray-700">{row.name}</span>,
    },
    {
      key: "type",
      header: "Classification",
      render: (row) => (
        <span className="text-[10px] font-black uppercase tracking-widest bg-gray-50 text-gray-400 px-2 py-1 rounded border border-gray-100">
           {row.type}
        </span>
      ),
    },
    {
      key: "posting",
      header: "Posting",
      align: "center",
      render: (row) => (
        <span className={cn(
          "text-[10px] font-black uppercase tracking-widest",
          row.allowPosting ? "text-success" : "text-gray-300"
        )}>
          {row.allowPosting ? "Enabled" : "Disabled"}
        </span>
      ),
    },
    {
      key: "active",
      header: "Status",
      align: "center",
      render: (row) => (
        <span className={cn(
          "text-[10px] font-black uppercase tracking-widest",
          row.active ? "text-success" : "text-danger"
        )}>
          {row.active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <Button variant="secondary" size="xs" className="font-bold uppercase text-[10px] tracking-widest px-4" asChild>
          <Link href={`/accounting/chart-of-accounts/${row.id}`}>
            View
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Chart of Accounts"
        section="Accounting"
        breadcrumbs={[{ label: "Accounting", href: "/accounting" }, { label: "Chart of Accounts" }]}
        description="Business-specific account hierarchy used for ledger entries and financial reporting."
      />

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center gap-2 py-3 border-b border-gray-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft-primary text-primary">
            <Plus className="size-4" />
          </div>
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Add Ledger Account</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            action={async (formData) => {
              "use server";
              await createChartAccount(formData);
            }}
            className="space-y-6"
          >
            <div className="grid gap-6 md:grid-cols-5">
              <FormField label="Account Code" htmlFor="code" required>
                <Input id="code" name="code" placeholder="e.g. 4101" required />
              </FormField>
              <FormField label="Account Name" htmlFor="name" required>
                <Input id="name" name="name" placeholder="e.g. Online Sales" required />
              </FormField>
              <FormField label="Account Type" htmlFor="type" required>
                <Select name="type" required defaultValue="revenue">
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="الاسم (Arabic)" htmlFor="nameAr">
                <Input id="nameAr" name="nameAr" dir="rtl" placeholder="اسم الحساب" />
              </FormField>
              <FormField label="Description" htmlFor="description">
                <Input id="description" name="description" placeholder="Optional notes" />
              </FormField>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
              <label className="inline-flex items-center gap-3 text-xs font-bold text-gray-500 uppercase tracking-wider cursor-pointer">
                <input type="checkbox" name="allowPosting" defaultChecked className="size-4 rounded border-gray-300 text-primary focus:ring-primary" />
                Allow transaction posting
              </label>
              <Button type="submit" className="font-bold uppercase tracking-wider text-[11px] px-10 h-11">
                Create Account
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        empty={{
          title: "No accounts yet",
          description: "Define your business chart of accounts to begin ledger entries.",
        }}
      />
    </>
  );
}
