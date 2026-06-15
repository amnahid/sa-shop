"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createRetainer } from "@/lib/actions/retainers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/app/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useToast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface ProposalOption extends Option {
  customerName?: string;
  total?: number;
  proposalNumber?: string;
}

interface Props {
  prefillProposal?: {
    _id: string;
    title: string;
    customerId: string;
    branchId: string;
    grandTotal: number;
  } | null;
  customers: Option[];
  branches: Option[];
  proposals: ProposalOption[];
}

export function RetainerFormClient({ prefillProposal, customers, branches, proposals }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    try {
      const result = await createRetainer(formData);
      if (result.error) {
        showToast(result.error, "error");
      } else if (result.retainerId) {
        showToast("Retainer created successfully", "success");
        router.push(`/retainers/${result.retainerId}`);
      }
    } catch {
      showToast("Failed to create Retainer", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-8 max-w-4xl">
      <Card>
        <CardHeader className="py-4 border-b border-gray-100">
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Retainer Details</CardTitle>
        </CardHeader>
        <CardContent className="pt-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField label="Retainer Title" htmlFor="title">
              <Input
                type="text"
                name="title"
                id="title"
                defaultValue={prefillProposal?.title || ""}
                placeholder="Support retainer - Q4"
              />
            </FormField>
            <FormField label="Linked Proposal" htmlFor="proposalId">
              <SearchableSelect
                name="proposalId"
                defaultValue={prefillProposal?._id || ""}
                options={proposals}
                placeholder="Not linked"
                searchPlaceholder="Search proposals..."
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <FormField label="Customer *" htmlFor="customerId" required>
              <SearchableSelect
                name="customerId"
                defaultValue={prefillProposal?.customerId || ""}
                options={customers}
                required
                placeholder="Select customer"
                searchPlaceholder="Search customers..."
              />
            </FormField>
            <FormField label="Branch *" htmlFor="branchId" required>
              <SearchableSelect
                name="branchId"
                defaultValue={prefillProposal?.branchId || ""}
                options={branches}
                required
                placeholder="Select branch"
                searchPlaceholder="Search branches..."
              />
            </FormField>
            <FormField label="Retainer Total (SAR) *" htmlFor="totalAmount" required>
              <Input
                type="number"
                name="totalAmount"
                id="totalAmount"
                min="0.01"
                step="0.01"
                required
                defaultValue={prefillProposal ? prefillProposal.grandTotal.toFixed(2) : ""}
              />
            </FormField>
          </div>

          <FormField label="Notes" htmlFor="notes">
            <Textarea
              name="notes"
              id="notes"
              placeholder="Billing scope, usage policy, or close conditions..."
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 pt-4">
        <Button asChild variant="outline" className="font-black uppercase tracking-widest text-[11px] px-8 h-11">
          <Link href="/retainers">Cancel</Link>
        </Button>
        <Button type="submit" disabled={loading} className="font-black uppercase tracking-widest text-[11px] px-12 h-11 shadow-lg">
          {loading ? (
            <>
              <Loader2 className="size-4 me-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Create Retainer"
          )}
        </Button>
      </div>
    </form>
  );
}
