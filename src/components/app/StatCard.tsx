import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Tailwind safelist (these classes are used dynamically in VARIANT_CLASSES below):
// from-orange-50 to-orange-100 border-orange-200 text-orange-700
// from-teal-50 to-teal-100 border-teal-200 text-teal-700
// from-emerald-50 to-emerald-100 border-emerald-200 text-emerald-700
// from-rose-50 to-rose-100 border-rose-200 text-rose-700

export type StatCardVariant = "orange" | "teal" | "emerald" | "rose";

const VARIANT_CLASSES: Record<StatCardVariant, { bg: string; border: string; text: string }> = {
  orange: {
    bg: "bg-gradient-to-r from-orange-50 to-orange-100",
    border: "border-orange-200",
    text: "text-orange-700",
  },
  teal: {
    bg: "bg-gradient-to-r from-teal-50 to-teal-100",
    border: "border-teal-200",
    text: "text-teal-700",
  },
  emerald: {
    bg: "bg-gradient-to-r from-emerald-50 to-emerald-100",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
  rose: {
    bg: "bg-gradient-to-r from-rose-50 to-rose-100",
    border: "border-rose-200",
    text: "text-rose-700",
  },
};

interface StatCardProps {
  variant: StatCardVariant;
  label: string;
  value: string | number;
  subLabel?: string;
  icon?: LucideIcon;
  href?: string;
}

export function StatCard({
  variant,
  label,
  value,
  subLabel,
  icon: Icon,
  href,
}: StatCardProps) {
  const v = VARIANT_CLASSES[variant];
  const inner = (
    <div
      className={cn(
        "rounded-lg border p-6 shadow-sm transition-shadow",
        v.bg,
        v.border,
        href && "hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className={cn("text-sm font-medium tracking-tight", v.text)}>
            {label}
          </p>
          <p className={cn("text-2xl font-bold", v.text)}>{value}</p>
          {subLabel && <p className={cn("text-sm opacity-80", v.text)}>{subLabel}</p>}
        </div>
        {Icon && <Icon className={cn("size-6 opacity-80", v.text)} />}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
