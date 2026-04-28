import assert from "node:assert/strict";
import test from "node:test";
import {
  exportLedgerByAccountCsv,
  exportProfitAndLossSummaryCsv,
  exportTrialBalanceCsv,
} from "@/lib/utils/csv-export";
import { getClosedPeriodGuardError, parseAccountingPeriodKey } from "@/lib/utils/accounting-periods";

test("accounting export CSVs include expected headers and totals", () => {
  const trialBalanceCsv = exportTrialBalanceCsv({
    rows: [
      {
        accountCode: "4100",
        accountName: "Sales Revenue",
        accountType: "revenue",
        debit: 0,
        credit: 1250.5,
        balance: -1250.5,
      },
    ],
    totalDebit: 0,
    totalCredit: 1250.5,
  });
  assert.match(trialBalanceCsv, /Account Code,Account Name,Type,Debit,Credit,Balance/);
  assert.match(trialBalanceCsv, /TOTAL,,,0,1250.5,-1250.5/);

  const ledgerCsv = exportLedgerByAccountCsv({
    account: { code: "1100", name: "Cash on Hand", type: "asset" },
    openingBalance: 500,
    closingBalance: 800,
    periodDebit: 300,
    periodCredit: 0,
    rows: [
      {
        entryDate: new Date("2025-02-10T00:00:00.000Z"),
        kind: "revenue",
        counterpartyName: "Walk-in",
        referenceId: "INV-1",
        notes: "POS sale",
        debit: 300,
        credit: 0,
        runningBalance: 800,
      },
    ],
  });
  assert.match(ledgerCsv, /Date,Type,Counterparty,Reference,Notes,Debit,Credit,Running Balance/);
  assert.match(ledgerCsv, /Period Totals,300,0,800/);

  const pnlCsv = exportProfitAndLossSummaryCsv({
    revenueByAccount: [{ accountCode: "4100", accountName: "Sales", total: 1000 }],
    expenseByAccount: [{ accountCode: "5100", accountName: "Rent", total: 300 }],
    totalRevenue: 1000,
    totalExpense: 300,
    netProfit: 700,
  });
  assert.match(pnlCsv, /Section,Account Code,Account Name,Amount/);
  assert.match(pnlCsv, /TOTAL,Net Profit\/Loss,,700/);
});

test("closed period guard blocks edits for dates inside closed period bounds", () => {
  const parsed = parseAccountingPeriodKey("2025-02");
  assert.equal("error" in parsed, false);
  if ("error" in parsed) return;

  const guardError = getClosedPeriodGuardError(new Date("2025-02-14T10:00:00.000Z"), [
    {
      periodKey: parsed.periodKey,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
    },
  ]);
  assert.equal(
    guardError,
    "Accounting period 2025-02 is closed and cannot be modified"
  );

  const openDateError = getClosedPeriodGuardError(new Date("2025-03-01T00:00:00.000Z"), [
    {
      periodKey: parsed.periodKey,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
    },
  ]);
  assert.equal(openDateError, null);
});
