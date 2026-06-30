"use client";

import { useTransition } from "react";
import { skipOnboarding } from "@/lib/actions/onboarding-skip";

export function SkipOnboardingButton() {
  const [isPending, startTransition] = useTransition();

  const handleSkip = () => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        await skipOnboarding(formData);
      } catch (error) {
        // Next.js redirect throws an error which is caught here, but Next.js handles it.
        // We log other unexpected errors.
        if (error instanceof Error && error.message === "NEXT_REDIRECT") {
          throw error;
        }
        console.error("Failed to skip onboarding:", error);
      }
    });
  };

  return (
    <button
      onClick={handleSkip}
      disabled={isPending}
      className="text-xs text-muted-foreground hover:text-foreground font-medium underline cursor-pointer disabled:opacity-50"
    >
      {isPending ? "Skipping setup..." : "Skip Onboarding"}
    </button>
  );
}
