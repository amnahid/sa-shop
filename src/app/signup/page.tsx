"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FormFeedback } from "@/components/app/FormFeedback";
import { signupAction } from "@/lib/actions/signup";
import { initialSignupActionState } from "@/lib/actions/signup.types";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
    >
      {pending ? "Creating account..." : "Continue"}
    </button>
  );
}

export default function SignupPage() {
  const [state, formAction] = useActionState(signupAction, initialSignupActionState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="text-muted-foreground mt-2">Start your free shop account</p>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          {state.status === "error" && <FormFeedback status="error" message={state.message} />}

          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                Your Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {state.status === "error" && state.fieldErrors?.name && (
                <p className="mt-1 text-xs text-red-700">{state.fieldErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {state.status === "error" && state.fieldErrors?.email && (
                <p className="mt-1 text-xs text-red-700">{state.fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Min 6 characters"
                required
                minLength={6}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {state.status === "error" && state.fieldErrors?.password && (
                <p className="mt-1 text-xs text-red-700">{state.fieldErrors.password}</p>
              )}
            </div>

            <SubmitButton />
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account? <a href="/login" className="text-primary hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
