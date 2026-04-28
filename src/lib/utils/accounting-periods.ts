export type ClosedPeriodBounds = {
  periodKey: string;
  periodStart: Date;
  periodEnd: Date;
};

export type ParsedAccountingPeriod =
  | {
      periodKey: string;
      periodStart: Date;
      periodEnd: Date;
    }
  | { error: string };

export function parseAccountingPeriodKey(periodKeyRaw: string): ParsedAccountingPeriod {
  const periodKey = periodKeyRaw.trim();
  const match = /^(\d{4})-(\d{2})$/.exec(periodKey);
  if (!match) {
    return { error: "Accounting period must be in YYYY-MM format" };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 2000 || year > 2100) {
    return { error: "Accounting period year is out of range" };
  }
  if (month < 1 || month > 12) {
    return { error: "Accounting period month is invalid" };
  }

  const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { periodKey, periodStart, periodEnd };
}

export function isDateWithinPeriod(date: Date, periodStart: Date, periodEnd: Date) {
  return date >= periodStart && date <= periodEnd;
}

export function findClosedPeriodForDate(
  entryDate: Date,
  closedPeriods: ClosedPeriodBounds[]
): ClosedPeriodBounds | null {
  return (
    closedPeriods.find((period) =>
      isDateWithinPeriod(entryDate, period.periodStart, period.periodEnd)
    ) || null
  );
}

export function getClosedPeriodGuardError(entryDate: Date, closedPeriods: ClosedPeriodBounds[]) {
  const closedPeriod = findClosedPeriodForDate(entryDate, closedPeriods);
  if (!closedPeriod) return null;
  return `Accounting period ${closedPeriod.periodKey} is closed and cannot be modified`;
}
