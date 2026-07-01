import React from "react";
import { getTenantDetails } from "@/lib/actions/admin-tenants";
import { TenantDetailClient } from "./TenantDetailClient";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TenantDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { id } = await params;
  const res = await getTenantDetails(id);

  if ("error" in res || !res.success) {
    return (
      <div className="space-y-6">
        <Link href="/admin/tenants">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Back to Tenants
          </Button>
        </Link>
        <div className="p-6 border border-red-200 rounded-lg bg-red-50 text-red-700 font-bold text-sm">
          Failed to load tenant details: {res.error || "Unknown Error"}
        </div>
      </div>
    );
  }

  return (
    <TenantDetailClient 
      tenant={res.tenant}
      branches={res.branches || []}
      memberships={res.memberships || []}
      stats={res.stats || { invoiceCount: 0, productCount: 0, branchCount: 0, memberCount: 0 }}
    />
  );
}
