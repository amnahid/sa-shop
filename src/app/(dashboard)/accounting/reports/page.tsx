import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { getCurrentMembership } from "@/lib/utils/membership";
import { getAccountingReportSummary } from "@/lib/actions/accounting";

interface Props {
  searchParams: Promise<{ fromDate?: string; toDate?: string }>;
}

export default async function AccountingReportsPage({ searchParams }: Props) {
  const { fromDate, toDate } = await searchParams;

  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") redirect("/dashboard");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const endDate = toDate ? new Date(toDate) : new Date();
  const todayIso = new Date().toISOString().split("T")[0];

  const summary = await getAccountingReportSummary(membership.tenantId.toString(), {
    fromDate: fromDate ? new Date(fromDate) : monthStart,
    toDate: endDate,
  });

  const revenue = summary.entriesByKind.find((item) => item._id === "revenue")?.total || 0;
  const expense = summary.entriesByKind.find((item) => item._id === "expense")?.total || 0;
  const net = revenue - expense;
  const incomingPayments =
    summary.paymentsByDirection.find((item) => item._id === "in")?.total || 0;
  const outgoingPayments =
    summary.paymentsByDirection.find((item) => item._id === "out")?.total || 0;

  return (
    <>
      <PageHeader
        title="Accounting Reports"
        section="Accounting"
        breadcrumbs={[{ label: "Accounting", href: "/accounting" }, { label: "Reports" }]}
        description="Compact financial summary for posted entries and completed payments."
        actions={
          <Link href="/accounting" className="text-sm text-primary hover:underline">
            Back to Accounting
          </Link>
        }
      />

      <form className="mb-6 rounded-lg border bg-card p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">From</label>
          <input
            type="date"
            name="fromDate"
            defaultValue={fromDate || monthStart.toISOString().split("T")[0]}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">To</label>
          <input
            type="date"
            name="toDate"
            defaultValue={toDate || todayIso}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Apply
        </button>
      </form>

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <SummaryCard label="Revenue" value={revenue} />
        <SummaryCard label="Expense" value={expense} />
        <SummaryCard label="Net" value={net} valueClassName={net >= 0 ? "text-green-600" : "text-red-600"} />
        <SummaryCard label="Incoming Payments" value={incomingPayments} />
        <SummaryCard label="Outgoing Payments" value={outgoingPayments} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="border-b p-4">
            <h2 className="font-semibold">Top Accounts by Amount</h2>
          </div>
          {summary.entriesByAccount.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No posted entries for this period.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left font-medium">Account</th>
                  <th className="p-3 text-left font-medium">Type</th>
                  <th className="p-3 text-right font-medium">Entries</th>
                  <th className="p-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.entriesByAccount.map((item) => (
                  <tr key={item.accountId.toString()} className="border-t">
                    <td className="p-3">
                      {item.accountCode} · {item.accountName}
                    </td>
                    <td className="p-3 capitalize text-muted-foreground">{item.accountType}</td>
                    <td className="p-3 text-right">{item.count}</td>
                    <td className="p-3 text-right font-medium">SAR {item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="border-b p-4">
            <h2 className="font-semibold">Payments by Direction</h2>
          </div>
          {summary.paymentsByDirection.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No completed payments in this period.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left font-medium">Direction</th>
                  <th className="p-3 text-right font-medium">Count</th>
                  <th className="p-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.paymentsByDirection.map((item) => (
                  <tr key={item._id} className="border-t">
                    <td className="p-3 uppercase text-xs">{item._id}</td>
                    <td className="p-3 text-right">{item.count}</td>
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
