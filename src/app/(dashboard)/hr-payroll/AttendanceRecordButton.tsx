"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { recordAttendance } from "@/lib/actions/hr";
import { useToast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

interface AttendanceRecordButtonProps {
  userId: string;
  currentStatus?: string;
}

export function AttendanceRecordButton({ userId, currentStatus }: AttendanceRecordButtonProps) {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleRecord = async (status: string) => {
    setLoading(true);
    try {
      const result = await recordAttendance(userId, new Date(), status);
      if ("error" in result) {
        showToast(result.error || "Failed to record attendance", "error");
      } else {
        showToast(`Recorded as ${status}`, "success");
      }
    } catch {
      showToast("An error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-1 justify-center">
      <Button
        size="xs"
        variant={currentStatus === "present" ? "soft-success" : "outline"}
        disabled={loading}
        onClick={() => handleRecord("present")}
      >
        {loading ? <Loader2 className="size-3 animate-spin" /> : "Present"}
      </Button>
      <Button
        size="xs"
        variant={currentStatus === "absent" ? "destructive" : "outline"}
        disabled={loading}
        onClick={() => handleRecord("absent")}
      >
        Absent
      </Button>
    </div>
  );
}
