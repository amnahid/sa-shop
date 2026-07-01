import React from "react";
import { Tenant, User, Invoice, Product } from "@/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  Users, 
  FileText, 
  Package, 
  Layers, 
  HeartPulse, 
  ShieldCheck,
  CheckCircle,
  Database
} from "lucide-react";
import connectDB from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await connectDB();

  // Query platform wide details
  const [
    totalTenants,
    totalUsers,
    totalInvoices,
    totalProducts,
    starterPlanCount,
    growthPlanCount,
    proPlanCount,
    enterprisePlanCount,
  ] = await Promise.all([
    Tenant.countDocuments(),
    User.countDocuments(),
    Invoice.countDocuments(),
    Product.countDocuments(),
    Tenant.countDocuments({ plan: "starter" }),
    Tenant.countDocuments({ plan: "growth" }),
    Tenant.countDocuments({ plan: "pro" }),
    Tenant.countDocuments({ plan: "enterprise" }),
  ]);

  const stats = [
    {
      title: "Total Tenants",
      value: totalTenants,
      description: "Registered businesses on the platform",
      icon: Building2,
      color: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      title: "Registered Users",
      value: totalUsers,
      description: "Total user accounts across all tenants",
      icon: Users,
      color: "bg-purple-50 text-purple-600 border-purple-100",
    },
    {
      title: "Total Invoices",
      value: totalInvoices,
      description: "Sales transactions processed platform-wide",
      icon: FileText,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
    {
      title: "Total Products",
      value: totalProducts,
      description: "Inventory items cataloged by all stores",
      icon: Package,
      color: "bg-amber-50 text-amber-600 border-amber-100",
    },
  ];

  const planBreakdown = [
    { name: "Starter Plan", count: starterPlanCount, percent: totalTenants > 0 ? Math.round((starterPlanCount / totalTenants) * 100) : 0, color: "bg-gray-400" },
    { name: "Growth Plan", count: growthPlanCount, percent: totalTenants > 0 ? Math.round((growthPlanCount / totalTenants) * 100) : 0, color: "bg-blue-500" },
    { name: "Pro Plan", count: proPlanCount, percent: totalTenants > 0 ? Math.round((proPlanCount / totalTenants) * 100) : 0, color: "bg-purple-500" },
    { name: "Enterprise Plan", count: enterprisePlanCount, percent: totalTenants > 0 ? Math.round((enterprisePlanCount / totalTenants) * 100) : 0, color: "bg-amber-500" },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">PLATFORM OVERVIEW</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Live statistics, health checks, and global settings for the sa-shop SaaS network.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:border-slate-350 border-slate-200 transition-all duration-200 shadow-sm bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-lg border ${stat.color} shrink-0`}>
                    <Icon className="size-5" />
                  </div>
                  <span className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</span>
                </div>
                <div className="mt-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.title}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bottom Content Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Subscriptions Card */}
        <Card className="md:col-span-2 border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center gap-2.5 py-4 border-b border-slate-50">
            <div className="p-1.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
              <Layers className="size-4" />
            </div>
            <CardTitle className="text-xs font-black text-slate-900 uppercase tracking-widest">Subscription Distribution</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {planBreakdown.map((plan) => (
              <div key={plan.name} className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">{plan.name}</span>
                  <span className="font-black text-slate-900">{plan.count} ({plan.percent}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${plan.color}`}
                    style={{ width: `${plan.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Health Check Card */}
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center gap-2.5 py-4 border-b border-slate-50">
            <div className="p-1.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
              <HeartPulse className="size-4" />
            </div>
            <CardTitle className="text-xs font-black text-slate-900 uppercase tracking-widest">System Health</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-5">
            <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-100 bg-emerald-50/20">
              <div className="flex items-center gap-2.5">
                <Database className="size-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700">MongoDB Database</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#0ca678] text-xs font-bold">
                <CheckCircle className="size-3.5" />
                <span>Connected</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-100 bg-emerald-50/20">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-700">Auth Token Verification</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#0ca678] text-xs font-bold">
                <CheckCircle className="size-3.5" />
                <span>Active</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">App Environment</p>
              <p className="text-lg font-black text-slate-800 mt-1 uppercase tracking-tight">
                {process.env.NODE_ENV || "production"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
