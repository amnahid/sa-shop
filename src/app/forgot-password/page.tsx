"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
          <p className="text-muted-foreground mt-2">Enter your email to receive a reset link</p>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          {sent ? (
            <div className="text-center py-4">
              <p className="text-green-600 font-medium mb-2">Check your email!</p>
              <p className="text-sm text-muted-foreground">We've sent a password reset link to your email.</p>
            </div>
          ) : (
            <form action={async (formData) => {
              setLoading(true);
              const { requestPasswordReset } = await import("@/lib/actions/password-reset");
              await requestPasswordReset(formData);
              setLoading(false);
              setSent(true);
            }} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          )}
          <p className="text-center text-sm text-muted-foreground mt-4">
            <a href="/login" className="text-primary hover:underline">Back to sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}