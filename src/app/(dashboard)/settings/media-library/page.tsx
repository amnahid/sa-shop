import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { MediaLibraryClient } from "@/components/settings/MediaLibraryClient";
import { getCurrentMembership } from "@/lib/utils/membership";
import { canAccessPermission } from "@/lib/utils/permissions";
import { MediaAsset } from "@/models";

export default async function MediaLibraryPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  if (!canAccessPermission("settings.media:view", membership.role, membership.permissionOverrides)) {
    redirect("/settings");
  }

  const assets = await MediaAsset.find({ tenantId: membership.tenantId }).sort({
    status: 1,
    createdAt: -1,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        section="Administration"
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Media Library" },
        ]}
        description="Upload and manage reusable media assets for templates and other modules."
      />

      <MediaLibraryClient
        assets={assets.map((asset) => ({
          id: asset._id.toString(),
          name: asset.name,
          fileName: asset.fileName,
          url: asset.url,
          mimeType: asset.mimeType,
          kind: asset.kind,
          sizeBytes: asset.sizeBytes,
          tags: asset.tags,
          altText: asset.altText,
          status: asset.status,
        }))}
      />
    </div>
  );
}
