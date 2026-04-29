"use client";

import * as React from "react";
import { Combobox, type ComboboxOption } from "./combobox";

interface SearchableSelectProps {
  name: string;
  options: ComboboxOption[];
  defaultValue?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  onValueChange?: (value: string) => void;
}

export function SearchableSelect({
  name,
  options,
  defaultValue = "",
  placeholder,
  searchPlaceholder,
  required,
  onValueChange,
}: SearchableSelectProps) {
  const [value, setValue] = React.useState(defaultValue);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <>
      <input 
        type="hidden" 
        name={name} 
        value={value} 
        required={required} 
      />
      <Combobox
        options={options}
        value={value}
        onValueChange={handleValueChange}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
      />
    </>
  );
}
