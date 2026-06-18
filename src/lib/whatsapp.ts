import { OutboundMessage } from "@/models";

const WHATSAPP_API_VERSION = "v22.0";
const WHATSAPP_BASE_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
}

export interface SendTextOptions {
  previewUrl?: boolean;
}

export interface TemplateParam {
  name: string;
  language: string;
  bodyParameters: string[];
}

export class WhatsAppClient {
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  async sendTextMessage(
    to: string,
    body: string,
    options: SendTextOptions = {}
  ): Promise<{ messageId: string }> {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.replace(/^\+/, ""),
      type: "text",
      text: {
        preview_url: options.previewUrl ?? true,
        body,
      },
    };

    return this.post(payload);
  }

  async sendTemplateMessage(
    to: string,
    template: TemplateParam
  ): Promise<{ messageId: string }> {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: template.name,
        language: {
          code: template.language,
        },
        components: [
          {
            type: "body",
            parameters: template.bodyParameters.map((p) => ({
              type: "text",
              text: p,
            })),
          },
        ],
      },
    };

    return this.post(payload);
  }

  private async post(payload: Record<string, unknown>): Promise<{ messageId: string }> {
    const url = `${WHATSAPP_BASE_URL}/${this.config.phoneNumberId}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg =
        data.error?.message || data.error?.error_user_title || "WhatsApp API error";
      throw new Error(errMsg);
    }

    const messageId: string = data.messages?.[0]?.id || "";
    return { messageId };
  }
}

export async function logOutboundMessage(params: {
  tenantId: string;
  channel: "whatsapp" | "sms";
  recipientPhone: string;
  recipientName?: string;
  templateKey?: string;
  messageBody: string;
  referenceType: "invoice" | "proposal";
  referenceId: string;
  status: "queued" | "sent" | "failed";
  errorMessage?: string;
}) {
  await OutboundMessage.create({
    tenantId: params.tenantId,
    channel: params.channel,
    recipientPhone: params.recipientPhone,
    recipientName: params.recipientName,
    templateKey: params.templateKey,
    messageBody: params.messageBody,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    status: params.status,
    errorMessage: params.errorMessage,
    sentAt: params.status === "sent" ? new Date() : undefined,
  });
}
