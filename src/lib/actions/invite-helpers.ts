type InvitationRecord = {
  acceptedAt?: Date | null;
  revokedAt?: Date | null;
  expiresAt: Date;
};

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export function getInvitationStatus(invitation: InvitationRecord, now = new Date()): InvitationStatus {
  if (invitation.acceptedAt) return "accepted";
  if (invitation.revokedAt) return "revoked";
  if (invitation.expiresAt <= now) return "expired";
  return "pending";
}
