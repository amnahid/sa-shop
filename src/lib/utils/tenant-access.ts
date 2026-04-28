import mongoose from "mongoose";

type TenantIdentifier = string | mongoose.Types.ObjectId | { toString(): string };

export function isTenantAccessible(currentTenantId: TenantIdentifier, requestedTenantId: TenantIdentifier) {
  return currentTenantId.toString() === requestedTenantId.toString();
}
