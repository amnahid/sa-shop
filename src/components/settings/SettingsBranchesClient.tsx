"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { createBranch, deactivateBranch, reactivateBranch, updateBranch } from "@/lib/actions/branches";

type BranchItem = {
  _id: string;
  name: string;
  nameAr?: string;
  address?: string;
  city?: string;
  phone?: string;
  vatBranchCode?: string;
  isHeadOffice: boolean;
  active: boolean;
};

type StatusFilter = "active" | "inactive" | "all";

export function filterBranches(branches: BranchItem[], statusFilter: StatusFilter, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  return branches.filter(branch => {
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" ? branch.active : !branch.active);

    if (!statusMatch) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchable = [branch.name, branch.nameAr, branch.city]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}

export function SettingsBranchesClient({ branches }: { branches: BranchItem[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const filteredBranches = useMemo(
    () => filterBranches(branches, statusFilter, query),
    [branches, query, statusFilter]
  );

  const runAction = (
    runner: () => Promise<{ error?: string; message?: string; success?: boolean }>,
    onSuccess?: () => void
  ) => {
    startTransition(async () => {
      const result = await runner();
      if (result.error) {
        setFeedback({ type: "error", message: result.error });
        showToast(result.error, "error");
        return;
      }

      const message = result.message || "Action completed successfully.";
      setFeedback({ type: "success", message });
      showToast(message, "success");
      onSuccess?.();
      router.refresh();
    });
  };

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-foreground mb-6">Branch Management</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          runAction(() => createBranch(formData), () => event.currentTarget.reset());
        }}
        className="mb-6 border rounded-lg p-4 bg-card space-y-3"
      >
        <h2 className="text-sm font-semibold">Create Branch</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input name="name" required placeholder="Branch name (EN)" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="nameAr" placeholder="Branch name (AR)" dir="rtl" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="city" placeholder="City" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="address" placeholder="Address" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2" />
          <input name="phone" placeholder="Phone" type="tel" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="vatBranchCode" placeholder="VAT Branch Code" className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>
        <button
          disabled={pending}
          type="submit"
          className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium disabled:opacity-60"
        >
          Add Branch
        </button>
      </form>

      <div className="border rounded-lg p-4 bg-card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or city"
            className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm md:col-span-2"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
            <option value="all">All branches</option>
          </select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Showing {filteredBranches.length} of {branches.length} branches
        </p>
      </div>

      {feedback && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            feedback.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="space-y-6">
        {filteredBranches.map(branch => (
          <div key={branch._id} className="bg-card border rounded-lg p-6">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                runAction(() => updateBranch(branch._id, formData));
              }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold flex items-center gap-2">
                  {branch.name}
                  {branch.isHeadOffice && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Head Office</span>}
                  {!branch.active && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Inactive</span>}
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Name (EN)</label>
                  <input name="name" defaultValue={branch.name} required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name (AR)</label>
                  <input name="nameAr" defaultValue={branch.nameAr || ""} dir="rtl" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City</label>
                  <input name="city" defaultValue={branch.city || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input name="phone" defaultValue={branch.phone || ""} type="tel" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input name="address" defaultValue={branch.address || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">VAT Branch Code</label>
                  <input name="vatBranchCode" defaultValue={branch.vatBranchCode || ""} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  disabled={pending}
                  type="submit"
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 px-4 text-sm font-medium disabled:opacity-60"
                >
                  Save
                </button>
                {!branch.isHeadOffice && branch.active && (
                  <button
                    disabled={pending}
                    type="button"
                    onClick={() => runAction(() => deactivateBranch(branch._id))}
                    className="inline-flex items-center justify-center rounded-md border border-red-300 text-red-600 h-9 px-4 text-sm font-medium disabled:opacity-60"
                  >
                    Deactivate
                  </button>
                )}
                {!branch.active && (
                  <button
                    disabled={pending}
                    type="button"
                    onClick={() => runAction(() => reactivateBranch(branch._id))}
                    className="inline-flex items-center justify-center rounded-md border border-green-300 text-green-700 h-9 px-4 text-sm font-medium disabled:opacity-60"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </form>
          </div>
        ))}
      </div>

      {filteredBranches.length === 0 && (
        <div className="text-center text-muted-foreground py-12">No branches match your filters</div>
      )}
    </div>
  );
}
