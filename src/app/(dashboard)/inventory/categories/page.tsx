

import mongoose from "mongoose";
import { Category } from "@/models";
import { getCurrentMembership } from "@/lib/utils/membership";

export default async function CategoriesPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  const tenantId = membership.tenantId;

  const categories = await Category.find({ tenantId, deletedAt: null, active: true }).sort({ name: 1 });

  const addCategory = async (formData: FormData) => {
    "use server";
    const membership = await getCurrentMembership();
    if (!membership) return;

    const name = formData.get("name") as string;
    if (!name) return;

    const nameAr = formData.get("nameAr") as string;
    const parentId = formData.get("parentId") as string;

    await Category.create({
      tenantId: membership.tenantId,
      name,
      nameAr: nameAr || undefined,
      parentId: parentId ? new mongoose.Types.ObjectId(parentId) : undefined,
      active: true,
    });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Categories</h1>
      </div>

      <form action={addCategory} className="mb-6 p-4 bg-card border rounded-lg">
        <h2 className="text-sm font-medium mb-3">Add Category</h2>
        <div className="grid grid-cols-3 gap-4">
          <input name="name" type="text" placeholder="Name" required className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <input name="nameAr" type="text" dir="rtl" placeholder="الاسم" className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" />
          <select name="parentId" className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">Root (no parent)</option>
            {categories.map((cat) => (
              <option key={cat._id.toString()} value={cat._id.toString()}>{cat.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="mt-3 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 px-3 text-sm font-medium">
          Add Category
        </button>
      </form>

      <div className="bg-card border rounded-lg overflow-hidden">
        {categories.length === 0 ? (
          <p className="p-6 text-center text-muted-foreground">No categories yet</p>
        ) : (
          <div className="divide-y">
            {categories.map((cat) => (
              <div key={cat._id.toString()} className="flex items-center justify-between p-3">
                <div>
                  <span className="font-medium">{cat.name}</span>
                  {cat.nameAr && <span className="ml-2 text-muted-foreground" dir="rtl">{cat.nameAr}</span>}
                </div>
                {cat.parentId && <span className="text-xs text-muted-foreground">Subcategory</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
