import { NextRequest, NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/utils/membership";
import {
  getSalesReport,
  getStockMovements,
  getLowStockReport,
} from "@/lib/actions/reports";
import {
  exportSalesCsv,
  exportMovementsCsv,
  exportLowStockCsv,
} from "@/lib/utils/csv-export";

export async function GET(req: NextRequest) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "No active membership" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type");
  const tenantId = membership.tenantId.toString();

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

    return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}