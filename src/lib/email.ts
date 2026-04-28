import mongoose from "mongoose";
import { Resend } from "resend";
import {
  resolveEmailTemplateForDelivery,
  type TemplateVariables,
  type TemplateVariableValue,
} from "@/lib/template-delivery";

let resend: Resend | null = null;

function getResend() {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    resend = new Resend(apiKey);
  }
  return resend;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const FROM_NAME = process.env.EMAIL_FROM_NAME || "SA Shop";
const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || "noreply@sashop.example.com";

export type EmailTemplate =
  | "invite"
  | "password-reset"
  | "welcome"
  | "low-stock"
  | "invoice-receipt"
  | "critical-failure";

type TenantIdentifier = string | mongoose.Types.ObjectId;

interface EmailData {
  to: string;
  name?: string;
  token?: string;
  businessName?: string;
}

interface LowStockEmailData extends EmailData {
  businessName: string;
  items: Array<{ name: string; branch: string; quantity: number; threshold: number }>;
  totalCount: number;
}

interface InvoiceReceiptData extends EmailData {
  businessName: string;
  businessAddress?: string;
  businessVat?: string;
  invoiceNumber: string;
  issuedAt: Date;
  branchName?: string;
  lines: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
  paymentMethod: string;
}

interface CriticalFailureEmailData extends EmailData {
  failureId: string;
  domain: string;
  operation: string;
  occurredAt: Date;
  errorMessage: string;
  contextSummary?: string;
}

interface SendEmailOptions {
  tenantId?: TenantIdentifier;
  actorTenantId?: TenantIdentifier;
  requireSavedTemplate?: boolean;
  templateVariables?: Record<string, TemplateVariableValue>;
}

function getDefaultEmailSubject(template: EmailTemplate, data: EmailData) {
  const subjectMap: Record<EmailTemplate, string> = {
    invite: `You're invited to join ${data.businessName || "a shop"}`,
    "password-reset": "Reset your password",
    welcome: "Welcome to SA Shop",
    "low-stock": `⚠ Low Stock Alert — ${data.businessName || "Your Shop"}`,
    "invoice-receipt": `Receipt for Invoice ${(data as InvoiceReceiptData).invoiceNumber}`,
    "critical-failure": `Critical Failure Alert #${(data as CriticalFailureEmailData).failureId}`,
  };

  return subjectMap[template];
}

function getDefaultEmailHtml(template: EmailTemplate, data: EmailData) {
  switch (template) {
    case "invite": {
      const inviteUrl = `${APP_URL}/invite/${data.token}`;
      return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #10b981;">You're invited!</h1>
            <p>Hi${data.name ? ` ${data.name}` : ""},</p>
            <p>You've been invited to join ${data.businessName || "a shop"} on SA Shop.</p>
            <p><a href="${inviteUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">This link expires in 7 days.</p>
          </div>`;
    }
    case "password-reset": {
      const resetUrl = `${APP_URL}/reset-password/${data.token}`;
      return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #10b981;">Reset Password</h1>
            <p>Hi${data.name ? ` ${data.name}` : ""},</p>
            <p>Click the button below to reset your password:</p>
            <p><a href="${resetUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a></p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
          </div>`;
    }
    case "welcome": {
      return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #10b981;">Welcome to SA Shop!</h1>
            <p>Hi${data.name ? ` ${data.name}` : ""},</p>
            <p>Your account has been created successfully. Get started by adding your first branch and products.</p>
          </div>`;
    }
    case "low-stock": {
      const d = data as LowStockEmailData;
      const rows = d.items
        .slice(0, 20)
        .map(
          (item) => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.branch}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: ${item.quantity === 0 ? "red" : "orange"};">${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.threshold}</td>
          </tr>`
        )
        .join("");
      return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #ef4444;">⚠ Low Stock Alert</h1>
            <p>Hi${data.name ? ` ${data.name}` : ""},</p>
            <p>The following items are running low at <strong>${d.businessName}</strong>:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead><tr style="background: #f3f4f6;">
                <th style="padding: 8px; text-align: left;">Product</th>
                <th style="padding: 8px; text-align: left;">Branch</th>
                <th style="padding: 8px; text-align: right;">Stock</th>
                <th style="padding: 8px; text-align: right;">Threshold</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
            ${d.totalCount > 20 ? `<p style="color: #6b7280; font-size: 14px;">...and ${d.totalCount - 20} more items.</p>` : ""}
            <p style="margin-top: 20px;"><a href="${APP_URL}/inventory/stock" style="background: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">View Stock</a></p>
          </div>`;
    }
    case "invoice-receipt": {
      const d = data as InvoiceReceiptData;
      const rows = d.lines
        .map(
          (line) => `
          <tr>
            <td style="padding: 6px; border-bottom: 1px solid #eee;">${line.name}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${line.quantity}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">SAR ${line.unitPrice.toFixed(2)}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">SAR ${line.total.toFixed(2)}</td>
          </tr>`
        )
        .join("");
      return `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: white;">
            <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 16px; margin-bottom: 16px;">
              <h1 style="margin: 0; color: #10b981;">${d.businessName}</h1>
              ${d.businessAddress ? `<p style="margin: 4px 0; color: #666; font-size: 14px;">${d.businessAddress}</p>` : ""}
              ${d.businessVat ? `<p style="margin: 4px 0; color: #666; font-size: 14px;">VAT: ${d.businessVat}</p>` : ""}
            </div>
            <table style="width: 100%; margin: 16px 0;">
              <tr><td><strong>Invoice:</strong> ${d.invoiceNumber}</td><td style="text-align: right;"><strong>Date:</strong> ${d.issuedAt.toLocaleDateString()}</td></tr>
              ${d.branchName ? `<tr><td><strong>Branch:</strong> ${d.branchName}</td></tr>` : ""}
            </table>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <thead><tr style="background: #f3f4f6;">
                <th style="padding: 8px; text-align: left;">Item</th>
                <th style="padding: 8px; text-align: center;">Qty</th>
                <th style="padding: 8px; text-align: right;">Price</th>
                <th style="padding: 8px; text-align: right;">Total</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="text-align: right; margin: 16px 0;">
              <p style="margin: 4px 0;">Subtotal: <strong>SAR ${d.subtotal.toFixed(2)}</strong></p>
              <p style="margin: 4px 0;">VAT (15%): <strong>SAR ${d.vatTotal.toFixed(2)}</strong></p>
              <p style="margin: 4px 0; font-size: 18px;"><strong>Total: SAR ${d.grandTotal.toFixed(2)}</strong></p>
            </div>
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">Thank you for your purchase! • Paid by ${d.paymentMethod}</p>
          </div>`;
    }
    case "critical-failure": {
      const d = data as CriticalFailureEmailData;
      return `
          <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #b91c1c;">Critical Failure Alert</h1>
            <p><strong>Failure ID:</strong> ${d.failureId}</p>
            <p><strong>Domain:</strong> ${d.domain}</p>
            <p><strong>Operation:</strong> ${d.operation}</p>
            <p><strong>Occurred At:</strong> ${d.occurredAt.toISOString()}</p>
            <p><strong>Error:</strong> ${d.errorMessage}</p>
            ${d.contextSummary ? `<pre style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; white-space: pre-wrap;">${d.contextSummary}</pre>` : ""}
          </div>`;
    }
  }
}

function buildTemplateVariables(template: EmailTemplate, data: EmailData): TemplateVariables {
  const baseVariables: TemplateVariables = {
    to: data.to,
    name: data.name || "",
    token: data.token || "",
    businessName: data.businessName || "SA Shop",
    appUrl: APP_URL,
    inviteUrl: data.token ? `${APP_URL}/invite/${data.token}` : "",
    resetUrl: data.token ? `${APP_URL}/reset-password/${data.token}` : "",
    currentYear: new Date().getFullYear(),
  };

  if (template === "low-stock") {
    const stockData = data as LowStockEmailData;
    baseVariables.lowStockTotalCount = stockData.totalCount;
    baseVariables.lowStockItemsHtml = stockData.items
      .slice(0, 20)
      .map(
        (item) =>
          `<tr><td>${item.name}</td><td>${item.branch}</td><td>${item.quantity}</td><td>${item.threshold}</td></tr>`
      )
      .join("");
  }

  if (template === "invoice-receipt") {
    const invoiceData = data as InvoiceReceiptData;
    baseVariables.invoiceNumber = invoiceData.invoiceNumber;
    baseVariables.issuedAt = invoiceData.issuedAt;
    baseVariables.issuedDate = invoiceData.issuedAt.toLocaleDateString();
    baseVariables.branchName = invoiceData.branchName || "";
    baseVariables.businessAddress = invoiceData.businessAddress || "";
    baseVariables.businessVat = invoiceData.businessVat || "";
    baseVariables.subtotal = invoiceData.subtotal.toFixed(2);
    baseVariables.vatTotal = invoiceData.vatTotal.toFixed(2);
    baseVariables.grandTotal = invoiceData.grandTotal.toFixed(2);
    baseVariables.paymentMethod = invoiceData.paymentMethod;
    baseVariables.invoiceLinesHtml = invoiceData.lines
      .map(
        (line) =>
          `<tr><td>${line.name}</td><td>${line.quantity}</td><td>${line.unitPrice.toFixed(2)}</td><td>${line.total.toFixed(2)}</td></tr>`
      )
      .join("");
  }

  if (template === "critical-failure") {
    const failureData = data as CriticalFailureEmailData;
    baseVariables.failureId = failureData.failureId;
    baseVariables.domain = failureData.domain;
    baseVariables.operation = failureData.operation;
    baseVariables.occurredAt = failureData.occurredAt.toISOString();
    baseVariables.errorMessage = failureData.errorMessage;
    baseVariables.contextSummary = failureData.contextSummary || "";
  }

  return baseVariables;
}

export async function sendEmail(template: EmailTemplate, data: EmailData, options: SendEmailOptions = {}) {
  let subject = getDefaultEmailSubject(template, data);
  let html = getDefaultEmailHtml(template, data);
  let text: string | undefined;

  if (options.tenantId) {
    const resolvedTemplate = await resolveEmailTemplateForDelivery({
      tenantId: options.tenantId,
      actorTenantId: options.actorTenantId,
      templateKey: template,
      variables: {
        ...buildTemplateVariables(template, data),
        ...options.templateVariables,
      },
      requireTemplate: options.requireSavedTemplate,
    });

    if ("error" in resolvedTemplate) {
      return { success: false, error: resolvedTemplate.error };
    }

    if (resolvedTemplate.template) {
      subject = resolvedTemplate.template.subject;
      html = resolvedTemplate.template.htmlBody;
      text = resolvedTemplate.template.textBody;
    }
  }

  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL] Skipped (no API key): ${template} → ${data.to}`);
    return { success: false, error: "No API key" };
  }

  try {
    const client = getResend();
    if (!client) {
      console.log(`[EMAIL] Skipped (no Resend client): ${template} → ${data.to}`);
      return { success: false, error: "No Resend client" };
    }
    const result = await client.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: data.to,
      subject,
      html,
      ...(text ? { text } : {}),
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("[EMAIL] Send error:", error);
    return { success: false, error };
  }
}

export async function sendLowStockAlert(data: LowStockEmailData, options: SendEmailOptions = {}) {
  return sendEmail("low-stock", data, options);
}

export async function sendInvoiceReceipt(data: InvoiceReceiptData, options: SendEmailOptions = {}) {
  return sendEmail("invoice-receipt", data, options);
}
