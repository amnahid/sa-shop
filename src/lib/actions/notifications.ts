"use server";

import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { InboxEntry } from "@/models";
import { getSessionMembership } from "@/lib/utils/server-authorization";

function ensureObjectId(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

export async function getUnreadNotificationCount() {
  const auth = await getSessionMembership();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const unreadCount = await InboxEntry.countDocuments({
    tenantId: auth.membership.tenantId,
    recipientUserId: new mongoose.Types.ObjectId(auth.sessionUserId),
    status: "unread",
  });

  return { unreadCount };
}

export async function markNotificationRead(formData: FormData) {
  const auth = await getSessionMembership();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const id = (formData.get("notificationId") as string | null)?.trim() || "";
  const objectId = ensureObjectId(id);
  if (!objectId) {
    return { error: "Invalid notification" };
  }

  await InboxEntry.findOneAndUpdate(
    {
      _id: objectId,
      tenantId: auth.membership.tenantId,
      recipientUserId: new mongoose.Types.ObjectId(auth.sessionUserId),
    },
    {
      status: "read",
      readAt: new Date(),
    }
  );

  revalidatePath("/notifications");
  return { success: true };
}

export async function markNotificationUnread(formData: FormData) {
  const auth = await getSessionMembership();
  if ("error" in auth) {
    return { error: auth.error };
  }

  const id = (formData.get("notificationId") as string | null)?.trim() || "";
  const objectId = ensureObjectId(id);
  if (!objectId) {
    return { error: "Invalid notification" };
  }

  await InboxEntry.findOneAndUpdate(
    {
      _id: objectId,
      tenantId: auth.membership.tenantId,
      recipientUserId: new mongoose.Types.ObjectId(auth.sessionUserId),
    },
    {
      status: "unread",
      $unset: { readAt: 1 },
    }
  );

  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllNotificationsRead() {
  const auth = await getSessionMembership();
  if ("error" in auth) {
    return { error: auth.error };
  }

  await InboxEntry.updateMany(
    {
      tenantId: auth.membership.tenantId,
      recipientUserId: new mongoose.Types.ObjectId(auth.sessionUserId),
      status: "unread",
    },
    {
      status: "read",
      readAt: new Date(),
    }
  );

  revalidatePath("/notifications");
  return { success: true };
}

