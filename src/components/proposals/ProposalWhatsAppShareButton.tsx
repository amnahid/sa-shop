"use client";

import { useState } from "react";
import { sendProposalViaWhatsApp } from "@/lib/actions/proposal-whatsapp";
import { buildWaMeLink } from "@/lib/utils/phone";

interface Props {
  proposalId: string;
  phone: string;
}

export function ProposalWhatsAppShareButton({ proposalId, phone }: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    setSending(true);
    setError("");

    const result = await sendProposalViaWhatsApp(proposalId);

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
      <span className="text-sm text-green-600 font-medium">Sent via WhatsApp</span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={handleSend}
        disabled={sending}
        className="rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100 disabled:opacity-50"
      >
        {sending ? "Sending..." : "Send via WhatsApp"}
      </button>
      <a
        href={buildWaMeLink(phone)}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        Share Link
      </a>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
