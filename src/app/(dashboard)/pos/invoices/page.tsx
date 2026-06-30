import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { loadInvoices } from "@/lib/actions/invoices";
import { PageHeader } from "@/components/app/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { cookies } from "next/headers";
import { getDictionary, Locale } from "@/lib/i18n/get-dictionary";

interface InvoiceRow {
  id: string;
  number: string;
  date: Date;
  branch: string;
  cashier: string;
  items: number;
  total: number;
  status: string;
  zatcaStatus: string;
}

export default async function InvoicesPage() {
  const membership = await getCurrentMembership();
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as Locale) || "en";
  const dict = await getDictionary(locale);
  const t = (key: string, fallback: string) => (dict.invoices as any)?.[key] || fallback;

  if (!membership) {
    return <div>{t("noMembership", "No active membership")}</div>;
  }

  const tenantId = membership.tenantId;
  const invoices = await loadInvoices(tenantId.toString(), { tenantId });

  const rows: InvoiceRow[] = invoices.map(inv => ({
    id: inv._id.toString(),
    number: inv.invoiceNumber,
    date: inv.issuedAt,
    branch: inv.branch?.name || "-",
    cashier: inv.cashier?.name || "-",
    items: inv.itemCount,
    total: parseFloat(inv.grandTotal.toString()),
    status: inv.status,
    zatcaStatus: inv.zatcaStatus || "Pending",
  }));

  const columns: DataTableColumn<InvoiceRow>[] = [
    {
      key: "number",
      header: t("invoiceNo", "Invoice #"),
      render: (r) => <span className="font-bold text-gray-900">{r.number}</span>,
    },
    {
      key: "date",
      header: t("date", "Date"),
      render: (r) => (
        <span className="text-gray-500 font-medium">
          {r.date.toLocaleDateString("en-SA", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    {
      key: "branch",
      header: t("branch", "Branch"),
      render: (r) => <span className="font-medium text-gray-700">{r.branch}</span>,
    },
    {
      key: "cashier",
      header: t("cashier", "Cashier"),
      render: (r) => <span className="text-gray-500">{r.cashier}</span>,
    },
    {
      key: "items",
      header: t("items", "Items"),
      align: locale === "ar" ? "left" : "right",
      render: (r) => <span className="font-bold text-gray-600">{r.items}</span>,
    },
    {
      key: "total",
      header: t("total", "Total"),
      align: locale === "ar" ? "left" : "right",
      render: (r) => <span className="font-black text-primary">SAR {r.total.toFixed(2)}</span>,
    },
    {
      key: "status",
      header: t("status", "Status"),
      align: "center",
      render: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "zatcaStatus",
      header: t("zatcaStatus", "ZATCA Status"),
      align: "center",
      render: (r) => <StatusBadge status={r.zatcaStatus} />,
    },
    {
      key: "actions",
      header: t("actions", "Actions"),
      align: locale === "ar" ? "left" : "right",
      render: (r) => (
        <Button variant="secondary" size="xs" className="font-bold uppercase text-[10px] tracking-widest px-4" asChild>
          <Link href={`/pos/invoices/${r.id}`}>
            {t("view", "View")}
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"}>
      <PageHeader
        title={t("title", "Invoice History")}
        section={t("section", "Sales")}
        breadcrumbs={[
          { label: locale === "ar" ? "نقطة البيع" : "Point of Sale", href: "/pos" },
          { label: locale === "ar" ? "الفواتير" : "Invoices" },
        ]}
        actions={
          <Button variant="outline" size="sm" className="font-bold uppercase tracking-wider text-[11px]" asChild>
            <Link href="/pos">{t("back", "Back to POS")}</Link>
          </Button>
        }
        description={t("description", `Displaying ${invoices.length} recent sales transactions.`).replace("{count}", invoices.length.toString())}
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={{
          title: t("noInvoices", "No invoices yet"),
          description: t("noInvoicesDesc", "Start your first sale at the POS to generate invoices."),
          action: (
            <Button asChild>
              <Link href="/pos">{t("goToPos", "Go to POS")}</Link>
            </Button>
          ),
        }}
      />
    </div>
  );
}
