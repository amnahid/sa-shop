import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/app/FormField";
import { Plus } from "lucide-react";
import {
  archiveCategory,
  bulkArchiveCategories,
  bulkDeleteCategories,
  bulkRestoreCategories,
  createCategory,
  permanentlyDeleteCategory,
  restoreCategory,
} from "@/lib/actions/categories";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Category } from "@/models";
import { FormFeedback } from "@/components/app/FormFeedback";

interface CategoryRow {
  id: string;
  name: string;
  nameAr?: string;
  parentName: string;
  archived: boolean;
}

interface CategoriesPageProps {
  searchParams: Promise<{ error?: string; success?: string }>;
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }
  const { error, success } = await searchParams;

  const tenantId = membership.tenantId;
  const categories = await Category.find({ tenantId }).sort({ name: 1 });
  const parentMap = new Map(categories.map((category) => [category._id.toString(), category.name]));
  const rows: CategoryRow[] = categories.map((category) => ({
    id: category._id.toString(),
    name: category.name,
    nameAr: category.nameAr || undefined,
    parentName: category.parentId ? parentMap.get(category.parentId.toString()) ?? "—" : "Root",
    archived: category.deletedAt !== null,
  }));

  const columns: DataTableColumn<CategoryRow>[] = [
    {
      key: "name",
      header: "Category",
      render: (row) => (
        <div>
          <div className="font-bold text-gray-900">{row.name}</div>
          {row.nameAr ? (
            <div className="text-xs text-muted-foreground font-medium" dir="rtl">
              {row.nameAr}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "parentName",
      header: "Parent",
      render: (row) => <span className="font-medium text-gray-600">{row.parentName}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <span className={row.archived ? "text-amber-700 font-semibold" : "text-emerald-700 font-semibold"}>
          {row.archived ? "Archived" : "Active"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" size="xs" className="font-bold uppercase text-[10px] tracking-widest px-4" asChild>
            <Link href={`/inventory/categories/${row.id}`}>Edit</Link>
          </Button>
          {row.archived ? (
            <>
              <Button
                type="submit"
                formAction={async () => {
                  "use server";
                  const result = await restoreCategory(row.id);
                  if ("error" in result) {
                    redirect(`/inventory/categories?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                  }
                  redirect(`/inventory/categories?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
                }}
                variant="outline"
                size="xs"
                className="font-bold uppercase text-[10px] tracking-widest px-4"
              >
                Restore
              </Button>
              <Button
                type="submit"
                formAction={async () => {
                  "use server";
                  const result = await permanentlyDeleteCategory(row.id);
                  if ("error" in result) {
                    redirect(`/inventory/categories?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                  }
                  redirect(`/inventory/categories?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
                }}
                variant="destructive"
                size="xs"
                className="font-bold uppercase text-[10px] tracking-widest px-4"
              >
                Delete
              </Button>
            </>
          ) : (
            <Button
              type="submit"
              formAction={async () => {
                "use server";
                const result = await archiveCategory(row.id);
                if ("error" in result) {
                  redirect(`/inventory/categories?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                }
                redirect(`/inventory/categories?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
              }}
              variant="destructive"
              size="xs"
              className="font-bold uppercase text-[10px] tracking-widest px-4"
            >
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Product Categories"
        section="Inventory"
        breadcrumbs={[{ label: "Categories" }]}
        description={`Organize your catalog into ${categories.length} searchable product groups and hierarchies.`}
      />
      <FormFeedback status="error" message={error} />
      <FormFeedback status="success" message={success} />

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center gap-2 py-3 border-b border-gray-50">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft-primary text-primary">
            <Plus className="size-4" />
          </div>
          <CardTitle className="text-sm font-bold uppercase tracking-tight">Create New Category</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            action={async (formData) => {
              "use server";
              const result = await createCategory(formData);
              if ("error" in result) {
                redirect(`/inventory/categories?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
              }
              redirect(`/inventory/categories?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField label="Category Name" htmlFor="name" required>
                <Input name="name" id="name" type="text" placeholder="e.g. Beverages" required />
              </FormField>
              <FormField label="Arabic Name (الاسم)" htmlFor="nameAr" className="text-right">
                <Input name="nameAr" id="nameAr" type="text" dir="rtl" placeholder="اسم الفئة" />
              </FormField>
              <FormField label="Parent Category" htmlFor="parentId">
                <select
                  name="parentId"
                  id="parentId"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Root (no parent)</option>
                  {categories
                    .filter((category) => category.deletedAt === null)
                    .map((cat) => (
                      <option key={cat._id.toString()} value={cat._id.toString()}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </FormField>
            </div>
            <div className="flex justify-end pt-2 border-t border-gray-50">
              <Button type="submit" className="font-bold uppercase tracking-wider text-[11px] px-10 h-11">
                Save Category
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        bulk={{
          getRowLabel: (row) => row.name,
          actions: [
            {
              key: "archive",
              label: "Archive selected",
              action: async (formData) => {
                "use server";
                const result = await bulkArchiveCategories(formData);
                if (result.error) {
                  redirect(`/inventory/categories?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                }
                redirect(`/inventory/categories?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
              },
              variant: "destructive",
            },
            {
              key: "restore",
              label: "Restore selected",
              action: async (formData) => {
                "use server";
                const result = await bulkRestoreCategories(formData);
                if (result.error) {
                  redirect(`/inventory/categories?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                }
                redirect(`/inventory/categories?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
              },
            },
            {
              key: "delete",
              label: "Delete selected",
              action: async (formData) => {
                "use server";
                const result = await bulkDeleteCategories(formData);
                if (result.error) {
                  redirect(`/inventory/categories?error=${encodeURIComponent(result.error ?? "Operation failed")}`);
                }
                redirect(`/inventory/categories?success=${encodeURIComponent(result.message ?? "Operation succeeded")}`);
              },
              variant: "destructive",
            },
          ],
        }}
        empty={{
          title: "No categories yet",
          description: "Create your first category above.",
        }}
      />
    </>
  );
}
