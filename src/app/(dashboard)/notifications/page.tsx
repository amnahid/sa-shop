import Link from "next/link";
import { redirect } from "next/navigation";
import mongoose from "mongoose";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { InboxEntry } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";
import { canAccessPermission } from "@/lib/utils/permissions";
import {
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
} from "@/lib/actions/notifications";

interface NotificationsPageProps {
  searchParams: Promise<{ status?: "all" | "unread" | "read" }>;
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  if (!canAccessPermission("notifications:view", membership.role, membership.permissionOverrides)) {
    redirect("/");
  }

  const { status = "all" } = await searchParams;
  const resolvedStatus = status === "read" || status === "unread" ? status : "all";

  const query: {
    tenantId: mongoose.Types.ObjectId;
    recipientUserId: mongoose.Types.ObjectId;
    status?: "read" | "unread";
  } = {
    tenantId: membership.tenantId,
    recipientUserId: membership.userId as mongoose.Types.ObjectId,
  };

  if (resolvedStatus !== "all") {
    query.status = resolvedStatus;
  }

  const [entries, unreadCount] = await Promise.all([
    InboxEntry.find(query).sort({ createdAt: -1 }).limit(100).lean(),
    InboxEntry.countDocuments({
      tenantId: membership.tenantId,
      recipientUserId: membership.userId,
      status: "unread",
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        section="Workspace"
        breadcrumbs={[{ label: "Notifications" }]}
        description="Track system events and alerts for your account."
        actions={
          <form
            action={async () => {
              "use server";
              await markAllNotificationsRead();
            }}
          >
            <Button type="submit" variant="outline" disabled={unreadCount === 0}>
              Mark all as read
            </Button>
          </form>
        }
      />

      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant={resolvedStatus === "all" ? "default" : "outline"} size="sm">
            <Link href="/notifications">All</Link>
          </Button>
          <Button asChild variant={resolvedStatus === "unread" ? "default" : "outline"} size="sm">
            <Link href="/notifications?status=unread">Unread</Link>
          </Button>
          <Button asChild variant={resolvedStatus === "read" ? "default" : "outline"} size="sm">
            <Link href="/notifications?status=read">Read</Link>
          </Button>
          <span className="ml-auto text-xs font-semibold text-muted-foreground">
            {unreadCount} unread
          </span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-sm text-muted-foreground">
          No notifications found.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry._id.toString()}
              className={`rounded-lg border p-4 ${
                entry.status === "unread" ? "border-primary/30 bg-soft-primary" : "bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{entry.title}</p>
                  <p className="text-sm text-muted-foreground">{entry.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                  {entry.linkUrl ? (
                    <Link href={entry.linkUrl} className="text-xs font-semibold text-primary hover:underline">
                      Open related item
                    </Link>
                  ) : null}
                </div>
                <form
                  action={async (formData) => {
                    "use server";
                    if (entry.status === "unread") {
                      await markNotificationRead(formData);
                      return;
                    }
                    await markNotificationUnread(formData);
                  }}
                  className="shrink-0"
                >
                  <input type="hidden" name="notificationId" value={entry._id.toString()} />
                  <Button type="submit" variant="outline" size="sm">
                    {entry.status === "unread" ? "Mark read" : "Mark unread"}
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
