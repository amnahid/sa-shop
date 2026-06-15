"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { getAttendanceHistory } from "@/lib/actions/hr";
import { StatusBadge } from "@/components/app/StatusBadge";

interface AttendanceRecord {
  id: string;
  date: Date;
  status: string;
  note?: string;
}

interface AttendanceHistoryDialogProps {
  userId: string;
  userName: string;
}

export function AttendanceHistoryDialog({ userId, userName }: AttendanceHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const loadHistory = async () => {
    setLoading(true);
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30); // Last 30 days

    try {
      const data = await getAttendanceHistory(userId, from, to);
      if (Array.isArray(data)) {
        setRecords(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (val) loadHistory();
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="xs" className="h-8 w-8 p-0">
          <History className="size-3.5 text-gray-400 hover:text-primary transition-colors" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-primary" />
            Attendance History: {userName}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-3 max-h-[350px] overflow-y-auto pe-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-primary/50" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400 font-medium italic">No attendance records for the last 30 days.</p>
          ) : (
            records.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50/30">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-bold text-gray-700">
                    {new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  {r.note && (
                    <span className="text-[10px] text-gray-400 font-medium italic truncate max-w-[180px]">
                      &quot;{r.note}&quot;
                    </span>
                  )}
                </div>
                <StatusBadge 
                  status={r.status} 
                  variant={r.status === "present" ? "success" : "warning"} 
                />
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
