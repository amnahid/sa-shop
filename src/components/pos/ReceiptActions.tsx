"use client";

import Link from "next/link";
import { WhatsAppShareButton } from "@/components/pos/WhatsAppShareButton";

interface Props {
  invoiceId: string;
  customerPhone: string | null;
}

export function ReceiptActions({ invoiceId, customerPhone }: Props) {
  return (
    <div className="p-4 border-t flex flex-col gap-2 no-print">
      <div className="flex gap-2">
        <Link
          href="/pos"
          className="flex-1 text-center py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          New Sale
        </Link>
        <button
          onClick={() => window.print()}
          className="flex-1 py-2 rounded-md border border-input text-sm font-medium"
        >
          Print
        </button>
      </div>

      {customerPhone && (
        <WhatsAppShareButton
          invoiceId={invoiceId}
          phone={customerPhone}
        />
      )}

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
          }
          .receipt-page-shell,
          .min-h-screen {
            min-height: auto !important;
            padding: 0 !important;
          }
          .max-w-sm {
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
