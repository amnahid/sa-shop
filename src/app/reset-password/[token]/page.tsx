"use server";

import { redirect } from "next/navigation";
import { resetPassword } from "@/lib/actions/password-reset";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ResetPasswordPage({ params }: Props) {
  const { token } = await params;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">New Password</h1>
          <p className="text-muted-foreground mt-2">Enter your new password</p>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <form action={async (formData) => {
            "use server";
            const newPassword = formData.get("password") as string;
            const confirm = formData.get("confirmPassword") as string;
            if (newPassword !== confirm) {
              return;
            }
            const result = await resetPassword(token, newPassword);
            if (result.success) {
              redirect("/login");
            }
          }} className="space-y-4">
            <input type="hidden" name="token" value={token} />
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">New Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                minLength={8}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                required
                minLength={8}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}