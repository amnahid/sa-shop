import mongoose from "mongoose";
import { NotificationTemplate } from "@/models";

const DEFAULT_TEMPLATES = [
  {
    key: "whatsapp-invoice-receipt",
    name: "Invoice Receipt",
    channel: "whatsapp" as const,
    title: "Invoice Receipt",
    message:
      "{{customerName}}\n\n" +
      "📋 Invoice #{{invoiceNumber}}\n" +
      "─────────────────\n" +
      "Business: {{businessName}}\n" +
      "Date: {{date}}\n" +
      "Total: SAR {{total}}\n" +
      "Status: {{status}}\n" +
      "─────────────────\n\n" +
      "View full receipt:\n{{receiptUrl}}\n\n" +
      "Thank you for your purchase!",
    variables: [
      "customerName",
      "invoiceNumber",
      "businessName",
      "date",
      "total",
      "status",
      "receiptUrl",
    ],
  },
  {
    key: "whatsapp-proposal-sent",
    name: "Proposal Sent",
    channel: "whatsapp" as const,
    title: "Proposal Sent",
    message:
      "{{customerName}}\n\n" +
      "📋 Proposal #{{proposalNumber}}\n" +
      "─────────────────\n" +
      "Business: {{businessName}}\n" +
      "Total: SAR {{total}}\n" +
      "{{validUntil}}─────────────────\n\n" +
      "View full proposal:\n{{proposalUrl}}\n\n" +
      "We look forward to working with you!",
    variables: [
      "customerName",
      "proposalNumber",
      "businessName",
      "total",
      "validUntil",
      "proposalUrl",
    ],
  },
];

export async function ensureDefaultWhatsAppTemplates(
  tenantId: string | mongoose.Types.ObjectId
): Promise<void> {
  const tid =
    typeof tenantId === "string"
      ? new mongoose.Types.ObjectId(tenantId)
      : tenantId;

  for (const tpl of DEFAULT_TEMPLATES) {
    const existing = await NotificationTemplate.findOne({
      tenantId: tid,
      key: tpl.key,
    });

    if (!existing) {
      await NotificationTemplate.create({
        tenantId: tid,
        key: tpl.key,
        name: tpl.name,
        channel: tpl.channel,
        title: tpl.title,
        message: tpl.message,
        variables: tpl.variables,
        isActive: true,
      });
    }
  }
}
