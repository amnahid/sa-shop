import { NextRequest, NextResponse } from "next/server";
import {
  getSalesReport,
  getStockMovements,
  getLowStockReport,
} from "@/lib/actions/reports";
import {
  getAccountLedgerReport,
  getProfitAndLossSummary,
  getTrialBalanceReport,
} from "@/lib/actions/accounting";
import {
  exportSalesCsv,
  exportMovementsCsv,
  exportLowStockCsv,
  exportLedgerByAccountCsv,
  exportProfitAndLossSummaryCsv,
  exportTrialBalanceCsv,
} from "@/lib/utils/csv-export";
import { canAccessPermission, type AppPermissionKey } from "@/lib/utils/permissions";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";

const REPORT_PERMISSION_BY_TYPE: Record<string, AppPermissionKey> = {
  sales: "reports.sales:view",
  movements: "reports.stockMovements:view",
  lowstock: "reports.lowStock:view",
  "accounting-trial-balance": "accounting:view",
  "accounting-ledger": "accounting:view",
  "accounting-pnl": "accounting:view",
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  if (!type || !(type in REPORT_PERMISSION_BY_TYPE)) {
    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  }

  const auth = await getAuthorizedSessionMembership("reports:view");
  if ("error" in auth) {
    const status = auth.error === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ error: auth.error }, { status });
  }

  const scopedPermission = REPORT_PERMISSION_BY_TYPE[type];
  if (
    !canAccessPermission(
      scopedPermission,
      auth.membership.role,
      auth.membership.permissionOverrides
    )
  ) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const tenantId = auth.membership.tenantId.toString();

  try {
    if (type === "sales") {
      const fromDate = searchParams.get("fromDate") ? new Date(searchParams.get("fromDate")!) : undefined;
      const toDate = searchParams.get("toDate") ? new Date(searchParams.get("toDate")!) : undefined;
      const branchId = searchParams.get("branchId") || undefined;

      const data = await getSalesReport(tenantId, { fromDate, toDate, branchId });
      const csv = exportSalesCsv(data);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="sales-report-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (type === "movements") {
      const fromDate = searchParams.get("fromDate") ? new Date(searchParams.get("fromDate")!) : undefined;
      const toDate = searchParams.get("toDate") ? new Date(searchParams.get("toDate")!) : undefined;
      const branchId = searchParams.get("branchId") || undefined;
      const productId = searchParams.get("productId") || undefined;
      const moveType = searchParams.get("moveType") || undefined;

      const data = await getStockMovements(tenantId, { fromDate, toDate, branchId, productId, type: moveType, limit: 1000 });
      const csv = exportMovementsCsv(data.movements as Parameters<typeof exportMovementsCsv>[0]);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="stock-movements-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (type === "lowstock") {
      const branchId = searchParams.get("branchId") || undefined;
      const items = await getLowStockReport(tenantId, branchId);
      const csv = exportLowStockCsv(items as Parameters<typeof exportLowStockCsv>[0]);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="low-stock-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (type === "accounting-trial-balance") {
      const fromDate = searchParams.get("fromDate") || undefined;
      const toDate = searchParams.get("toDate") || undefined;
      const data = await getTrialBalanceReport(tenantId, { fromDate, toDate });
      if (data.error) {
        return NextResponse.json({ error: data.error }, { status: 400 });
      }
      const csv = exportTrialBalanceCsv(data);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="trial-balance-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (type === "accounting-ledger") {
      const fromDate = searchParams.get("fromDate") || undefined;
      const toDate = searchParams.get("toDate") || undefined;
      const accountId = searchParams.get("accountId") || undefined;
      const data = await getAccountLedgerReport(tenantId, { fromDate, toDate, accountId });
      if (data.error) {
        return NextResponse.json({ error: data.error }, { status: 400 });
      }
      const csv = exportLedgerByAccountCsv(data);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="ledger-by-account-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (type === "accounting-pnl") {
      const fromDate = searchParams.get("fromDate") || undefined;
      const toDate = searchParams.get("toDate") || undefined;
      const data = await getProfitAndLossSummary(tenantId, { fromDate, toDate });
      if (data.error) {
        return NextResponse.json({ error: data.error }, { status: 400 });
      }
      const csv = exportProfitAndLossSummaryCsv(data);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="profit-loss-summary-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
