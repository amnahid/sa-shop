"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/app/FormField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { 
  updateTenantDetails, 
  updateTenantSubscription, 
  toggleTenantStatus 
} from "@/lib/actions/admin-tenants";
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  FileText, 
  Package, 
  Loader2,
  Lock,
  Unlock
} from "lucide-react";

interface TenantData {
  _id: string;
  name: string;
  nameAr: string;
  vatNumber?: string;
  crNumber?: string;
  email?: string;
  phone?: string;
  primaryColor?: string;
  plan: 'starter' | 'growth' | 'pro' | 'enterprise';
  planExpiresAt?: string;
  status: 'active' | 'suspended';
}

interface BranchData {
  _id: string;
  name: string;
  nameAr: string;
  city?: string;
  region?: string;
  phone?: string;
  vatBranchCode?: string;
  address?: string;
  isHeadOffice: boolean;
}

interface MembershipData {
  _id: string;
  userId?: {
    name: string;
    email: string;
    phone?: string;
  };
  role: 'owner' | 'manager' | 'cashier';
  status: 'invited' | 'active' | 'suspended';
  acceptedAt?: string;
  invitedAt?: string;
}

interface TenantDetailClientProps {
  tenant: TenantData;
  branches: BranchData[];
  memberships: MembershipData[];
  stats: {
    invoiceCount: number;
    productCount: number;
    branchCount: number;
    memberCount: number;
  };
}

export function TenantDetailClient({ tenant, branches, memberships, stats }: TenantDetailClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "branches" | "members">("overview");

  // Edit general profile states
  const [name, setName] = useState(tenant.name || "");
  const [nameAr, setNameAr] = useState(tenant.nameAr || "");
  const [vatNumber, setVatNumber] = useState(tenant.vatNumber || "");
  const [crNumber, setCrNumber] = useState(tenant.crNumber || "");
  const [email, setEmail] = useState(tenant.email || "");
  const [phone, setPhone] = useState(tenant.phone || "");
  const [primaryColor, setPrimaryColor] = useState(tenant.primaryColor || "#377dff");

  // Subscription plan states
  const [plan, setPlan] = useState<"starter" | "growth" | "pro" | "enterprise">(tenant.plan || "starter");
  const [expiryDate, setExpiryDate] = useState(
    tenant.planExpiresAt ? new Date(tenant.planExpiresAt).toISOString().split("T")[0] : ""
  );

  const [loading, setLoading] = useState(false);
  const isSuspended = tenant.status === "suspended";

  // Handlers
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !nameAr) {
      showToast("English and Arabic business names are required", "error");
      return;
    }
    
    setLoading(true);
    const res = await updateTenantDetails(tenant._id, {
      name,
      nameAr,
      vatNumber: vatNumber || undefined,
      crNumber: crNumber || undefined,
      email: email || undefined,
      phone: phone || undefined,
      primaryColor,
    });
    setLoading(false);

    if ("error" in res) {
      showToast(res.error || "Failed to update profile", "error");
    } else {
      showToast("Tenant profile updated successfully", "success");
      router.refresh();
    }
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await updateTenantSubscription(tenant._id, plan, expiryDate || null);
    setLoading(false);

    if ("error" in res) {
      showToast(res.error || "Failed to update subscription", "error");
    } else {
      showToast("Subscription settings saved", "success");
      router.refresh();
    }
  };

  const handleToggleStatus = async () => {
    const confirmation = window.confirm(
      isSuspended 
        ? "Are you sure you want to ACTIVATE this tenant? All associate user memberships will be restored."
        : "Are you sure you want to SUSPEND this tenant? This will block all memberships and disable store dashboard access immediately."
    );
    if (!confirmation) return;

    setLoading(true);
    const res = await toggleTenantStatus(tenant._id, !isSuspended);
    setLoading(false);

    if ("error" in res) {
      showToast(res.error || "Failed to update status", "error");
    } else {
      showToast(res.message || "Tenant status updated", "success");
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/admin/tenants">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ArrowLeft className="size-4" />
            <span>Back to Tenants</span>
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${
            isSuspended 
              ? "bg-red-50 text-red-700 border-red-200" 
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            Status: {tenant.status || "active"}
          </span>
          <Button 
            variant={isSuspended ? "default" : "destructive"} 
            size="sm" 
            onClick={handleToggleStatus}
            disabled={loading}
            className="font-bold flex items-center gap-1.5"
          >
            {isSuspended ? <Unlock className="size-4" /> : <Lock className="size-4" />}
            <span>{isSuspended ? "Activate Tenant" : "Suspend Tenant"}</span>
          </Button>
        </div>
      </div>

      {/* Header Info */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{tenant.name}</h1>
        <p className="text-sm text-slate-500 font-bold tracking-wider mt-0.5">{tenant.nameAr}</p>
      </div>

      {/* Overview stats cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 shrink-0">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Invoices Issued</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{stats.invoiceCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 shrink-0">
              <Package className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Products Registered</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{stats.productCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg border border-purple-100 shrink-0">
              <Building2 className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Branches</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{stats.branchCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 shrink-0">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Members</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{stats.memberCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 gap-4">
        {(["overview", "branches", "members"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 text-xs font-black uppercase tracking-widest border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-slate-450 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* General details form */}
          <Card className="md:col-span-2 bg-white border-slate-200 shadow-sm">
            <CardHeader className="py-4 border-b border-slate-50">
              <CardTitle className="text-xs font-black uppercase text-slate-900 tracking-widest">Business Profile Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSaveDetails} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Business Name (EN)" htmlFor="name" required>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </FormField>
                  <FormField label="Business Name (AR)" htmlFor="nameAr" required>
                    <Input id="nameAr" value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" className="text-right" required />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="VAT Number" htmlFor="vatNumber">
                    <Input id="vatNumber" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="300000000000003" />
                  </FormField>
                  <FormField label="CR Number" htmlFor="crNumber">
                    <Input id="crNumber" value={crNumber} onChange={(e) => setCrNumber(e.target.value)} placeholder="1010000000" />
                  </FormField>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Public Email" htmlFor="email">
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  </FormField>
                  <FormField label="Phone" htmlFor="phone">
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </FormField>
                </div>
                <FormField label="Brand Primary Color" htmlFor="primaryColor">
                  <div className="flex items-center gap-3">
                    <input id="primaryColor" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-10 p-1 border rounded bg-white" />
                    <Input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="font-mono text-xs uppercase" />
                  </div>
                </FormField>
                <div className="flex justify-end pt-4 border-t border-slate-50">
                  <Button type="submit" disabled={loading} className="font-bold">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Profile Details
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Subscription setup card */}
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="py-4 border-b border-slate-50">
              <CardTitle className="text-xs font-black uppercase text-slate-900 tracking-widest">Subscription Plan</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSaveSubscription} className="space-y-4">
                <FormField label="Active Tier" htmlFor="plan">
                  <Select value={plan} onValueChange={(val: 'starter' | 'growth' | 'pro' | 'enterprise') => setPlan(val)}>
                    <SelectTrigger id="plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="pro">Pro Plan</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Expires Date" htmlFor="expiry">
                  <Input 
                    id="expiry" 
                    type="date" 
                    value={expiryDate} 
                    onChange={(e) => setExpiryDate(e.target.value)} 
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Leave blank for Lifetime (No Expiry)</p>
                </FormField>
                <div className="flex justify-end pt-4 border-t border-slate-50">
                  <Button type="submit" disabled={loading} className="w-full font-bold">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Update Subscription Settings
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "branches" && (
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-450 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-3 px-6 text-start">Branch Name</th>
                  <th className="py-3 px-6 text-start">City / Region</th>
                  <th className="py-3 px-6 text-start">Phone</th>
                  <th className="py-3 px-6 text-start">VAT Code</th>
                  <th className="py-3 px-6 text-start">Address</th>
                  <th className="py-3 px-6 text-end">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {branches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                      No branches registered for this business.
                    </td>
                  </tr>
                ) : (
                  branches.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/30">
                      <td className="py-4 px-6 font-bold text-slate-900">
                        <div className="flex flex-col">
                          <span>{b.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{b.nameAr}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-600 font-bold">
                        {b.city || "-"} {b.region ? `/ ${b.region}` : ""}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                        {b.phone || "-"}
                      </td>
                      <td className="py-4 px-6 text-xs font-mono text-slate-600 font-bold">
                        {b.vatBranchCode || "-"}
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500 max-w-xs truncate">
                        {b.address || "-"}
                      </td>
                      <td className="py-4 px-6 text-end">
                        {b.isHeadOffice ? (
                          <span className="inline-flex items-center rounded bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                            Head Office
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                            Branch
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {activeTab === "members" && (
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-450 text-[10px] font-black uppercase tracking-wider">
                  <th className="py-3 px-6 text-start">User Profile</th>
                  <th className="py-3 px-6 text-start">Email Address</th>
                  <th className="py-3 px-6 text-start">Assigned Role</th>
                  <th className="py-3 px-6 text-start">Membership Status</th>
                  <th className="py-3 px-6 text-end">Invited / Accepted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {memberships.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                      No users/members linked to this tenant.
                    </td>
                  </tr>
                ) : (
                  memberships.map((m) => {
                    const u = m.userId;
                    return (
                      <tr key={m._id} className="hover:bg-slate-50/30">
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{u?.name || "Unknown"}</span>
                            {u?.phone && <span className="text-[10px] text-slate-400 font-bold">{u.phone}</span>}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-600 font-bold">
                          {u?.email || "-"}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            m.role === "owner" 
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : m.role === "manager"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-gray-50 text-gray-700 border border-gray-200"
                          }`}>
                            {m.role}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            m.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : m.status === "suspended"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-yellow-50 text-yellow-750 border border-yellow-200"
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-400 font-medium text-end">
                          {m.acceptedAt 
                            ? new Date(m.acceptedAt).toLocaleDateString()
                            : m.invitedAt 
                              ? `Invited: ${new Date(m.invitedAt).toLocaleDateString()}` 
                              : "-"
                          }
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
