"use server";

import { Proposal, WhatsAppConfig, Customer, Tenant, NotificationTemplate } from "@/models";
import { getAuthorizedSessionMembership } from "@/lib/utils/server-authorization";
import { WhatsAppClient, logOutboundMessage } from "@/lib/whatsapp";
import { normalizeToE164, isValidPhone } from "@/lib/utils/phone";
import { renderTemplateString } from "@/lib/template-delivery";

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function buildProposalMessage(
  proposal: {
    proposalNumber: string;
    grandTotal: number;
    validUntil?: Date;
    customerName?: string;
  },
  businessName: string,
  proposalUrl: string
): string {
  const greeting = proposal.customerName ? `Hi ${proposal.customerName},\n\n` : "";
  const validLine = proposal.validUntil
    ? `Valid until: ${proposal.validUntil.toLocaleDateString("en-SA")}\n`
    : "";

  return (
    `${greeting}📋 Proposal #${proposal.proposalNumber}\n` +
    `─────────────────\n` +
    `Business: ${businessName}\n` +
    `Total: SAR ${proposal.grandTotal.toFixed(2)}\n` +
    `${validLine}` +
    `─────────────────\n\n` +
    `View full proposal:\n${proposalUrl}\n\n` +
    `We look forward to working with you!`
  );
}

export async function sendProposalViaWhatsApp(proposalId: string) {
  const auth = await getAuthorizedSessionMembership("sales.proposals:view");
  if ("error" in auth) return { error: auth.error };

  const proposal = await Proposal.findById(proposalId)
    .select({
      proposalNumber: 1,
      grandTotal: 1,
      validUntil: 1,
      customerId: 1,
      customerName: 1,
      tenantId: 1,
    })
    .lean();

  if (!proposal) return { error: "Proposal not found" };

  const [tenant, config] = await Promise.all([
    Tenant.findById(proposal.tenantId).select("name").lean(),
    WhatsAppConfig.findOne({ tenantId: proposal.tenantId, isActive: true }),
  ]);

  const businessName = tenant?.name || "Your Shop";

  if (!config) {
    return { error: "WhatsApp is not configured for this account" };
  }

  let recipientPhone = "";

  if (proposal.customerId) {
    const customer = await Customer.findById(proposal.customerId)
      .select({ phone: 1 })
      .lean();
    if (customer?.phone) {
      const normalized = normalizeToE164(customer.phone);
      if (isValidPhone(normalized)) {
        recipientPhone = normalized;
      }
    }
  }

  if (!recipientPhone) {
    return { error: "Customer has no valid phone number" };
  }

  const proposalUrl = `${APP_BASE_URL}/proposals/${proposalId}`;

  const template = await NotificationTemplate.findOne({
    tenantId: proposal.tenantId,
    key: "whatsapp-proposal-sent",
    channel: "whatsapp",
    isActive: true,
  }).select("message variables").lean() as { message: string; variables: string[] } | null;

  let message: string;
  if (template) {
    const rendered = renderTemplateString(template.message, {
      customerName: proposal.customerName || "",
      proposalNumber: proposal.proposalNumber,
      businessName,
      total: parseFloat(proposal.grandTotal.toString()).toFixed(2),
      validUntil: proposal.validUntil
        ? proposal.validUntil.toLocaleDateString("en-SA")
        : "",
      proposalUrl,
    });
    if (rendered.missingVariables.length === 0) {
      message = rendered.rendered;
    } else {
      message = buildProposalMessage(
        {
          proposalNumber: proposal.proposalNumber,
          grandTotal: parseFloat(proposal.grandTotal.toString()),
          validUntil: proposal.validUntil || undefined,
          customerName: proposal.customerName,
        },
        businessName,
        proposalUrl
      );
    }
  } else {
    message = buildProposalMessage(
      {
        proposalNumber: proposal.proposalNumber,
        grandTotal: parseFloat(proposal.grandTotal.toString()),
        validUntil: proposal.validUntil || undefined,
        customerName: proposal.customerName,
      },
      businessName,
      proposalUrl
    );
  }

  try {
    const client = new WhatsAppClient({
      accessToken: config.accessToken,
      phoneNumberId: config.phoneNumberId,
    });

    const result = await client.sendTextMessage(recipientPhone, message);

    await logOutboundMessage({
      tenantId: proposal.tenantId.toString(),
      channel: "whatsapp",
      recipientPhone,
      recipientName: proposal.customerName || "",
      messageBody: message,
      referenceType: "proposal",
      referenceId: proposalId,
      status: "sent",
    });

    return { success: true, messageId: result.messageId };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    await logOutboundMessage({
      tenantId: proposal.tenantId.toString(),
      channel: "whatsapp",
      recipientPhone,
      recipientName: proposal.customerName || "",
      messageBody: message,
      referenceType: "proposal",
      referenceId: proposalId,
      status: "failed",
      errorMessage,
    });

    return { error: `Failed to send: ${errorMessage}` };
  }
}
