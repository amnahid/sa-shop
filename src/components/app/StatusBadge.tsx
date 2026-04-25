import { cn } from "@/lib/utils";

export type StatusVariant = "success" | "neutral" | "info" | "danger" | "warning";

const VARIANT_CLASSES: Record<StatusVariant, string> = {
  success: "bg-green-100 text-green-700",
  neutral: "bg-gray-100 text-gray-700",
  info: "bg-blue-100 text-blue-700",
  danger: "bg-red-100 text-red-700",
  warning: "bg-amber-100 text-amber-700",
};

const STATUS_TO_VARIANT: Record<string, StatusVariant> = {
  completed: "success",
  active: "success",
  paid: "success",
  accepted: "success",
  pending: "neutral",
  draft: "neutral",
  sent: "info",
  refunded: "info",
  voided: "danger",
  cancelled: "danger",
  rejected: "danger",
  failed: "danger",
  "low-stock": "warning",
  warning: "warning",
};

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const resolved =
    variant ?? STATUS_TO_VARIANT[status.toLowerCase()] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize",
        VARIANT_CLASSES[resolved],
        className
      )}
    >
      {status}
    </span>
  );
}
