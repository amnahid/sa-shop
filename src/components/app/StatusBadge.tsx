import { cn } from "@/lib/utils";

export type StatusVariant = "success" | "neutral" | "info" | "danger" | "warning";

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  success: "bg-soft-success/80 text-success border-success/20",
  neutral: "bg-soft-secondary text-secondary border-secondary/20",
  info: "bg-soft-info/80 text-info border-info/20",
  danger: "bg-soft-danger/80 text-danger border-danger/20",
  warning: "bg-soft-warning/80 text-warning border-warning/20",
};

const STATUS_TO_VARIANT: Record<string, StatusVariant> = {
  completed: "success",
  active: "success",
  ready: "success",
  paid: "success",
  posted: "success",
  draft: "neutral",
  pending: "warning",
  void: "danger",
  deleted: "danger",
  inactive: "neutral",
  suspended: "danger",
  low_stock: "warning",
  out_of_stock: "danger",
  failed: "danger",
  critical: "danger",
};

interface StatusBadgeProps {
  status: string;
  className?: string;
  variant?: StatusVariant;
}

export function StatusBadge({ status, className, variant }: StatusBadgeProps) {
  const resolved = variant || STATUS_TO_VARIANT[status.toLowerCase()] || "neutral";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        VARIANT_CLASSES[resolved],
        className
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
