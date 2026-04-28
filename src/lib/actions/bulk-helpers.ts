export interface BulkMutationSummary {
  requested: number;
  processed: number;
  skipped?: number;
  failed?: number;
  errors?: string[];
}

export function getBulkSelectedIds(formData: FormData, selectionName = "selectedRowIds") {
  const selectedIds = formData.getAll(selectionName);
  const uniqueIds = new Set<string>();

  for (const value of selectedIds) {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) continue;
    uniqueIds.add(normalized);
  }

  return Array.from(uniqueIds);
}

export function buildBulkActionMessage({
  requested,
  processed,
  skipped = 0,
  failed = 0,
  errors = [],
}: BulkMutationSummary) {
  const segments = [`Processed ${processed} of ${requested} selected items.`];

  if (skipped > 0) segments.push(`${skipped} skipped.`);
  if (failed > 0) segments.push(`${failed} failed.`);

  const normalizedErrors = errors.map((error) => error.trim()).filter(Boolean);
  if (normalizedErrors.length > 0) {
    segments.push(normalizedErrors.join(" "));
  }

  return segments.join(" ");
}
