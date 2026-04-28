"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { FormFeedback } from "@/components/app/FormFeedback";
import { businessAction, initialBusinessActionState } from "@/lib/actions/onboarding-business";

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

export default function BusinessPage() {
  const [state, formAction] = useActionState(businessAction, initialBusinessActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && <FormFeedback status="error" message={state.message} />}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
          Business Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="My Shop"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {state.status === "error" && state.fieldErrors?.name && (
          <p className="mt-1 text-xs text-red-700">{state.fieldErrors.name}</p>
        )}
      </div>

      <div>
        <label htmlFor="nameAr" className="block text-sm font-medium text-foreground mb-1">
          اسم المتجر (Arabic)
        </label>
        <input
          id="nameAr"
          name="nameAr"
          type="text"
          dir="rtl"
          placeholder="متجزي"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="vatNumber" className="block text-sm font-medium text-foreground mb-1">
            VAT Number
          </label>
          <input
            id="vatNumber"
            name="vatNumber"
            type="text"
            placeholder="300000000000003"
            maxLength={15}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">15 digits, starts/ends with 3</p>
        </div>

        <div>
          <label htmlFor="crNumber" className="block text-sm font-medium text-foreground mb-1">
            CR Number
          </label>
          <input
            id="crNumber"
            name="crNumber"
            type="text"
            placeholder="1234567890"
            maxLength={10}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground mt-1">10 digits</p>
        </div>
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
          placeholder="العنوان"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
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
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="shop@example.com"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {state.status === "error" && state.fieldErrors?.email && (
            <p className="mt-1 text-xs text-red-700">{state.fieldErrors.email}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <SubmitButton />
      </div>
    </form>
  );
}
