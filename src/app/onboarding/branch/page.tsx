"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FormFeedback } from "@/components/app/FormFeedback";
import { branchAction } from "@/lib/actions/onboarding-branch";
import { initialBranchActionState } from "@/lib/actions/onboarding.types";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
    >
      {pending ? "Saving..." : "Continue"}
    </button>
  );
}

export default function BranchPage() {
  const [state, formAction] = useActionState(branchAction, initialBranchActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && <FormFeedback status="error" message={state.message} />}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
          Branch Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Main Branch"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {state.status === "error" && state.fieldErrors?.name && (
          <p className="mt-1 text-xs text-red-700">{state.fieldErrors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="nameAr" className="block text-sm font-medium text-foreground mb-1">
          اسم الفرع (Arabic)
        </label>
        <input
          id="nameAr"
          name="nameAr"
          type="text"
          dir="rtl"
          placeholder="الفرع الرئيسي"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-foreground mb-1">
          Address
        </label>
        <input
          id="address"
          name="address"
          type="text"
          placeholder="Street address"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label htmlFor="addressAr" className="block text-sm font-medium text-foreground mb-1">
          العنوان (Arabic)
        </label>
        <input
          id="addressAr"
          name="addressAr"
          type="text"
          dir="rtl"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-foreground mb-1">
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            placeholder="Riyadh"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="region" className="block text-sm font-medium text-foreground mb-1">
            Region
          </label>
          <input
            id="region"
            name="region"
            type="text"
            placeholder="Central Region"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+966 50 000 0000"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="vatBranchCode" className="block text-sm font-medium text-foreground mb-1">
            VAT Branch Code
          </label>
          <input
            id="vatBranchCode"
            name="vatBranchCode"
            type="text"
            placeholder="001"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
