"use server";

import { Invoice, WhatsAppConfig, Customer, Tenant, NotificationTemplate } from "@/models";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";
import { WhatsAppClient, logOutboundMessage } from "@/lib/whatsapp";
import { normalizeToE164, isValidPhone } from "@/lib/utils/phone";
import { renderTemplateString } from "@/lib/template-delivery";

const RECEIPT_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function buildInvoiceMessage(
  invoice: {
    invoiceNumber: string;
    grandTotal: number;
    issuedAt: Date;
    status: string;
    customerName?: string;
  },
  businessName: string,
  receiptUrl: string
): string {
  const date = invoice.issuedAt.toLocaleDateString("en-SA");
  const statusLabel = invoice.status === "completed" ? "Paid" : invoice.status;
  const greeting = invoice.customerName ? `Hi ${invoice.customerName},\n\n` : "";

  return (
    `${greeting}📋 Invoice #${invoice.invoiceNumber}\n` +
    `─────────────────\n` +
    `Business: ${businessName}\n` +
    `Date: ${date}\n` +
    `Total: SAR ${invoice.grandTotal.toFixed(2)}\n` +
    `Status: ${statusLabel}\n` +
    `─────────────────\n\n` +
    `View full receipt:\n${receiptUrl}\n\n` +
    `Thank you for your purchase!`
  );
}

export async function sendInvoiceViaWhatsAppToPhone(invoiceId: string, phone: string) {
  const auth = await getAuthorizedSessionMembership("pos:view");
  if ("error" in auth) return { error: auth.error };

  const normalized = normalizeToE164(phone);
  if (!isValidPhone(normalized)) {
    return { error: "Invalid recipient phone number format. Must be in international format (e.g. +9665XXXXXXXX)" };
  }

  const invoice = await Invoice.findById(invoiceId)
    .select({
      invoiceNumber: 1,
      grandTotal: 1,
      issuedAt: 1,
      status: 1,
      customerId: 1,
      tenantId: 1,
      customerName: 1,
    })
    .lean();

  if (!invoice) return { error: "Invoice not found" };

  const [tenant, config] = await Promise.all([
    Tenant.findById(invoice.tenantId).select("name").lean(),
    WhatsAppConfig.findOne({ tenantId: invoice.tenantId, isActive: true }),
  ]);

  const businessName = tenant?.name || "Your Shop";

  if (!config) {
    return { error: "WhatsApp is not configured for this account" };
  }

  const recipientPhone = normalized;
  const recipientName = invoice.customerName || "";
  const receiptUrl = `${RECEIPT_BASE_URL}/pos/receipt/${invoiceId}`;

  const template = await NotificationTemplate.findOne({
    tenantId: invoice.tenantId,
    key: "whatsapp-invoice-receipt",
    channel: "whatsapp",
    isActive: true,
  }).select("message variables").lean() as { message: string; variables: string[] } | null;

  let message: string;
  if (template) {
    const rendered = renderTemplateString(template.message, {
      customerName: recipientName,
      invoiceNumber: invoice.invoiceNumber,
      businessName,
      date: invoice.issuedAt.toLocaleDateString("en-SA"),
      total: parseFloat(invoice.grandTotal.toString()).toFixed(2),
      status: invoice.status === "completed" ? "Paid" : invoice.status,
      receiptUrl,
    });
    if (rendered.missingVariables.length === 0) {
      message = rendered.rendered;
    } else {
      message = buildInvoiceMessage(
        {
          invoiceNumber: invoice.invoiceNumber,
          grandTotal: parseFloat(invoice.grandTotal.toString()),
          issuedAt: invoice.issuedAt,
          status: invoice.status,
          customerName: recipientName,
        },
        businessName,
        receiptUrl
      );
    }
  } else {
    message = buildInvoiceMessage(
      {
        invoiceNumber: invoice.invoiceNumber,
        grandTotal: parseFloat(invoice.grandTotal.toString()),
        issuedAt: invoice.issuedAt,
        status: invoice.status,
        customerName: recipientName,
      },
      businessName,
      receiptUrl
    );
  }

  try {
    const client = new WhatsAppClient({
      accessToken: config.accessToken,
      phoneNumberId: config.phoneNumberId,
    });

    const result = await client.sendTextMessage(recipientPhone, message);

    await logOutboundMessage({
      tenantId: invoice.tenantId.toString(),
      channel: "whatsapp",
      recipientPhone,
      recipientName,
      messageBody: message,
      referenceType: "invoice",
      referenceId: invoiceId,
      status: "sent",
    });

    return { success: true, messageId: result.messageId };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    await logOutboundMessage({
      tenantId: invoice.tenantId.toString(),
      channel: "whatsapp",
      recipientPhone,
      recipientName,
      messageBody: message,
      referenceType: "invoice",
      referenceId: invoiceId,
      status: "failed",
      errorMessage,
    });

    return { error: `Failed to send: ${errorMessage}` };
  }
}

export async function sendInvoiceViaWhatsApp(invoiceId: string) {
  const auth = await getAuthorizedSessionMembership("pos:view");
  if ("error" in auth) return { error: auth.error };

  const invoice = await Invoice.findById(invoiceId)
    .select({
      customerId: 1,
    })
    .lean();

  if (!invoice) return { error: "Invoice not found" };

  let recipientPhone = "";

  if (invoice.customerId) {
    const customer = await Customer.findById(invoice.customerId)
      .select({ phone: 1 })
      .lean();
    if (customer?.phone) {
      recipientPhone = customer.phone;
    }
  }

  if (!recipientPhone) {
    return { error: "Customer has no valid phone number" };
  }

  return sendInvoiceViaWhatsAppToPhone(invoiceId, recipientPhone);
}

export async function resendInvoiceViaWhatsApp(invoiceId: string) {
  return sendInvoiceViaWhatsApp(invoiceId);
}
