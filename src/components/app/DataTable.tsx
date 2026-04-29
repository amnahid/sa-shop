import type { ComponentProps, ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BulkSelectionEnhancer } from "./BulkSelectionEnhancer";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render: (row: T) => ReactNode;
}

export interface DataTableBulkAction {
  key: string;
  label: string;
  action: (formData: FormData) => void | Promise<void>;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  requiresSelection?: boolean;
}

export interface DataTableBulkOptions<T> {
  actions: DataTableBulkAction[];
  selectionName?: string;
  getRowLabel?: (row: T) => string;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: { title: string; description?: string; action?: ReactNode };
  bulk?: DataTableBulkOptions<T>;
  className?: string;
  noCard?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  bulk,
  className,
  noCard = false,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className={cn(!noCard && "card bg-white overflow-hidden", className)}>
        <EmptyState
          title={empty?.title ?? "No data yet"}
          description={empty?.description}
          action={empty?.action}
        />
      </div>
    );
  }

  const hasBulkActions = !!bulk && bulk.actions.length > 0;
  const selectionName = bulk?.selectionName ?? "selectedRowIds";
  const getRowLabel = bulk?.getRowLabel ?? (() => "row");

  const tableContent = (
    <Table>
      <TableHeader className="bg-[#f9fafb]">
        <TableRow className="hover:bg-transparent border-b border-gray-100">
          {hasBulkActions && (
            <TableHead className="w-12 px-6">
              <label className="inline-flex items-center">
                <span className="sr-only">Select all rows</span>
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  data-bulk-select-all="true"
                  data-selection-name={selectionName}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
              </label>
            </TableHead>
          )}
          {columns.map((col, idx) => (
            <TableHead
              key={col.key}
              className={cn(
                "h-12 px-6 text-[11px] font-extrabold uppercase tracking-widest text-gray-500",
                col.align === "right"
                  ? "text-right"
                  : col.align === "center"
                  ? "text-center"
                  : "",
                idx === 0 && !hasBulkActions && "pl-8"
              )}
            >
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const id = rowKey(row);
          const rowLabel = getRowLabel(row);

          return (
            <TableRow key={id} className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              {hasBulkActions && (
                <TableCell className="w-12 px-6">
                  <label className="inline-flex items-center">
                    <span className="sr-only">{`Select ${rowLabel}`}</span>
                    <input
                      type="checkbox"
                      name={selectionName}
                      value={id}
                      aria-label={`Select ${rowLabel}`}
                      data-bulk-row-checkbox="true"
                      data-selection-name={selectionName}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                  </label>
                </TableCell>
              )}
              {columns.map((col, idx) => (
                <TableCell
                  key={col.key}
                  className={cn(
                    "px-6 py-4 text-[13px] font-medium text-gray-700",
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "",
                    idx === 0 && !hasBulkActions && "pl-8"
                  )}
                >
                  {col.render(row)}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className={cn(!noCard && "card bg-white overflow-hidden", className)}>
      {hasBulkActions ? (
        <form className="space-y-0">
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-[#f8f9fa] px-6 py-3">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">
              <span data-bulk-selected-count data-selection-name={selectionName} className="font-black">
                0
              </span>{" "}
              Items selected
            </p>
            <div className="ml-auto flex flex-wrap gap-2">
              {bulk.actions.map((action) => (
                <Button
                  key={action.key}
                  type="submit"
                  size="xs"
                  variant={action.variant ?? "secondary"}
                  formAction={action.action}
                  data-bulk-action="true"
                  data-requires-selection={action.requiresSelection !== false ? "true" : "false"}
                  data-selection-name={selectionName}
                  className="h-8 font-black uppercase tracking-widest text-[9px]"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            {tableContent}
          </div>
          <BulkSelectionEnhancer selectionInputName={selectionName} />
        </form>
      ) : (
        <div className="overflow-x-auto">
          {tableContent}
        </div>
      )}
    </div>
  );
}
