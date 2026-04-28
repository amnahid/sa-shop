import { PageHeader } from "@/components/app/PageHeader";
import { redirect } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { FormField } from "@/components/app/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPaymentRecord, getCounterpartyOptions } from "@/lib/actions/accounting";
import { getCurrentMembership } from "@/lib/utils/membership";
import { PaymentRecord } from "@/models";

interface PaymentRow {
  id: string;
  date: Date;
  partyType: string;
  direction: string;
  partyName: string;
  method: string;
  status: string;
  amount: number;
}

export default async function AccountingPaymentsPage() {
  const membership = await getCurrentMembership();
  if (!membership || membership.role !== "owner") redirect("/dashboard");

  const [payments, counterparties] = await Promise.all([
    PaymentRecord.find({ tenantId: membership.tenantId }).sort({ paymentDate: -1 }).limit(100),
    getCounterpartyOptions(membership.tenantId),
  ]);
  const todayIso = new Date().toISOString().split("T")[0];

  const rows: PaymentRow[] = payments.map((payment) => ({
    id: payment._id.toString(),
    date: payment.paymentDate,
    partyType: payment.partyType,
    direction: payment.direction,
    partyName: payment.partyName,
    method: payment.method,
    status: payment.status,
    amount: payment.amount,
  }));

  const columns: DataTableColumn<PaymentRow>[] = [
    {
      key: "date",
      header: "Date",
      render: (row) => <span className="text-muted-foreground">{row.date.toLocaleDateString()}</span>,
    },
    {
      key: "partyType",
      header: "Party",
      render: (row) => <span className="capitalize">{row.partyType}</span>,
    },
    {
      key: "partyName",
      header: "Name",
      render: (row) => <span>{row.partyName}</span>,
    },
    {
      key: "direction",
      header: "Flow",
      render: (row) => <span className="uppercase text-xs text-muted-foreground">{row.direction}</span>,
    },
    {
      key: "method",
      header: "Method",
      render: (row) => <span className="capitalize text-muted-foreground">{row.method.replace("_", " ")}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <span className="capitalize text-muted-foreground">{row.status}</span>,
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
        title="Customer & Vendor Payments"
        section="Accounting"
        breadcrumbs={[{ label: "Accounting", href: "/accounting" }, { label: "Payments" }]}
        description="Track incoming customer collections and outgoing vendor payments."
      />

      <form
        action={async (formData) => {
          "use server";
          await createPaymentRecord(formData);
        }}
        className="mb-6 rounded-lg border bg-card p-4"
      >
        <h2 className="mb-3 text-sm font-medium">Record Payment</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <FormField label="Party Type" htmlFor="partyType" required>
            <select id="partyType" name="partyType" required className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
            </select>
          </FormField>
          <FormField label="Party Name" htmlFor="partyName" required>
            <Input id="partyName" name="partyName" required placeholder="Counterparty name" />
          </FormField>
          <FormField label="Customer (optional)" htmlFor="customerId">
            <select id="customerId" name="customerId" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select customer</option>
              {counterparties.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Vendor (optional)" htmlFor="supplierId">
            <select id="supplierId" name="supplierId" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select vendor</option>
              {counterparties.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Amount (SAR)" htmlFor="amount" required>
            <Input id="amount" name="amount" type="number" min="0.01" step="0.01" required />
          </FormField>
          <FormField label="Payment Date" htmlFor="paymentDate">
            <Input id="paymentDate" name="paymentDate" type="date" defaultValue={todayIso} />
          </FormField>
          <FormField label="Method" htmlFor="method">
            <select id="method" name="method" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="cash">Cash</option>
              <option value="mada">MADA</option>
              <option value="visa">Visa</option>
              <option value="mastercard">Mastercard</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="stc_pay">STC Pay</option>
              <option value="other">Other</option>
            </select>
          </FormField>
          <FormField label="Status" htmlFor="status">
            <select id="status" name="status" className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </FormField>
          <FormField label="Reference" htmlFor="referenceNumber">
            <Input id="referenceNumber" name="referenceNumber" placeholder="Optional" />
          </FormField>
        </div>
        <FormField label="Notes" htmlFor="notes" className="mt-3">
          <textarea id="notes" name="notes" rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </FormField>
        <div className="mt-3 flex justify-end">
          <Button type="submit">Save Payment</Button>
        </div>
      </form>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        empty={{
          title: "No payments yet",
          description: "Record your first customer or vendor payment above.",
        }}
      />
    </>
  );
}
