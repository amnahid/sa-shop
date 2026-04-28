import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { hasAccountingRouteAccess } from "@/lib/utils/accounting-access";
import { updateChartAccount } from "@/lib/actions/accounting";
import { AccountingEntry, ChartOfAccount } from "@/models";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params;

  const membership = await getCurrentMembership();
  if (!hasAccountingRouteAccess(membership)) redirect("/dashboard");

  const account = await ChartOfAccount.findOne({ _id: id, tenantId: membership.tenantId });
  if (!account) return <div>Account not found</div>;

  const recentEntries = await AccountingEntry.find({
    tenantId: membership.tenantId,
    accountId: account._id,
  })
    .sort({ entryDate: -1 })
    .limit(10);

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{account.code} · {account.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">{account.type} account</p>
        </div>
        <Link href="/accounting/chart-of-accounts" className="text-sm text-primary hover:underline">
          Back to chart
        </Link>
      </div>

      <div className="mb-6 rounded-lg border bg-card p-6">
        <form
          action={async (formData) => {
            "use server";
            await updateChartAccount(id, formData);
            redirect(`/accounting/chart-of-accounts/${id}`);
          }}
          className="space-y-4"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Code</label>
              <input
                value={account.code}
                disabled
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <input
                value={account.type}
                disabled
                className="flex h-9 w-full rounded-md border border-input bg-muted px-3 text-sm capitalize"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                name="name"
                defaultValue={account.name}
                required
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Arabic Name</label>
              <input
                name="nameAr"
                dir="rtl"
                defaultValue={account.nameAr || ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <textarea
              name="description"
              defaultValue={account.description || ""}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="allowPosting"
                defaultChecked={account.allowPosting}
                className="size-4 rounded border-input"
              />
              Allow posting
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="active"
                defaultChecked={account.active}
                className="size-4 rounded border-input"
              />
              Active
            </label>
          </div>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Save Changes
          </button>
        </form>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="border-b p-4">
          <h2 className="font-semibold">Recent Entries</h2>
        </div>
        {recentEntries.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No entries posted to this account yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left font-medium">Date</th>
                <th className="p-3 text-left font-medium">Type</th>
                <th className="p-3 text-left font-medium">Counterparty</th>
                <th className="p-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentEntries.map((entry) => (
                <tr key={entry._id.toString()} className="border-t">
                  <td className="p-3 text-muted-foreground">{entry.entryDate.toLocaleDateString()}</td>
                  <td className="p-3 capitalize">{entry.kind}</td>
                  <td className="p-3 text-muted-foreground">{entry.counterpartyName || "-"}</td>
                  <td className="p-3 text-right font-medium">SAR {entry.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
