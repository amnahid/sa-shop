import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Membership, User } from "@/models";
import { updateProfile, changePassword } from "@/lib/actions/team";
import { canAccessPermission } from "@/lib/utils/permissions";

interface ProfilePageProps {
  searchParams: Promise<{ error?: string; success?: string; form?: string }>;
}

const formLabelByKey: Record<string, string> = {
  profile: "Personal information",
  password: "Password",
};

function getFeedbackMessage(error: string, fieldErrors?: Record<string, string[]>) {
  const firstFieldError = Object.values(fieldErrors ?? {}).find((messages) => messages?.length)?.[0];
  return firstFieldError ?? error;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await User.findById(session.user.id);
  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!user) {
    redirect("/login");
  }

  if (
    !membership ||
    !canAccessPermission("settings.profile:view", membership.role, membership.permissionOverrides)
  ) {
    redirect("/");
  }

  const canViewMediaLibrary = canAccessPermission(
    "settings.media:view",
    membership.role,
    membership.permissionOverrides
  );
  const { error, success, form } = await searchParams;
  const feedbackPrefix = form ? `${formLabelByKey[form] ?? "Profile"}: ` : "";

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">My Profile</h1>

      {error ? (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {feedbackPrefix}
          {error}
        </div>
      ) : null}
      {success ? (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
        >
          {feedbackPrefix}
          {success}
        </div>
      ) : null}

      <form
        action={async (formData) => {
          "use server";
          const result = await updateProfile(formData);
          const params = new URLSearchParams({ form: result.form });
          if (!result.success) {
            params.set("error", getFeedbackMessage(result.error, result.fieldErrors));
            redirect(`/settings/profile?${params.toString()}`);
          }
          params.set("success", result.message);
          redirect(`/settings/profile?${params.toString()}`);
        }}
        className="bg-card border rounded-lg p-6 space-y-4 mb-6"
      >
        <h2 className="text-lg font-semibold">Personal Information</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input name="name" defaultValue={user.name} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input value={user.email} readOnly className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground" />
          <p className="text-xs text-muted-foreground mt-1">Contact support to change email</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input name="phone" defaultValue={user.phone || ""} type="tel" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Avatar URL</label>
          <input
            name="avatarUrl"
            defaultValue={user.avatarUrl || ""}
            placeholder="https://... or /uploads/media/..."
            type="url"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Use a public http(s) URL or managed media path.{" "}
            {canViewMediaLibrary ? (
              <Link href="/settings/media-library" className="underline">
                Open media library
              </Link>
            ) : null}
          </p>
          {user.avatarUrl ? (
            <div className="mt-2 flex items-center gap-3">
              <div
                aria-hidden
                className="h-10 w-10 rounded-full border border-border bg-muted bg-cover bg-center"
                style={{ backgroundImage: `url("${user.avatarUrl}")` }}
              />
              <p className="text-xs text-muted-foreground break-all">Current avatar: {user.avatarUrl}</p>
            </div>
          ) : null}
        </div>

        <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 text-sm font-medium">Save Profile</button>
      </form>

      <form
        action={async (formData) => {
          "use server";
          const result = await changePassword(formData);
          const params = new URLSearchParams({ form: result.form });
          if (!result.success) {
            params.set("error", getFeedbackMessage(result.error, result.fieldErrors));
            redirect(`/settings/profile?${params.toString()}`);
          }
          params.set("success", result.message);
          redirect(`/settings/profile?${params.toString()}`);
        }}
        className="bg-card border rounded-lg p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold">Change Password</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Current Password</label>
          <input name="currentPassword" type="password" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">New Password</label>
          <input name="newPassword" type="password" required minLength={8} placeholder="At least 8 chars, upper/lower/number" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confirm New Password</label>
          <input name="confirmPassword" type="password" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 text-sm font-medium">Update Password</button>
      </form>
    </div>
  );
}
