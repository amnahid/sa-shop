"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { Branch, Membership } from "@/models";
import { ensureDefaultWhatsAppTemplates } from "./seed-whatsapp-templates";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function skipOnboarding(formData: FormData) {
  const allowSkip =
    String(
      process.env.NEXT_PUBLIC_ALLOW_SKIP_ONBOARDING ||
        process.env.ALLOW_SKIP_ONBOARDING ||
        ""
    )
      .trim()
      .toLowerCase() === "true";

  if (!allowSkip) {
    redirect("/onboarding/business?error=Skipping%20onboarding%20is%20not%20allowed");
  }

  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const membership = await Membership.findOne({
    userId: session.user.id,
    status: "active",
  });

  if (!membership) {
    redirect("/onboarding/business?error=No%20active%20membership%20found");
  }

  const tenantId = membership.tenantId;

  try {
    // 1. Ensure default WhatsApp templates are seeded
    await ensureDefaultWhatsAppTemplates(tenantId);

    // 2. Ensure at least one head office branch exists
    const existingBranch = await Branch.findOne({ tenantId });
    if (!existingBranch) {
      await Branch.create({
        tenantId,
        name: "Main Branch",
        nameAr: "الفرع الرئيسي",
        isHeadOffice: true,
        active: true,
      });
    }
  } catch (error) {
    console.error("Error skipping onboarding setup:", error);
    redirect("/onboarding/business?error=Failed%20to%20initialize%20default%20settings");
  }

  redirect("/");
}
