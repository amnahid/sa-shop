"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FormFeedback } from "@/components/app/FormFeedback";
import { finishSetup, initialTeamActionState, inviteTeamAction } from "@/lib/actions/onboarding-team";

function InviteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-10 px-4 py-2 text-sm font-medium disabled:opacity-50"
    >
      {pending ? "Sending..." : "Send Invitation"}
    </button>
  );
}

export default function TeamPage() {
  const [state, formAction] = useActionState(inviteTeamAction, initialTeamActionState);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Invite Team Members</h2>
        <p className="text-sm text-muted-foreground">Add team members to help manage your shop. You can also skip this step.</p>
      </div>

      {state.status === "error" && <FormFeedback status="error" message={state.message} />}
      {state.status === "success" && <FormFeedback status="success" message={state.message} />}

      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="teammate@example.com"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {state.status === "error" && state.fieldErrors?.email && (
              <p className="mt-1 text-xs text-red-700">{state.fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-foreground mb-1">
              Role
            </label>
            <select
              id="role"
              name="role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
            </select>
            {state.status === "error" && state.fieldErrors?.role && (
              <p className="mt-1 text-xs text-red-700">{state.fieldErrors.role}</p>
            )}
          </div>
        </div>

        <InviteButton />
      </form>

      <form action={finishSetup}>
        <button
          type="submit"
          className="w-full inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-primary/90"
        >
          Finish Setup
        </button>
      </form>
    </div>
  );
}
