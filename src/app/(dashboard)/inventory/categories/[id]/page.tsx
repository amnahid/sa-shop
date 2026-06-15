import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { FormField } from "@/components/app/FormField";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormFeedback } from "@/components/app/FormFeedback";
import { RotateCcw, Trash2, Archive } from "lucide-react";
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
    <div className="space-y-6">
      <PageHeader
        title={category.name}
        section="Inventory"
        breadcrumbs={[
          { label: "Categories", href: "/inventory/categories" },
          { label: category.name },
        ]}
        actions={
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
                  <Button type="submit" variant="outline" size="sm" className="font-bold uppercase tracking-widest text-[10px]">
                    <RotateCcw className="size-3.5 me-2" />
                    Restore
                  </Button>
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
                  <Button type="submit" variant="destructive" size="sm" className="font-bold uppercase tracking-widest text-[10px]">
                    <Trash2 className="size-3.5 me-2" />
                    Delete
                  </Button>
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
                <Button type="submit" variant="soft-danger" size="sm" className="font-bold uppercase tracking-widest text-[10px]">
                  <Archive className="size-3.5 me-2" />
                  Archive
                </Button>
              </form>
            )}
          </div>
        }
      />

      <FormFeedback status="error" message={error} />
      <FormFeedback status="success" message={success} />

      <div className="max-w-2xl bg-card border rounded-lg p-6">
        <form
          action={async (formData) => {
            "use server";
            const result = await updateCategory(id, formData);
            if ("error" in result) {
              redirect(`/inventory/categories/${id}?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
            }
            redirect(`/inventory/categories/${id}?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
          }}
          className="space-y-6"
        >
          <FormField label="Category Name" htmlFor="name" required>
            <Input id="name" name="name" type="text" required defaultValue={category.name} />
          </FormField>

          <FormField label="Arabic Name" htmlFor="nameAr">
            <Input id="nameAr" name="nameAr" type="text" dir="rtl" defaultValue={category.nameAr || ""} />
          </FormField>

          <FormField label="Parent Category" htmlFor="parentId">
            <Select name="parentId" defaultValue={category.parentId?.toString() || "none"}>
              <SelectTrigger id="parentId">
                <SelectValue placeholder="Root (no parent)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Root (no parent)</SelectItem>
                {parentOptions.map((parent) => (
                  <SelectItem key={parent._id.toString()} value={parent._id.toString()}>
                    {parent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
            <Button variant="outline" asChild className="px-8 font-bold uppercase tracking-widest text-[10px]">
              <Link href="/inventory/categories">Cancel</Link>
            </Button>
            <Button type="submit" className="px-10 font-bold uppercase tracking-widest text-[10px]">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
