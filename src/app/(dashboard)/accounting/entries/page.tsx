import { PageHeader } from "@/components/app/PageHeader";
import { redirect } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { FormField } from "@/components/app/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  createAccountingEntry,
  ensureTenantChartOfAccounts,
  getCounterpartyOptions,
} from "@/lib/actions/accounting";
import { getCurrentMembership } from "@/lib/utils/membership";
import { AccountingEntry, ChartOfAccount } from "@/models";

interface EntryRow {
  id: string;
  date: Date;
  kind: string;
  account: string;
  counterparty: string;
  amount: number;
}

export default async function AccountingEntriesPage() {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") redirect("/dashboard");

  await ensureTenantChartOfAccounts(membership.tenantId);

  const [accounts, entries, counterparties] = await Promise.all([
    ChartOfAccount.find({ tenantId: membership.tenantId, active: true, allowPosting: true }).sort({ code: 1 }),
    AccountingEntry.find({ tenantId: membership.tenantId }).sort({ entryDate: -1 }).limit(100).populate("accountId"),
    getCounterpartyOptions(membership.tenantId),
  ]);
  const todayIso = new Date().toISOString().split("T")[0];

  const rows: EntryRow[] = entries.map((entry) => {
    const account = entry.accountId as unknown as { code?: string; name?: string };
    return {
      id: entry._id.toString(),
      date: entry.entryDate,
      kind: entry.kind,
      account: `${account?.code || "-"} ${account?.name ? `· ${account.name}` : ""}`,
      counterparty: entry.counterpartyName || "-",
      amount: entry.amount,
    };
  });

  const columns: DataTableColumn<EntryRow>[] = [
    {
      key: "date",
      header: "Date",
      render: (row) => <span className="text-muted-foreground">{row.date.toLocaleDateString()}</span>,
    },
    {
      key: "kind",
      header: "Type",
      render: (row) => <span className="capitalize">{row.kind}</span>,
    },
    {
      key: "account",
      header: "Account",
      render: (row) => <span>{row.account}</span>,
    },
    {
      key: "counterparty",
      header: "Counterparty",
      render: (row) => <span className="text-muted-foreground">{row.counterparty}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (row) => <span className="font-medium">SAR {row.amount.toFixed(2)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Revenue & Expense Entries"
        section="Accounting"
        breadcrumbs={[{ label: "Accounting", href: "/accounting" }, { label: "Entries" }]}
        description="Post manual revenue and expense records to your chart of accounts."
      />

      <form
        action={async (formData) => {
          "use server";
          await createAccountingEntry(formData);
        }}
        className="mb-6 rounded-lg border bg-card p-4"
      >
        <h2 className="mb-3 text-sm font-medium">Add Entry</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <FormField label="Type" htmlFor="kind" required>
            <select id="kind" name="kind" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
          </FormField>
          <FormField label="Account" htmlFor="accountId" required>
            <select id="accountId" name="accountId" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              {accounts.map((account) => (
                <option key={account._id.toString()} value={account._id.toString()}>
                  {account.code} · {account.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Amount (SAR)" htmlFor="amount" required>
            <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required />
          </FormField>
          <FormField label="Date" htmlFor="entryDate">
            <Input id="entryDate" name="entryDate" type="date" defaultValue={todayIso} />
          </FormField>
          <FormField label="Counterparty Type" htmlFor="counterpartyType">
            <select id="counterpartyType" name="counterpartyType" defaultValue="none" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="none">None</option>
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
            </select>
          </FormField>
          <FormField label="Counterparty Name" htmlFor="counterpartyName">
            <Input id="counterpartyName" name="counterpartyName" placeholder="Optional label" />
          </FormField>
          <FormField label="Customer" htmlFor="customerId">
            <select id="customerId" name="customerId" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select customer</option>
              {counterparties.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Vendor" htmlFor="supplierId">
            <select id="supplierId" name="supplierId" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select vendor</option>
              {counterparties.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Reference" htmlFor="referenceId">
            <Input id="referenceId" name="referenceId" placeholder="Invoice / PO / Ticket" />
          </FormField>
        </div>
        <FormField label="Notes" htmlFor="notes" className="mt-3">
          <textarea id="notes" name="notes" rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </FormField>
        <div className="mt-3 flex justify-end">
          <Button type="submit">Post Entry</Button>
        </div>
      </form>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        empty={{
          title: "No entries yet",
          description: "Create your first revenue or expense entry above.",
        }}
      />
    </>
  );
}
