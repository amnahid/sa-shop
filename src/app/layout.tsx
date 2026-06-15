import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ToastProvider } from "@/components/ui/toast";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { getDictionary, Locale } from "@/lib/i18n/get-dictionary";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-arabic",
});

export const metadata: Metadata = {
  title: "SA Shop - POS & Inventory",
  description: "Shop Management SaaS for Saudi Arabia - POS, Inventory, and ZATCA E-invoicing",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("NEXT_LOCALE")?.value as Locale) || "en";
  const dictionary = await getDictionary(locale);
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`h-full antialiased ${inter.variable} ${ibmPlexArabic.variable}`}>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans" suppressHydrationWarning>
        <LanguageProvider initialLocale={locale} initialDictionary={dictionary}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
