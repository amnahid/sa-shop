"use client";

import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";

interface PrintPageProps {
  children: ReactNode;
  format: "a4" | "thermal-80" | "thermal-58";
  backUrl?: string;
}

export function PrintPage({ children, format, backUrl }: PrintPageProps) {
  const router = useRouter();
  const [printTriggered, setPrintTriggered] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const triggerPrint = useCallback(() => {
    if (printTriggered) return;
    setPrintTriggered(true);

    setTimeout(() => {
      window.print();
    }, 500);

    setTimeout(() => {
      setShowFallback(true);
    }, 3000);
  }, [printTriggered]);

  useEffect(() => {
    triggerPrint();
  }, [triggerPrint]);

  const formatClass =
    format === "a4" ? "print-a4" :
    format === "thermal-80" ? "print-thermal-80" :
    "print-thermal-58";

  return (
    <div className={`print-mode ${formatClass}`}>
      {children}

      <div className="print-mode-ui no-print">
        {showFallback && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex items-center justify-center gap-3 shadow-lg z-50">
            <button
              onClick={triggerPrint}
              className="px-6 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
            >
              Click here if print dialog didn&apos;t open
            </button>
            <button
              onClick={() => backUrl ? router.push(backUrl) : router.back()}
              className="px-6 py-2 rounded-md border border-input text-sm font-medium"
            >
              ← Back
            </button>
          </div>
        )}
        {!showFallback && (
          <div className="fixed bottom-4 right-4 no-print">
            <button
              onClick={() => backUrl ? router.push(backUrl) : router.back()}
              className="px-4 py-2 rounded-md bg-white border border-input text-sm font-medium shadow-md"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
