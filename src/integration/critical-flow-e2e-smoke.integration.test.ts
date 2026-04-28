import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { Invoice, Proposal, Retainer } from "@/models";

function read(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("critical flow handoff contracts keep proposal and retainer context tenant-scoped", () => {
  const proposalsAction = read("src/lib/actions/proposals.ts");
  const retainersAction = read("src/lib/actions/retainers.ts");
  const posPage = read("src/app/(dashboard)/pos/page.tsx");

  assert.match(proposalsAction, /status !== "accepted" && proposal\.status !== "converted"/);
  assert.match(proposalsAction, /redirectTo:\s*`\/pos\?proposalId=\$\{proposal\._id\.toString\(\)\}`/);

  assert.match(retainersAction, /proposalId:\s*linkedProposalId/);
  assert.match(retainersAction, /proposal\.customerId && proposal\.customerId\.toString\(\) !== customerId/);
  assert.match(retainersAction, /proposal\.branchId\.toString\(\) !== branchId/);
  assert.match(retainersAction, /redirectTo:\s*`\/pos\?retainerId=\$\{retainer\._id\.toString\(\)\}`/);

  assert.match(posPage, /Proposal\.findOne\(\{ _id: proposalId, tenantId \}\)/);
  assert.match(posPage, /Retainer\.findOne\(\{ _id: retainerId, tenantId, status: "active" \}\)/);
  assert.match(posPage, /sourceRetainer={[\s\S]*remainingAmount: retainerRemaining/);
});

test("critical flow checkout persists invoice-retainer linkage and safe retainer consumption", () => {
  const posAction = read("src/lib/actions/pos.ts");
  const posClient = read("src/components/pos/POSClient.tsx");

  assert.match(posAction, /Retainer\.findOne\(\{[\s\S]*tenantId,[\s\S]*status: "active"/);
  assert.match(posAction, /if \(grandTotal > retainerRemaining\)/);
  assert.match(posAction, /if \(resolvedCustomerId && resolvedCustomerId !== retainer\.customerId\.toString\(\)\)/);

  assert.match(
    posAction,
    /Invoice\.create\([\s\S]*tenantId,[\s\S]*retainerId:\s*sourceRetainer\?\._id,[\s\S]*lines:\s*invoiceLines/
  );
  assert.match(posAction, /Retainer\.findByIdAndUpdate\(sourceRetainer\._id, \{[\s\S]*consumedAmount:[\s\S]*status: shouldClose \? "closed" : "active"/);
  assert.match(posAction, /\$push:\s*\{[\s\S]*invoiceId,[\s\S]*invoiceNumber,[\s\S]*amount:[\s\S]*consumedById/);

  assert.match(posClient, /fd\.set\("retainerId", sourceRetainer\?\._id \|\| ""\)/);
});

test("critical flow invoice visibility and reports remain tenant-safe", () => {
  const invoiceDetailPage = read("src/app/(dashboard)/pos/invoices/[id]/page.tsx");
  const reportsAction = read("src/lib/actions/reports.ts");
  const accountingAction = read("src/lib/actions/accounting.ts");

  assert.match(invoiceDetailPage, /Invoice\.findOne\(\{[\s\S]*_id: id,[\s\S]*tenantId: membership\.tenantId/);
  assert.match(invoiceDetailPage, /invoice\.retainerId\s*\?\s*await Retainer\.findById\(invoice\.retainerId\)/);

  assert.match(reportsAction, /const match: Record<string, unknown> = \{[\s\S]*tenantId: tenantOid,[\s\S]*status: "completed"/);
  assert.match(reportsAction, /const \[summary, hourly, byBranch\] = await Promise\.all\(/);

  assert.match(accountingAction, /const match: Record<string, unknown> = \{[\s\S]*tenantId: tenantOid,[\s\S]*status: "posted"/);
  assert.match(accountingAction, /tenantId: tenantOid/);

  assert.ok(Proposal.schema.path("tenantId"));
  assert.ok(Retainer.schema.path("proposalId"));
  assert.ok(Invoice.schema.path("retainerId"));
  assert.deepEqual(
    Invoice.schema
      .indexes()
      .some(([spec]) => spec.tenantId === 1 && spec.retainerId === 1),
    true
  );
});
