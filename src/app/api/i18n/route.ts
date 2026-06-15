import { NextRequest, NextResponse } from "next/server";
import { Locale } from "@/lib/i18n/get-dictionary";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = (searchParams.get("locale") as Locale) || "en";

  try {
    const dictionary = await import(`@/lib/i18n/dictionaries/${locale}.json`).then(
      (m) => m.default
    );
    return NextResponse.json(dictionary);
  } catch {
    return NextResponse.json({ error: "Locale not found" }, { status: 404 });
  }
}
