import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label 
        htmlFor={htmlFor}
        className="ml-0.5 text-[11px] font-black uppercase tracking-widest text-gray-700"
      >
        {label}
        {required && <span className="ml-1 text-danger font-black">*</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="ml-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-tight">{hint}</p>
      )}
      {error && <p className="ml-0.5 text-[10px] font-black text-danger uppercase tracking-tight">{error}</p>}
    </div>
  );
}
