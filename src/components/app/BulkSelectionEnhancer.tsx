"use client";

import { useEffect, useRef } from "react";

interface BulkSelectionEnhancerProps {
  selectionInputName: string;
}

export function BulkSelectionEnhancer({ selectionInputName }: BulkSelectionEnhancerProps) {
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = anchorRef.current?.closest("form");
    if (!form) return;

    const getRowCheckboxes = () =>
      Array.from(
        form.querySelectorAll<HTMLInputElement>(
          `[data-bulk-row-checkbox="true"][data-selection-name="${selectionInputName}"]`
        )
      );

    const selectAll = form.querySelector<HTMLInputElement>(
      `[data-bulk-select-all="true"][data-selection-name="${selectionInputName}"]`
    );
    const selectedCount = form.querySelector<HTMLElement>(
      `[data-bulk-selected-count][data-selection-name="${selectionInputName}"]`
    );
    const bulkButtons = Array.from(
      form.querySelectorAll<HTMLButtonElement>(
        `[data-bulk-action="true"][data-selection-name="${selectionInputName}"]`
      )
    );

    const updateUi = () => {
      const rowCheckboxes = getRowCheckboxes();
      const checkedCount = rowCheckboxes.filter((checkbox) => checkbox.checked).length;
      const hasSelection = checkedCount > 0;
      const allSelected = rowCheckboxes.length > 0 && checkedCount === rowCheckboxes.length;

      if (selectedCount) {
        selectedCount.textContent = String(checkedCount);
      }

      if (selectAll) {
        selectAll.checked = allSelected;
        selectAll.indeterminate = hasSelection && !allSelected;
        selectAll.setAttribute(
          "aria-checked",
          selectAll.indeterminate ? "mixed" : allSelected ? "true" : "false"
        );
      }

      for (const button of bulkButtons) {
        if (button.dataset.requiresSelection === "true") {
          button.disabled = !hasSelection;
        }
      }
    };

    const rowCheckboxes = getRowCheckboxes();
    const onRowChange = () => updateUi();
    const onSelectAllChange = () => {
      if (!selectAll) return;
      const checked = selectAll.checked;
      for (const checkbox of getRowCheckboxes()) {
        checkbox.checked = checked;
      }
      updateUi();
    };

    for (const checkbox of rowCheckboxes) {
      checkbox.addEventListener("change", onRowChange);
    }
    selectAll?.addEventListener("change", onSelectAllChange);

    updateUi();

    return () => {
      for (const checkbox of rowCheckboxes) {
        checkbox.removeEventListener("change", onRowChange);
      }
      selectAll?.removeEventListener("change", onSelectAllChange);
    };
  }, [selectionInputName]);

  return <div ref={anchorRef} className="hidden" aria-hidden="true" />;
}
