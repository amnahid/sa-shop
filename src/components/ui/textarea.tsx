import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-md border border-gray-400 bg-white px-4 py-3 text-[13px] font-bold text-gray-800 transition-all outline-none placeholder:text-gray-400 focus:border-primary focus:ring-0 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed aria-invalid:border-danger md:text-sm shadow-sm hover:border-gray-500",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
