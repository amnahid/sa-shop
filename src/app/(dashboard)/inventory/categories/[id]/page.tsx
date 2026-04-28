import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { FormFeedback } from "@/components/app/FormFeedback";
import {
  archiveCategory,
  permanentlyDeleteCategory,
  restoreCategory,
  updateCategory,
} from "@/lib/actions/categories";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Category } from "@/models";

interface CategoryDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function CategoryDetailPage({ params, searchParams }: CategoryDetailPageProps) {
  const { id } = await params;
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  const category = await Category.findOne({ _id: id, tenantId: membership.tenantId });
  if (!category) {
    return <div>Category not found</div>;
  }

  const parentOptions = await Category.find({
    tenantId: membership.tenantId,
    deletedAt: null,
    _id: { $ne: category._id },
  }).sort({ name: 1 });
  const { error, success } = await searchParams;
  const isArchived = category.deletedAt !== null;

  return (
    <div className="p-6 max-w-2xl">
      <Breadcrumb items={[{ label: "Categories", href: "/inventory/categories" }, { label: category.name }]} />
      <div className="mt-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Edit Category</h1>
        <div className="flex gap-2">
          {isArchived ? (
            <>
              <form
                action={async () => {
                  "use server";
                  const result = await restoreCategory(id);
                  if ("error" in result) {
                    redirect(`/inventory/categories/${id}?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                  }
                  redirect(`/inventory/categories/${id}?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
                }}
              >
                <button type="submit" className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-9 px-3 text-xs font-medium">Restore</button>
              </form>
              <form
                action={async () => {
                  "use server";
                  const result = await permanentlyDeleteCategory(id);
                  if ("error" in result) {
                    redirect(`/inventory/categories/${id}?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                  }
                  redirect("/inventory/categories?success=Category%20deleted%20permanently");
                }}
              >
                <button type="submit" className="inline-flex items-center justify-center rounded-md bg-red-600 text-white h-9 px-3 text-xs font-medium">Delete Permanently</button>
              </form>
            </>
          ) : (
            <form
              action={async () => {
                "use server";
                const result = await archiveCategory(id);
                if ("error" in result) {
                  redirect(`/inventory/categories/${id}?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                }
                redirect(`/inventory/categories/${id}?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
              }}
            >
              <button type="submit" className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 h-9 px-3 text-xs font-medium">Archive</button>
            </form>
          )}
        </div>
      </div>

      <FormFeedback status="error" message={error} />
      <FormFeedback status="success" message={success} />

      <form
        action={async (formData) => {
          "use server";
          const result = await updateCategory(id, formData);
          if ("error" in result) {
            redirect(`/inventory/categories/${id}?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
          }
          redirect(`/inventory/categories/${id}?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">Category Name *</label>
          <input id="name" name="name" type="text" required defaultValue={category.name} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <label htmlFor="nameAr" className="block text-sm font-medium text-foreground mb-1">Arabic Name</label>
          <input id="nameAr" name="nameAr" type="text" dir="rtl" defaultValue={category.nameAr || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </div>

        <div>
          <label htmlFor="parentId" className="block text-sm font-medium text-foreground mb-1">Parent Category</label>
          <select id="parentId" name="parentId" defaultValue={category.parentId?.toString() || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Root (no parent)</option>
            {parentOptions.map((parent) => (
              <option key={parent._id.toString()} value={parent._id.toString()}>
                {parent.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-between gap-2 pt-4">
          <Link href="/inventory/categories" className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-10 px-4 py-2 text-sm font-medium">Cancel</Link>
          <button type="submit" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium">Save Changes</button>
        </div>
      </form>
    </div>
  );
}
