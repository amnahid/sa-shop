import Link from "next/link";
import { getCurrentMembership } from "@/lib/utils/membership";
import { Product, StockLevel, Branch } from "@/models";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, PackageSearch } from "lucide-react";

export default async function StockPage() {
  const membership = await getCurrentMembership();
  if (!membership) {
    return <div>No active membership</div>;
  }

  const tenantId = membership.tenantId;
  const branches = await Branch.find({ tenantId, active: true }).sort({ isHeadOffice: -1, name: 1 });
  
  const products = await Product.find({ tenantId, deletedAt: null, trackStock: true }).sort({ name: 1 });
  
  const stockLevels = await StockLevel.find({
    tenantId,
    branchId: { $in: branches.map(b => b._id) },
  });

  const getStock = (productId: string, branchId: string) => {
    const stock = stockLevels.find(
      s => s.productId.toString() === productId && s.branchId.toString() === branchId
    );
    return stock ? parseFloat(stock.quantity.toString()) : 0;
  };

  return (
    <>
      <PageHeader
        title="Inventory Stock"
        section="Inventory"
        breadcrumbs={[{ label: "Stock" }]}
        actions={
          <div className="flex gap-3">
            <Button asChild variant="outline" size="sm" className="font-bold uppercase tracking-wider text-[11px]">
              <Link href="/inventory/stock/adjust">Adjust Stock</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="font-bold uppercase tracking-wider text-[11px]">
              <Link href="/inventory/stock/transfer">Transfer</Link>
            </Button>
            <Button asChild size="sm" className="font-bold uppercase tracking-wider text-[11px] px-6">
              <Link href="/inventory/branches">Branches</Link>
            </Button>
          </div>
        }
      />

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="py-4 border-b border-gray-50 bg-white">
          <CardTitle className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
             <PackageSearch className="size-4 text-primary" />
             Stock Levels by Branch
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-[#f9fafb]">
              <TableRow className="hover:bg-transparent border-b border-gray-100">
                <TableHead className="pl-8">Product Details</TableHead>
                {branches.map(b => (
                  <TableHead key={b._id.toString()} className="text-right">
                    {b.name}
                    {b.isHeadOffice && <span className="ml-1 text-[8px] opacity-60">HQ</span>}
                  </TableHead>
                ))}
                <TableHead className="text-right px-8 font-black text-gray-900">Total Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={branches.length + 2} className="py-20 text-center">
                     <PackageSearch className="size-10 text-gray-200 mx-auto mb-4" />
                     <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No tracking products</p>
                  </TableCell>
                </TableRow>
              ) : (
                products.map(product => {
                  const total = branches.reduce((sum, b) => sum + getStock(product._id.toString(), b._id.toString()), 0);
                  return (
                    <TableRow key={product._id.toString()} className="group hover:bg-gray-50/50 transition-colors">
                      <TableCell className="pl-8 py-4">
                        <div className="font-bold text-gray-900">{product.name}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">{product.sku}</div>
                      </TableCell>
                      {branches.map(branch => {
                        const stock = getStock(product._id.toString(), branch._id.toString());
                        const isLow = stock <= product.lowStockThreshold;
                        return (
                          <TableCell key={branch._id.toString()} className="text-right">
                            <span className={cn(
                              "font-bold",
                              isLow && stock > 0 ? "text-danger" : "text-gray-700"
                            )}>
                              {stock}
                            </span>
                            {isLow && stock > 0 && (
                              <AlertTriangle className="size-3 text-danger inline ml-1.5 mb-0.5" />
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right pr-8">
                        <Button variant="secondary" size="xs" className="font-black text-primary min-w-[60px]" asChild>
                           <Link href={`/inventory/stock/${product._id}`}>
                              {total}
                           </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="mt-6 flex flex-wrap items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-danger shadow-[0_0_8px_rgba(239,72,106,0.4)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Low Stock Warning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(55,125,255,0.4)]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Click total for history</span>
        </div>
      </div>
    </>
  );
}
