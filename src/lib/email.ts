import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const FROM_NAME = process.env.EMAIL_FROM_NAME || "SA Shop";
const FROM_EMAIL = process.env.EMAIL_FROM_ADDRESS || "noreply@sashop.example.com";

export type EmailTemplate = "invite" | "password-reset" | "welcome" | "low-stock" | "invoice-receipt";

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

export async function sendEmail(template: EmailTemplate, data: EmailData) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[EMAIL] Skipped (no API key): ${template} → ${data.to}`);
    return { success: false, error: "No API key" };
  }

  const subjectMap: Record<EmailTemplate, string> = {
    invite: `You're invited to join ${data.businessName || "a shop"}`,
    "password-reset": "Reset your password",
    welcome: "Welcome to SA Shop",
    "low-stock": `⚠ Low Stock Alert — ${data.businessName || "Your Shop"}`,
    "invoice-receipt": `Receipt for Invoice ${(data as InvoiceReceiptData).invoiceNumber}`,
  };

  const getHtml = () => {
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
        const rows = d.items.slice(0, 20).map(item => `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.branch}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; color: ${item.quantity === 0 ? "red" : "orange"};">${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${item.threshold}</td>
          </tr>`).join("");
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
        const rows = d.lines.map(line => `
          <tr>
            <td style="padding: 6px; border-bottom: 1px solid #eee;">${line.name}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: center;">${line.quantity}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">SAR ${line.unitPrice.toFixed(2)}</td>
            <td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right;">SAR ${line.total.toFixed(2)}</td>
          </tr>`).join("");
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
    }
  };

  try {
    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: data.to,
      subject: subjectMap[template],
      html: getHtml(),
    });
    return { success: true, data: result };
  } catch (error) {
    console.error("[EMAIL] Send error:", error);
    return { success: false, error };
  }
}

export async function sendLowStockAlert(data: LowStockEmailData) {
  return sendEmail("low-stock", data);
}

export async function sendInvoiceReceipt(data: InvoiceReceiptData) {
  return sendEmail("invoice-receipt", data);
}