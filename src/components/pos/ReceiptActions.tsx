"use client";

import Link from "next/link";

export function ReceiptActions() {
  return (
    <div className="p-4 border-t flex gap-2 no-print">
      <Link
        href="/pos"
        className="flex-1 text-center py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
      >
        New Sale
      </Link>
      <button
        onClick={() => window.print()}
        className="flex-1 py-2 rounded-md border border-gray-300 text-sm font-medium"
      >
        Print
      </button>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
          }
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
