"use client";

import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
          title={t("common.language")}
        >
          <Globe className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setLocale("en")}
          className={locale === "en" ? "bg-accent text-accent-foreground" : ""}
        >
          {t("common.english")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLocale("ar")}
          className={locale === "ar" ? "bg-accent text-accent-foreground" : ""}
        >
          {t("common.arabic")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
