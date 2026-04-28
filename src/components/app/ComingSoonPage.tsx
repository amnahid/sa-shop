import { PageHeader } from "@/components/app/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ComingSoonPageProps {
  title: string;
  description?: string;
}

export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <>
      <PageHeader
        title={title}
        description={description ?? `${title} is coming soon.`}
      />
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Coming soon</CardTitle>
            <CardDescription>
              This module is under development. You can continue using other
              features in the meantime.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            We&apos;ll enable this area in an upcoming release.
          </CardContent>
        </Card>
      </div>
    </>
  );
}
