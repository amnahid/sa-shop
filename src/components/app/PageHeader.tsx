import type { ReactNode } from "react";
import { Breadcrumb } from "@/components/ui/breadcrumb";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  section?: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
}

export function PageHeader({
  title,
  description,
  actions,
  section,
  breadcrumbs,
}: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="space-y-2">
        {(section || breadcrumbs?.length) && (
          <div className="space-y-1">
            {section && (
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {section}
              </p>
            )}
            {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 md:pt-1">{actions}</div>}
    </div>
  );
}
