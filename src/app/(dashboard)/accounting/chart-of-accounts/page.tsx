import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/app/FormField";
import { getCurrentMembership } from "@/lib/utils/membership";
import { createChartAccount, ensureTenantChartOfAccounts } from "@/lib/actions/accounting";
import { ChartOfAccount } from "@/models";

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
  if (!membership || membership.role !== "owner") redirect("/dashboard");

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
      render: (row) => <span className="font-medium">{row.code}</span>,
    },
    {
      key: "name",
      header: "Name",
      render: (row) => <span>{row.name}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (row) => <span className="capitalize text-muted-foreground">{row.type}</span>,
    },
    {
      key: "allowPosting",
      header: "Posting",
      align: "center",
      render: (row) => (
        <span className={row.allowPosting ? "text-green-600" : "text-muted-foreground"}>
          {row.allowPosting ? "Allowed" : "No"}
        </span>
      ),
    },
    {
      key: "active",
      header: "Status",
      align: "center",
      render: (row) => (
        <span className={row.active ? "text-green-600" : "text-muted-foreground"}>
          {row.active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <Link href={`/accounting/chart-of-accounts/${row.id}`} className="text-primary hover:underline">
          View
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Chart of Accounts"
        section="Accounting"
        breadcrumbs={[{ label: "Accounting", href: "/accounting" }, { label: "Chart of Accounts" }]}
        description="Tenant-specific account list used by accounting entries and reporting."
      />

      <form
        action={async (formData) => {
          "use server";
          await createChartAccount(formData);
        }}
        className="mb-6 rounded-lg border bg-card p-4"
      >
        <h2 className="mb-3 text-sm font-medium">Add Account</h2>
        <div className="grid gap-3 md:grid-cols-5">
          <FormField label="Code" htmlFor="code" required>
            <Input id="code" name="code" placeholder="4101" required />
          </FormField>
          <FormField label="Name" htmlFor="name" required>
            <Input id="name" name="name" placeholder="Online Sales" required />
          </FormField>
          <FormField label="Type" htmlFor="type" required>
            <select
              id="type"
              name="type"
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
            </select>
          </FormField>
          <FormField label="Arabic Name" htmlFor="nameAr">
            <Input id="nameAr" name="nameAr" dir="rtl" placeholder="اسم الحساب" />
          </FormField>
          <FormField label="Description" htmlFor="description">
            <Input id="description" name="description" placeholder="Optional" />
          </FormField>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" name="allowPosting" defaultChecked className="size-4 rounded border-input" />
            Allow posting entries
          </label>
          <Button type="submit">Add Account</Button>
        </div>
      </form>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        empty={{
          title: "No accounts yet",
          description: "Add your first account above.",
        }}
      />
    </>
  );
}
