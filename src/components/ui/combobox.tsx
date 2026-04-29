"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchPlaceholder] = React.useState("");

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-11 w-full justify-between border-gray-400 bg-white px-4 text-[13px] font-bold text-gray-800 hover:border-gray-500 hover:bg-white",
            !value && "text-gray-400 font-medium",
            className
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 shadow-lg" align="start">
        <div className="flex flex-col min-h-0 max-h-[300px]">
          <div className="flex items-center border-b border-gray-100 px-3 sticky top-0 bg-white z-10">
            <Search className="mr-2 size-4 shrink-0 text-gray-400" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchPlaceholder(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <p className="py-6 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                {emptyText}
              </p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-sm py-2 px-3 text-[13px] font-bold outline-none transition-colors hover:bg-soft-primary hover:text-primary",
                    value === option.value ? "bg-soft-primary text-primary" : "text-gray-700"
                  )}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                    setSearchPlaceholder("");
                  }}
                >
                  <span className="truncate flex-1 text-left">{option.label}</span>
                  {value === option.value && (
                    <Check className="ml-2 size-4 shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
