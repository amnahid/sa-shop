import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { getCurrentMembership } from "@/lib/utils/membership";
import { hasAccountingRouteAccess } from "@/lib/utils/accounting-access";
import {
  closeAccountingPeriod,
  ensureTenantChartOfAccounts,
  getAccountLedgerReport,
  getMonthCloseStatus,
  getProfitAndLossSummary,
  getTrialBalanceReport,
} from "@/lib/actions/accounting";
import { ChartOfAccount } from "@/models";

interface Props {
  searchParams: Promise<{
    fromDate?: string;
    toDate?: string;
    accountId?: string;
    closePeriod?: string;
    closeError?: string;
    closeSuccess?: string;
  }>;
}

function withReportParams(path: string, params: URLSearchParams) {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export default async function AccountingReportsPage({ searchParams }: Props) {
  const { fromDate, toDate, accountId, closePeriod, closeError, closeSuccess } = await searchParams;

  const membership = await getCurrentMembership();
  if (!hasAccountingRouteAccess(membership)) redirect("/dashboard");

  await ensureTenantChartOfAccounts(membership.tenantId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const todayIso = new Date().toISOString().split("T")[0];
  const effectiveFromDate = fromDate || monthStart.toISOString().split("T")[0];
  const effectiveToDate = toDate || todayIso;

  const accounts = await ChartOfAccount.find({
    tenantId: membership.tenantId,
    active: true,
    allowPosting: true,
  })
    .sort({ code: 1 })
    .select({ code: 1, name: 1, type: 1 });

  const defaultAccountId = accountId || accounts[0]?._id.toString() || "";
  const selectedClosePeriod = closePeriod || effectiveToDate.slice(0, 7);
  const [trialBalance, ledger, pnl, monthCloseStatus] = await Promise.all([
    getTrialBalanceReport(membership.tenantId.toString(), {
      fromDate: effectiveFromDate,
      toDate: effectiveToDate,
    }),
    getAccountLedgerReport(membership.tenantId.toString(), {
      accountId: defaultAccountId,
      fromDate: effectiveFromDate,
      toDate: effectiveToDate,
    }),
    getProfitAndLossSummary(membership.tenantId.toString(), {
      fromDate: effectiveFromDate,
      toDate: effectiveToDate,
    }),
    getMonthCloseStatus(membership.tenantId.toString(), selectedClosePeriod),
  ]);

  const errors = [trialBalance.error, ledger.error, pnl.error].filter(Boolean) as string[];
  const monthCloseError = "error" in monthCloseStatus ? monthCloseStatus.error : undefined;
  if (monthCloseError) {
    errors.push(monthCloseError);
  }

  const hasTrialImbalance = Math.abs(trialBalance.totalDebit - trialBalance.totalCredit) > 0.001;

  const reportParams = new URLSearchParams({
    fromDate: effectiveFromDate,
    toDate: effectiveToDate,
    accountId: defaultAccountId,
    closePeriod: selectedClosePeriod,
  });
  const reportParamsString = reportParams.toString();

  const trialBalanceExportLink = withReportParams("/api/reports/export", new URLSearchParams({
    type: "accounting-trial-balance",
    fromDate: effectiveFromDate,
    toDate: effectiveToDate,
  }));
  const ledgerExportLink = withReportParams("/api/reports/export", new URLSearchParams({
    type: "accounting-ledger",
    fromDate: effectiveFromDate,
    toDate: effectiveToDate,
    accountId: defaultAccountId,
  }));
  const pnlExportLink = withReportParams("/api/reports/export", new URLSearchParams({
    type: "accounting-pnl",
    fromDate: effectiveFromDate,
    toDate: effectiveToDate,
  }));

  return (
    <>
      <PageHeader
        title="Accounting Reports"
        section="Accounting"
        breadcrumbs={[{ label: "Accounting", href: "/accounting" }, { label: "Reports" }]}
        description="Trial balance, account ledger, and profit & loss summary for posted entries."
        actions={
          <Link href="/accounting" className="text-sm text-primary hover:underline">
            Back to Accounting
          </Link>
        }
      />

      {errors.length > 0 ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors.join(" · ")}
        </div>
      ) : null}
      {closeError ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{closeError}</div>
      ) : null}
      {closeSuccess ? (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{closeSuccess}</div>
      ) : null}

      <form className="mb-4 rounded-lg border bg-card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">From</label>
          <input
            type="date"
            name="fromDate"
            defaultValue={effectiveFromDate}
            className="h-11 rounded-md border border-input bg-white bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">To</label>
          <input
            type="date"
            name="toDate"
            defaultValue={effectiveToDate}
            className="h-11 rounded-md border border-input bg-white bg-background px-3 text-sm"
          />
        </div>
        <div className="min-w-60">
          <label className="mb-1 block text-sm font-medium">Ledger Account</label>
          <select
            name="accountId"
            defaultValue={defaultAccountId}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {accounts.map((account) => (
              <option key={account._id.toString()} value={account._id.toString()}>
                {account.code} · {account.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Close Period</label>
          <input
            type="month"
            name="closePeriod"
            defaultValue={selectedClosePeriod}
            className="h-11 rounded-md border border-input bg-white bg-background px-3 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Apply
        </button>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        <a
          href={trialBalanceExportLink}
          className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
        >
          Export Trial Balance CSV
        </a>
        <a
          href={ledgerExportLink}
          className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
        >
          Export Ledger CSV
        </a>
        <a
          href={pnlExportLink}
          className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent"
        >
          Export P&L CSV
        </a>
      </div>

      {"error" in monthCloseStatus ? null : (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Month Close</h2>
              <p className="text-sm text-muted-foreground">
                Close accounting period {monthCloseStatus.periodKey} after checks pass.
              </p>
              {monthCloseStatus.alreadyClosed && monthCloseStatus.closedAt ? (
                <p className="mt-1 text-xs text-green-700">
                  Closed on {monthCloseStatus.closedAt.toLocaleString("en-SA")}
                </p>
              ) : null}
            </div>
            <form
              action={async (formData) => {
                "use server";
                const result = await closeAccountingPeriod(formData);
                if (result.error) {
                  redirect(`/accounting/reports?${reportParamsString}&closeError=${encodeURIComponent(result.error ?? "Unable to close period")}`);
                }
                redirect(
                  `/accounting/reports?${reportParamsString}&closeSuccess=${encodeURIComponent(`Period ${result.periodKey} closed successfully`)}`
                );
              }}
              className="flex min-w-72 flex-col gap-2"
            >
              <input type="hidden" name="periodKey" value={monthCloseStatus.periodKey} />
              <input
                type="text"
                name="notes"
                maxLength={500}
                placeholder="Close notes (optional)"
                className="h-11 rounded-md border border-input bg-white bg-background px-3 text-sm"
              />
              <button
                type="submit"
                disabled={!monthCloseStatus.canClose}
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Close Period
              </button>
            </form>
          </div>

          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-md border bg-muted/40 p-2">Draft Entries: {monthCloseStatus.draftEntriesCount}</div>
            <div className="rounded-md border bg-muted/40 p-2">Debit: SAR {monthCloseStatus.totalDebit.toFixed(2)}</div>
            <div className="rounded-md border bg-muted/40 p-2">Credit: SAR {monthCloseStatus.totalCredit.toFixed(2)}</div>
            <div className="rounded-md border bg-muted/40 p-2">
              Status: {monthCloseStatus.canClose ? "Ready to close" : "Blocked"}
            </div>
          </div>

          {monthCloseStatus.issues.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-700">
              {monthCloseStatus.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-green-700">All preconditions passed.</p>
          )}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total Revenue" value={pnl.totalRevenue} />
        <SummaryCard label="Total Expense" value={pnl.totalExpense} />
        <SummaryCard
          label="Net Profit / Loss"
          value={pnl.netProfit}
          valueClassName={pnl.netProfit >= 0 ? "text-green-600" : "text-red-600"}
        />
      </div>

      <div className="mb-6 rounded-lg border bg-card overflow-hidden">
        <div className="border-b p-4">
          <h2 className="font-semibold">Trial Balance</h2>
        </div>
        {trialBalance.rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No posted entries found for this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left font-medium">Account</th>
                <th className="p-3 text-left font-medium">Type</th>
                <th className="p-3 text-right font-medium">Debit</th>
                <th className="p-3 text-right font-medium">Credit</th>
                <th className="p-3 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {trialBalance.rows.map((row) => (
                <tr key={row.accountId.toString()} className="border-t">
                  <td className="p-3">
                    {row.accountCode} · {row.accountName}
                  </td>
                  <td className="p-3 capitalize text-muted-foreground">{row.accountType}</td>
                  <td className="p-3 text-right">SAR {row.debit.toFixed(2)}</td>
                  <td className="p-3 text-right">SAR {row.credit.toFixed(2)}</td>
                  <td className={`p-3 text-right font-medium ${row.balance >= 0 ? "" : "text-red-600"}`}>
                    SAR {row.balance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/50 font-medium">
              <tr>
                <td className="p-3" colSpan={2}>Totals</td>
                <td className="p-3 text-right">SAR {trialBalance.totalDebit.toFixed(2)}</td>
                <td className="p-3 text-right">SAR {trialBalance.totalCredit.toFixed(2)}</td>
                <td className={`p-3 text-right ${hasTrialImbalance ? "text-red-600" : "text-green-700"}`}>
                  {hasTrialImbalance ? "Not Balanced" : "Balanced"}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <div className="mb-6 rounded-lg border bg-card overflow-hidden">
        <div className="border-b p-4">
          <h2 className="font-semibold">Ledger by Account</h2>
          {ledger.account ? (
            <p className="text-xs text-muted-foreground mt-1">
              {ledger.account.code} · {ledger.account.name} ({ledger.account.type})
            </p>
          ) : null}
        </div>
        {ledger.rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No ledger entries in this range for the selected account.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left font-medium">Date</th>
                <th className="p-3 text-left font-medium">Type</th>
                <th className="p-3 text-left font-medium">Counterparty / Ref</th>
                <th className="p-3 text-right font-medium">Debit</th>
                <th className="p-3 text-right font-medium">Credit</th>
                <th className="p-3 text-right font-medium">Running Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t bg-muted/40">
                <td className="p-3" colSpan={5}>Opening Balance</td>
                <td className={`p-3 text-right font-medium ${ledger.openingBalance < 0 ? "text-red-600" : ""}`}>
                  SAR {ledger.openingBalance.toFixed(2)}
                </td>
              </tr>
              {ledger.rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3 text-muted-foreground">{row.entryDate.toLocaleDateString()}</td>
                  <td className="p-3 capitalize">{row.kind}</td>
                  <td className="p-3 text-muted-foreground">
                    {row.counterpartyName || "-"}
                    {row.referenceId ? ` · ${row.referenceId}` : ""}
                  </td>
                  <td className="p-3 text-right">SAR {row.debit.toFixed(2)}</td>
                  <td className="p-3 text-right">SAR {row.credit.toFixed(2)}</td>
                  <td className={`p-3 text-right font-medium ${row.runningBalance < 0 ? "text-red-600" : ""}`}>
                    SAR {row.runningBalance.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/50 font-medium">
              <tr>
                <td className="p-3" colSpan={3}>Period Totals</td>
                <td className="p-3 text-right">SAR {ledger.periodDebit.toFixed(2)}</td>
                <td className="p-3 text-right">SAR {ledger.periodCredit.toFixed(2)}</td>
                <td className={`p-3 text-right ${ledger.closingBalance < 0 ? "text-red-600" : "text-foreground"}`}>
                  SAR {ledger.closingBalance.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="border-b p-4">
            <h2 className="font-semibold">Profit & Loss · Revenue</h2>
          </div>
          {pnl.revenueByAccount.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No revenue entries in this period.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left font-medium">Account</th>
                  <th className="p-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {pnl.revenueByAccount.map((item) => (
                  <tr key={item.accountId} className="border-t">
                    <td className="p-3">
                      {item.accountCode} · {item.accountName}
                    </td>
                    <td className="p-3 text-right font-medium">SAR {item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="border-b p-4">
            <h2 className="font-semibold">Profit & Loss · Expenses</h2>
          </div>
          {pnl.expenseByAccount.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No expense entries in this period.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left font-medium">Account</th>
                  <th className="p-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {pnl.expenseByAccount.map((item) => (
                  <tr key={item.accountId} className="border-t">
                    <td className="p-3">
                      {item.accountCode} · {item.accountName}
                    </td>
                    <td className="p-3 text-right font-medium">SAR {item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function SummaryCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${valueClassName || "text-foreground"}`}>SAR {value.toFixed(2)}</p>
    </div>
  );
}
