"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { generatePayroll } from "@/lib/actions/hr";
import { useToast } from "@/components/ui/toast";
import { Wallet, Loader2 } from "lucide-react";

export function GeneratePayrollButton() {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleGenerate = async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    if (!confirm(`Generate payroll for ${month}/${year}?`)) return;

    setLoading(true);
    try {
      const result = await generatePayroll(month, year);
      if ("error" in result) {
        showToast(result.error || "Failed to generate payroll", "error");
      } else {
        showToast("Payroll generated successfully", "success");
      }
    } catch {
      showToast("An error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleGenerate} disabled={loading} size="sm">
      {loading ? (
        <Loader2 className="size-4 me-2 animate-spin" />
      ) : (
        <Wallet className="size-4 me-2" />
      )}
      Generate Monthly Payroll
    </Button>
  );
}
