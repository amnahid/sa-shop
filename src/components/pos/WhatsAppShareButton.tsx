"use client";

import { useState } from "react";
import { sendInvoiceViaWhatsApp } from "@/lib/actions/invoice-whatsapp";
import { buildWaMeLink } from "@/lib/utils/phone";

interface Props {
  invoiceId: string;
  phone: string;
}

export function WhatsAppShareButton({ invoiceId, phone }: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setSending(true);
    setError("");

    const result = await sendInvoiceViaWhatsApp(invoiceId);

    if (result.error) {
      setError(result.error);
      setSending(false);
      return;
    }

    setSent(true);
    setSending(false);
  };

  if (sent) {
    return (
      <p className="text-xs text-green-600 text-center">Sent via WhatsApp</p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          onClick={handleSend}
          disabled={sending}
          className="flex-1 py-2 rounded-md border border-green-300 bg-green-50 text-green-800 text-sm font-medium hover:bg-green-100 disabled:opacity-50"
        >
          {sending ? "Sending..." : "WhatsApp"}
        </button>
        <a
          href={buildWaMeLink(phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 text-center rounded-md border border-input text-sm font-medium hover:bg-accent"
        >
          Share Link
        </a>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
