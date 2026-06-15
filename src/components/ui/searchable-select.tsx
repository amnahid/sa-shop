"use client";

import * as React from "react";
import { Combobox, type ComboboxOption } from "./combobox";

interface SearchableSelectProps {
  name?: string;
  options: ComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
}

export function SearchableSelect({
  name,
  options,
  value: controlledValue,
  onChange,
  defaultValue = "",
  placeholder,
  searchPlaceholder,
  required,
}: SearchableSelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <>
      {name && (
        <input 
          type="hidden" 
          name={name} 
          value={value} 
          required={required} 
        />
      )}
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
