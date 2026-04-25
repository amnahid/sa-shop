import { NextRequest, NextResponse } from "next/server";
import { sendLowStockEmails } from "@/lib/utils/stock-email";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await sendLowStockEmails();
    console.log(`[CRON] Low stock emails completed at ${new Date().toISOString()}`);
    return NextResponse.json({ success: true, message: "Low stock emails sent" });
  } catch (error) {
    console.error("[CRON] Low stock email error:", error);
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 });
  }
}