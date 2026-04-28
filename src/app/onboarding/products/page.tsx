"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { FormFeedback } from "@/components/app/FormFeedback";
import { importProductsAction, initialProductsActionState } from "@/lib/actions/onboarding-products";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
    >
      {pending ? "Importing..." : "Import Products"}
    </button>
  );
}

export default function ProductsPage() {
  const [state, formAction] = useActionState(importProductsAction, initialProductsActionState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && <FormFeedback status="error" message={state.message} />}

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">Import Products</h2>
        <p className="text-sm text-muted-foreground mb-4">Paste CSV data with your products, or skip to add them later.</p>

        <div className="bg-muted rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium mb-2">CSV Format</h3>
          <code className="text-xs bg-background p-2 rounded block overflow-x-auto">
            sku,barcode,name,nameAr,category,unit,sellingPrice,vatRate,trackStock,lowStockThreshold,expiryTracking,quantity
          </code>
        </div>

        <div className="bg-muted rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium mb-2">Example</h3>
          <code className="text-xs bg-background p-2 rounded block overflow-x-auto">
            SKU001,1234567890123,Apple,تفاح,Fruits,kg,8.00,0.15,true,10,false,100
          </code>
        </div>

        <label htmlFor="csv" className="block text-sm font-medium text-foreground mb-1">
          Paste CSV Data
        </label>
        <textarea
          id="csv"
          name="csv"
          rows={10}
          placeholder="sku,name,category,unit,sellingPrice,vatRate,quantity&#10;SKU001,Apple,Fruits,kg,8.00,0.15,100"
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {state.status === "error" && state.fieldErrors?.csv && (
          <p className="mt-1 text-xs text-red-700">{state.fieldErrors.csv}</p>
        )}
      </div>

      <div className="flex justify-between gap-2 pt-4">
        <Link
          href="/onboarding/team"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground h-10 px-4 py-2 text-sm font-medium"
        >
          Skip
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}
