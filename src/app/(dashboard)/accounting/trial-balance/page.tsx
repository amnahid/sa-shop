import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { getCurrentMembership } from "@/lib/utils/membership";
import { hasAccountingRouteAccess } from "@/lib/utils/accounting-access";
import { getTrialBalanceReport } from "@/lib/actions/accounting";
import { cookies } from "next/headers";
import { getDictionary, Locale } from "@/lib/i18n/get-dictionary";

interface Props {
  searchParams: Promise<{
    fromDate?: string;
    toDate?: string;
  }>;
}

export default async function TrialBalancePage({ searchParams }: Props) {
  const { fromDate, toDate } = await searchParams;

  const membership = await getCurrentMembership();
  if (!hasAccountingRouteAccess(membership)) redirect("/dashboard");

  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as Locale) || "en";
  const dict = await getDictionary(locale);
  const t = (key: string, fallback: string) => (dict.trialBalance as any)?.[key] || fallback;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const todayIso = today.toISOString().split("T")[0];
  const effectiveFromDate = fromDate || monthStart.toISOString().split("T")[0];
  const effectiveToDate = toDate || todayIso;

  const report = await getTrialBalanceReport(membership.tenantId.toString(), {
    fromDate: effectiveFromDate,
    toDate: effectiveToDate,
  });

  const error = "error" in report ? report.error : undefined;
  const hasImbalance = Math.abs(report.totalDebit - report.totalCredit) > 0.001;

  const exportParams = new URLSearchParams({
    type: "accounting-trial-balance",
    fromDate: effectiveFromDate,
    toDate: effectiveToDate,
  });

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"}>
      <PageHeader
        title={t("title", "Trial Balance")}
        section={t("section", "Accounting")}
        breadcrumbs={[
          { label: locale === "ar" ? "المحاسبة" : "Accounting", href: "/accounting" },
          { label: t("title", "Trial Balance") }
        ]}
        description={t("description", "Summarised balances for all accounts — opening, period activity, and closing.")}
        actions={
          <Link href="/accounting" className="text-sm text-primary hover:underline">
            {t("back", "Back to Accounting")}
          </Link>
        }
      />

      {error ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form className="mb-4 rounded-lg border bg-card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">{t("from", "From")}</label>
          <input
            type="date"
            name="fromDate"
            defaultValue={effectiveFromDate}
            className="h-11 rounded-md border border-input bg-white bg-background px-3 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{t("to", "To")}</label>
          <input
            type="date"
            name="toDate"
            defaultValue={effectiveToDate}
            className="h-11 rounded-md border border-input bg-white bg-background px-3 text-sm text-foreground"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          {t("apply", "Apply")}
        </button>
        <a
          href={`/api/reports/export?${exportParams.toString()}`}
          className="inline-flex h-11 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium text-foreground hover:bg-accent"
        >
          {t("exportCsv", "Export CSV")}
        </a>
      </form>

      {report.rows.length === 0 && !error ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          {t("noEntries", "No posted entries found for this period.")}
        </div>
      ) : !error ? (
        <>
          <div className="mb-4 grid gap-4 md:grid-cols-3">
            <SummaryCard label={t("totalDebitPeriod", "Total Debit (Period)")} value={report.totalDebit} />
            <SummaryCard label={t("totalCreditPeriod", "Total Credit (Period)")} value={report.totalCredit} />
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t("status", "Status")}</p>
              <p className={`text-xl font-semibold ${hasImbalance ? "text-red-600" : "text-green-700"}`}>
                {hasImbalance ? t("notBalanced", "Not Balanced") : t("balanced", "Balanced")}
              </p>
            </div>
          </div>

          <div className="rounded-lg border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-start font-medium">{t("account", "Account")}</th>
                  <th className="p-3 text-start font-medium">{t("arabicName", "Arabic Name")}</th>
                  <th className="p-3 text-start font-medium">{t("type", "Type")}</th>
                  <th className="p-3 text-end font-medium">{t("opening", "Opening")}</th>
                  <th className="p-3 text-end font-medium">{t("debit", "Debit")}</th>
                  <th className="p-3 text-end font-medium">{t("credit", "Credit")}</th>
                  <th className="p-3 text-end font-medium">{t("closing", "Closing")}</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row) => (
                  <tr key={row.accountId.toString()} className="border-t">
                    <td className="p-3">
                      <Link
                        href={`/accounting/reports?accountId=${row.accountId.toString()}&fromDate=${effectiveFromDate}&toDate=${effectiveToDate}`}
                        className="text-primary hover:underline"
                      >
                        {row.accountCode} · {row.accountName}
                      </Link>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {row.accountNameAr || "—"}
                    </td>
                    <td className="p-3 capitalize text-muted-foreground">{row.accountType}</td>
                    <td className={`p-3 text-end ${row.openingBalance >= 0 ? "" : "text-red-600"}`}>
                      SAR {row.openingBalance.toFixed(2)}
                    </td>
                    <td className="p-3 text-end">SAR {row.debit.toFixed(2)}</td>
                    <td className="p-3 text-end">SAR {row.credit.toFixed(2)}</td>
                    <td className={`p-3 text-end font-medium ${row.closingBalance >= 0 ? "" : "text-red-600"}`}>
                      SAR {row.closingBalance.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/50 font-medium">
                <tr>
                  <td className="p-3" colSpan={3}>
                    {t("totalAccounts", "Total Accounts")}: {report.rows.length}
                  </td>
                  <td className="p-3 text-end">
                    SAR {report.rows.reduce((s, r) => s + r.openingBalance, 0).toFixed(2)}
                  </td>
                  <td className="p-3 text-end">SAR {report.totalDebit.toFixed(2)}</td>
                  <td className="p-3 text-end">SAR {report.totalCredit.toFixed(2)}</td>
                  <td className={`p-3 text-end ${hasImbalance ? "text-red-600" : "text-green-700"}`}>
                    SAR {report.rows.reduce((s, r) => s + r.closingBalance, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold text-foreground">SAR {value.toFixed(2)}</p>
    </div>
  );
}
