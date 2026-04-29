import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Membership, User } from "@/models";
import { changePassword } from "@/lib/actions/team";
import { canAccessPermission } from "@/lib/utils/permissions";
import { PageHeader } from "@/components/app/PageHeader";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/app/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface ProfilePageProps {
  searchParams: Promise<{ error?: string; success?: string; form?: string }>;
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

  const { error, success, form } = await searchParams;

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader
        title="My Profile"
        section="Settings"
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Profile" },
        ]}
        description="Update your personal details, profile picture, and security credentials."
      />

      {error && form === "password" ? (
        <div className="rounded-md border border-danger/20 bg-soft-danger px-4 py-3 text-sm text-danger font-bold uppercase tracking-tight">
          {error}
        </div>
      ) : null}
      {success && form === "password" ? (
        <div className="rounded-md border border-success/20 bg-soft-success px-4 py-3 text-sm text-success font-bold uppercase tracking-tight">
          {success}
        </div>
      ) : null}

      <ProfileForm user={{
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        avatarUrl: user.avatarUrl || "",
      }} />

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 py-4 border-b border-gray-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft-warning text-warning">
            <Lock className="size-4" />
          </div>
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          <form
            action={async (formData) => {
              "use server";
              const result = await changePassword(formData);
              const params = new URLSearchParams({ form: result.form });
              if (!result.success) {
                params.set("error", result.error);
                redirect(`/settings/profile?${params.toString()}`);
              }
              params.set("success", result.message);
              redirect(`/settings/profile?${params.toString()}`);
            }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FormField label="Current Password" htmlFor="currentPassword" required>
                <Input name="currentPassword" id="currentPassword" type="password" required />
              </FormField>
              <FormField label="New Password" htmlFor="newPassword" required hint="At least 8 characters">
                <Input name="newPassword" id="newPassword" type="password" required minLength={8} />
              </FormField>
              <FormField label="Confirm New Password" htmlFor="confirmPassword" required>
                <Input name="confirmPassword" id="confirmPassword" type="password" required />
              </FormField>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-50">
              <Button type="submit" className="font-black uppercase tracking-widest text-[11px] px-12 h-11 shadow-sm">
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
