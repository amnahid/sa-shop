
import { redirect } from "next/navigation";
import Link from "next/link";
import { PurchaseOrder, Supplier, Branch } from "@/models";
import { submitPurchaseOrder, cancelPurchaseOrder, receivePurchaseOrderLine } from "@/lib/actions/purchase-orders";
import { getCurrentMembership } from "@/lib/utils/membership";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PurchaseOrderDetailPage({ params }: Props) {
  const { id } = await params;

  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;

  const po = await PurchaseOrder.findOne({ _id: id, tenantId: membership.tenantId });
  if (!po) return <div>Purchase order not found</div>;

  const supplier = await Supplier.findById(po.supplierId);
  const branch = await Branch.findById(po.branchId);

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    submitted: "bg-blue-100 text-blue-800",
    partially_received: "bg-orange-100 text-orange-800",
    received: "bg-green-100 text-green-800",
    cancelled: "bg-gray-100 text-gray-800",
  };

  const totalValue = po.lines.reduce((s, l) => s + l.totalCost, 0);
  const totalReceived = po.lines.reduce((s, l) => s + l.quantityReceived * l.unitCost, 0);
  const totalRemaining = totalValue - totalReceived;

  const canSubmit = po.status === "draft";
  const canCancel = po.status === "draft" || po.status === "submitted" || po.status === "partially_received";
  const canReceive = po.status === "submitted" || po.status === "partially_received";

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{po.poNumber}</h1>
          <p className="text-muted-foreground">
            {po.issuedAt.toLocaleDateString()} • {supplier?.name || "-"} • {branch?.name || "-"}
          </p>
        </div>
        <Link href="/inventory/purchase-orders" className="text-primary hover:underline">← Back</Link>
      </div>

      <div className="bg-card border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold">PO Details</h2>
            <span className={`text-sm px-3 py-1 rounded ${statusColors[po.status] || ""}`}>
              {po.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex gap-2">
            {canSubmit && (
              <form action={async () => {
                "use server";
                await submitPurchaseOrder(id);
              }}>
                <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium">Submit PO</button>
              </form>
            )}
            {canCancel && (
              <form action={async () => {
                "use server";
                await cancelPurchaseOrder(id);
              }}>
                <button type="submit" className="px-4 py-2 rounded-md border border-red-300 text-red-600 text-sm font-medium">Cancel</button>
              </form>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Supplier</dt>
            <dd className="font-medium">{supplier?.name || "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Branch</dt>
            <dd className="font-medium">{branch?.name || "-"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Expected Date</dt>
            <dd className="font-medium">{po.expectedDate ? po.expectedDate.toLocaleDateString() : "-"}</dd>
          </div>
          {po.notes && (
            <div className="col-span-3">
              <dt className="text-muted-foreground">Notes</dt>
              <dd>{po.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Line Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Product</th>
              <th className="text-right p-3 font-medium">Unit Cost</th>
              <th className="text-center p-3 font-medium">Ordered</th>
              <th className="text-center p-3 font-medium">Received</th>
              <th className="text-right p-3 font-medium">Total</th>
              <th className="text-center p-3 font-medium">Receive</th>
            </tr>
          </thead>
          <tbody>
            {po.lines.map((line, i) => {
              const remaining = line.quantityOrdered - line.quantityReceived;
              const isFullyReceived = remaining <= 0;
              return (
                <tr key={i} className="border-t">
                  <td className="p-3">
                    <span className="font-medium">{line.name}</span>
                    <span className="block text-xs text-muted-foreground">{line.sku}</span>
                  </td>
                  <td className="p-3 text-right">SAR {line.unitCost.toFixed(2)}</td>
                  <td className="p-3 text-center">{line.quantityOrdered}</td>
                  <td className={`p-3 text-center font-medium ${isFullyReceived ? "text-green-600" : "text-orange-600"}`}>
                    {line.quantityReceived}
                  </td>
                  <td className="p-3 text-right font-medium">SAR {line.totalCost.toFixed(2)}</td>
                  <td className="p-3 text-center">
                    {canReceive && !isFullyReceived ? (
                      <ReceiveLineButton
                        poId={id}
                        lineIndex={i}
                        remaining={remaining}
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-muted border-t-2">
            <tr>
              <td colSpan={4} className="p-3 font-medium text-right">Total</td>
              <td className="p-3 text-right font-bold">SAR {totalValue.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-muted-foreground">Total Value</p>
          <p className="text-xl font-bold">SAR {totalValue.toFixed(2)}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-muted-foreground">Received</p>
          <p className="text-xl font-bold text-green-600">SAR {totalReceived.toFixed(2)}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-muted-foreground">Remaining</p>
          <p className={`text-xl font-bold ${totalRemaining > 0 ? "text-orange-500" : "text-green-600"}`}>
            SAR {totalRemaining.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

async function ReceiveLineButton({ poId, lineIndex, remaining }: { poId: string; lineIndex: number; remaining: number }) {
  async function action(formData: FormData) {
    "use server";
    const qty = parseInt(formData.get("qty") as string);
    const batch = formData.get("batch") as string;
    const expiry = formData.get("expiry") as string;
    if (qty > 0) {
      await receivePurchaseOrderLine(poId, lineIndex, qty, batch, expiry || undefined);
    }
  }

  return (
    <form action={action} className="inline-flex gap-1 items-center">
      <input
        type="number"
        name="qty"
        min={1}
        max={remaining}
        defaultValue={remaining}
        className="w-16 h-7 rounded border border-input bg-background px-1 text-sm text-center"
      />
      <input
        type="text"
        name="batch"
        placeholder="Batch #"
        className="w-20 h-7 rounded border border-input bg-background px-1 text-xs"
      />
      <input
        type="date"
        name="expiry"
        className="h-7 rounded border border-input bg-background px-1 text-xs"
      />
      <button
        type="submit"
        className="h-7 px-2 rounded bg-green-600 text-white text-xs font-medium hover:bg-green-700"
      >
        OK
      </button>
    </form>
  );
}
