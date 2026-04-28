import { PageHeader } from "@/components/app/PageHeader";
import { redirect } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { FormField } from "@/components/app/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/app/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAccountingEntry,
  ensureTenantChartOfAccounts,
  getCounterpartyOptions,
  transitionAccountingEntryStatus,
} from "@/lib/actions/accounting";
import { loadEntityAuditTimelineBatch } from "@/lib/actions/audit-trail";
import type { AuditTimelineEntry } from "@/lib/audit-trail";
import { getCurrentMembership } from "@/lib/utils/membership";
import { hasAccountingRouteAccess } from "@/lib/utils/accounting-access";
import { AccountingEntry, ChartOfAccount } from "@/models";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface EntryRow {
  id: string;
  date: Date;
  kind: string;
  account: string;
  counterparty: string;
  amount: number;
  status: "draft" | "posted" | "void";
  voidReason: string;
  latestAuditLabel: string;
  latestAuditAt?: Date;
  latestAuditActor?: string;
}

interface Props {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function AccountingEntriesPage({ searchParams }: Props) {
  const { error, success } = await searchParams;
  const membership = await getCurrentMembership();
  if (!hasAccountingRouteAccess(membership)) redirect("/dashboard");

  await ensureTenantChartOfAccounts(membership.tenantId);

  const [accounts, entries, counterparties] = await Promise.all([
    ChartOfAccount.find({ tenantId: membership.tenantId, active: true, allowPosting: true }).sort({ code: 1 }),
    AccountingEntry.find({ tenantId: membership.tenantId }).sort({ entryDate: -1 }).limit(100).populate("accountId"),
    getCounterpartyOptions(membership.tenantId),
  ]);
  const auditResult = await loadEntityAuditTimelineBatch(
    "accounting-entry",
    entries.map((entry) => entry._id.toString()),
    "accounting:view"
  );
  const auditTimeline: AuditTimelineEntry[] =
    "timeline" in auditResult && Array.isArray(auditResult.timeline) ? auditResult.timeline : [];
  const latestAuditByEntryId = new Map<string, AuditTimelineEntry>();
  for (const event of auditTimeline) {
    if (!latestAuditByEntryId.has(event.entityId)) {
      latestAuditByEntryId.set(event.entityId, event);
    }
  }
  const todayIso = new Date().toISOString().split("T")[0];

  const rows: EntryRow[] = entries.map((entry) => {
    const account = entry.accountId as unknown as { code?: string; name?: string };
    const latestAudit = latestAuditByEntryId.get(entry._id.toString());
    return {
      id: entry._id.toString(),
      date: entry.entryDate,
      kind: entry.kind,
      account: `${account?.code || "-"} ${account?.name ? `· ${account.name}` : ""}`,
      counterparty: entry.counterpartyName || "-",
      amount: entry.amount,
      status: entry.status,
      voidReason: entry.voidReason || "",
      latestAuditLabel: latestAudit?.summary || latestAudit?.action || "No audit activity",
      latestAuditAt: latestAudit?.timestamp,
      latestAuditActor: latestAudit?.actorName || latestAudit?.actorUserId,
    };
  });

  const columns: DataTableColumn<EntryRow>[] = [
    {
      key: "date",
      header: "Date",
      render: (row) => <span className="font-medium text-gray-600">{row.date.toLocaleDateString()}</span>,
    },
    {
      key: "kind",
      header: "Type",
      render: (row) => (
        <span className={cn(
          "font-bold uppercase text-[10px] px-2 py-0.5 rounded border",
          row.kind === "revenue" ? "bg-soft-success text-success border-success/10" : "bg-soft-danger text-danger border-danger/10"
        )}>
          {row.kind}
        </span>
      ),
    },
    {
      key: "account",
      header: "Account",
      render: (row) => <span className="font-bold text-gray-800">{row.account}</span>,
    },
    {
      key: "counterparty",
      header: "Counterparty",
      render: (row) => <span className="text-gray-500">{row.counterparty}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (row) => <span className="font-extrabold text-primary">SAR {row.amount.toFixed(2)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          {row.status === "draft" ? (
            <form
              action={async (formData) => {
                "use server";
                const result = await transitionAccountingEntryStatus(formData);
                if (result.error) {
                  redirect(`/accounting/entries?error=${encodeURIComponent(result.error ?? "Unable to post entry")}`);
                }
                redirect("/accounting/entries?success=Entry%20posted%20successfully");
              }}
            >
              <input type="hidden" name="entryId" value={row.id} />
              <input type="hidden" name="targetStatus" value="posted" />
              <Button type="submit" size="xs" variant="secondary">
                Post
              </Button>
            </form>
          ) : null}
          {row.status !== "void" ? (
            <form
              action={async (formData) => {
                "use server";
                const result = await transitionAccountingEntryStatus(formData);
                if (result.error) {
                  redirect(`/accounting/entries?error=${encodeURIComponent(result.error ?? "Unable to void entry")}`);
                }
                redirect("/accounting/entries?success=Entry%20voided");
              }}
            >
              <input type="hidden" name="entryId" value={row.id} />
              <input type="hidden" name="targetStatus" value="void" />
              <input type="hidden" name="voidReason" value="Voided from entries list" />
              <Button type="submit" size="xs" variant="destructive">
                Void
              </Button>
            </form>
          ) : (
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Voided</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Revenue & Expense Entries"
        section="Accounting"
        breadcrumbs={[{ label: "Accounting", href: "/accounting" }, { label: "Entries" }]}
         description="Manage your business revenue and expenses with draft, post, and void lifecycle controls."
       />

      {error ? (
        <div className="mb-6 rounded-md border border-danger/20 bg-soft-danger px-4 py-3 text-sm text-danger font-medium">{error}</div>
      ) : null}
      {success ? (
        <div className="mb-6 rounded-md border border-success/20 bg-soft-success px-4 py-3 text-sm text-success font-medium">{success}</div>
      ) : null}

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center gap-2 py-3 border-b border-gray-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft-primary text-primary">
            <Plus className="size-4" />
          </div>
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Add New Entry</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            action={async (formData) => {
              "use server";
              const result = await createAccountingEntry(formData);
              if (result.error) {
                redirect(`/accounting/entries?error=${encodeURIComponent(result.error ?? "Unable to create entry")}`);
              }
              const successMessage =
                result.status === "draft" ? "Entry%20saved%20as%20draft" : "Entry%20posted%20successfully";
              redirect(`/accounting/entries?success=${successMessage}`);
            }}
            className="space-y-6"
          >
            <div className="grid gap-6 md:grid-cols-3">
              <FormField label="Type" htmlFor="kind" required>
                <Select name="kind" defaultValue="revenue">
                  <SelectTrigger id="kind">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Account" htmlFor="accountId" required>
                <Select name="accountId">
                  <SelectTrigger id="accountId">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account._id.toString()} value={account._id.toString()}>
                        {account.code} · {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Amount (SAR)" htmlFor="amount" required>
                <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00" />
              </FormField>
              <FormField label="Date" htmlFor="entryDate">
                <Input id="entryDate" name="entryDate" type="date" defaultValue={todayIso} />
              </FormField>
              <FormField label="Counterparty Type" htmlFor="counterpartyType">
                <Select name="counterpartyType" defaultValue="none">
                  <SelectTrigger id="counterpartyType">
                    <SelectValue placeholder="Select counterparty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Counterparty Name" htmlFor="counterpartyName">
                <Input id="counterpartyName" name="counterpartyName" placeholder="Optional label" />
              </FormField>
              <FormField label="Reference" htmlFor="referenceId">
                <Input id="referenceId" name="referenceId" placeholder="Invoice / PO / Ticket" />
              </FormField>
              <FormField label="Notes" htmlFor="notes" className="md:col-span-2">
                <Input id="notes" name="notes" placeholder="Optional entry description..." />
              </FormField>
            </div>
            
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-gray-50">
              <Button type="submit" name="status" value="draft" variant="outline" className="font-bold uppercase tracking-wider text-xs px-8 h-11">
                Save as Draft
              </Button>
              <Button type="submit" name="status" value="posted" className="font-bold uppercase tracking-wider text-xs px-10 h-11">
                Post Entry
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
          title: "No entries yet",
          description: "Create your first draft or posted revenue/expense entry above.",
        }}
      />
    </>
  );
}
