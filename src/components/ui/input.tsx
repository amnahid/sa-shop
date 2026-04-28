import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-gray-300 bg-white px-4 text-[13px] font-bold text-gray-800 transition-all outline-none placeholder:text-gray-400 placeholder:font-medium focus:border-primary focus:ring-0 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed aria-invalid:border-danger md:text-sm shadow-sm hover:border-gray-400",
        className
      )}
      {...props}
    />
  )
}

export { Input }
