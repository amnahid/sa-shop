import assert from "node:assert/strict";
import test from "node:test";
import {
  canMutateAccountingEntry,
  canTransitionAccountingEntryStatus,
} from "@/models/accounting/AccountingEntry";

test("accounting entry status transitions only allow legal lifecycle moves", () => {
  assert.equal(canTransitionAccountingEntryStatus("draft", "draft"), true);
  assert.equal(canTransitionAccountingEntryStatus("draft", "posted"), true);
  assert.equal(canTransitionAccountingEntryStatus("draft", "void"), true);
  assert.equal(canTransitionAccountingEntryStatus("posted", "void"), true);

  assert.equal(canTransitionAccountingEntryStatus("posted", "draft"), false);
  assert.equal(canTransitionAccountingEntryStatus("void", "draft"), false);
  assert.equal(canTransitionAccountingEntryStatus("void", "posted"), false);
});

test("posted accounting entries reject non-void mutations", () => {
  assert.equal(canMutateAccountingEntry("posted", "posted", ["notes"]), false);
  assert.equal(canMutateAccountingEntry("posted", "draft", ["status"]), false);
  assert.equal(canMutateAccountingEntry("posted", "void", ["status", "notes"]), false);

  assert.equal(canMutateAccountingEntry("posted", "void", ["status", "voidedAt", "voidedById"]), true);
});
