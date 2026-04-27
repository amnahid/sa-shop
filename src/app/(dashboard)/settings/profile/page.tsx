

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Membership, User } from "@/models";
import { updateProfile, changePassword } from "@/lib/actions/team";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await User.findById(session.user.id);
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">My Profile</h1>

      <form action={async (formData) => {
        "use server";
        const result = await updateProfile(formData);
        if (result.error) {
          console.error(result.error);
        }
      }} className="bg-card border rounded-lg p-6 space-y-4 mb-6">
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

        <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 text-sm font-medium">Save Profile</button>
      </form>

      <form action={async (formData) => {
        "use server";
        const currentPw = formData.get("currentPassword") as string;
        const newPw = formData.get("newPassword") as string;
        const confirmPw = formData.get("confirmPassword") as string;
        if (newPw !== confirmPw) {
          console.error("Passwords do not match");
          return;
        }
        const result = await changePassword(currentPw, newPw);
        if (result.error) {
          console.error(result.error);
        }
      }} className="bg-card border rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold">Change Password</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Current Password</label>
          <input name="currentPassword" type="password" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">New Password</label>
          <input name="newPassword" type="password" required minLength={8} placeholder="Min 8 characters" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
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