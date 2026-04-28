import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatCardVariant = "primary" | "info" | "success" | "warning" | "danger";

const VARIANT_CLASSES: Record<StatCardVariant, { bg: string; text: string }> = {
  primary: {
    bg: "bg-gradient-to-br from-[#377dff] to-[#75a4ff]",
    text: "text-white",
  },
  info: {
    bg: "bg-gradient-to-br from-[#25bcf1] to-[#69d4f6]",
    text: "text-white",
  },
  success: {
    bg: "bg-gradient-to-br from-[#0abb75] to-[#4dd4a5]",
    text: "text-white",
  },
  warning: {
    bg: "bg-gradient-to-br from-[#ffc519] to-[#ffd75d]",
    text: "text-white",
  },
  danger: {
    bg: "bg-gradient-to-br from-[#ef486a] to-[#f4859a]",
    text: "text-white",
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
        "relative overflow-hidden rounded-xl p-6 shadow-sm transition-all duration-200",
        v.bg,
        v.text,
        href && "hover:-translate-y-1 hover:shadow-md active:scale-[0.98]"
      )}
    >
      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">
            {label}
          </p>
          <p className="text-3xl font-extrabold tracking-tight">{value}</p>
          {subLabel && <p className="mt-2 text-[13px] font-medium opacity-90">{subLabel}</p>}
        </div>
        {Icon && (
          <div className="rounded-lg bg-white/20 p-2 backdrop-blur-sm">
            <Icon className="size-5" />
          </div>
        )}
      </div>
      
      {/* Decorative Wave-like circles (based on screenshot style) */}
      <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-black/5 blur-xl" />
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}
