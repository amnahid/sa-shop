"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listTenants } from "@/lib/actions/admin-tenants";
import { 
  Search, 
  Calendar, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2,
  Settings
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface TenantRow {
  id: string;
  name: string;
  nameAr: string;
  email?: string;
  phone?: string;
  vatNumber?: string;
  crNumber?: string;
  plan: 'starter' | 'growth' | 'pro' | 'enterprise';
  planExpiresAt?: string;
  primaryColor?: string;
  status?: 'active' | 'suspended';
}

interface RawTenant {
  _id: string;
  name: string;
  nameAr: string;
  email?: string;
  phone?: string;
  vatNumber?: string;
  crNumber?: string;
  plan: 'starter' | 'growth' | 'pro' | 'enterprise';
  planExpiresAt?: string;
  primaryColor?: string;
  status?: 'active' | 'suspended';
}

const planLabel: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  pro: "Pro Plan",
  enterprise: "Enterprise",
};

const planColors: Record<string, string> = {
  starter: "bg-gray-100 text-gray-800 border-gray-200",
  growth: "bg-blue-100 text-blue-800 border-blue-200",
  pro: "bg-purple-100 text-purple-800 border-purple-200",
  enterprise: "bg-amber-100 text-amber-800 border-amber-200",
};

export default function AdminTenantsPage() {
  const { showToast } = useToast();
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 450);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await listTenants(debouncedSearch, page, 10);
    setLoading(false);

    if ("error" in res) {
      showToast(res.error || "Failed to load tenants", "error");
    } else {
      const formattedRows: TenantRow[] = ((res.tenants ?? []) as unknown as RawTenant[]).map((t) => ({
        id: t._id,
        name: t.name,
        nameAr: t.nameAr,
        email: t.email,
        phone: t.phone,
        vatNumber: t.vatNumber,
        crNumber: t.crNumber,
        plan: t.plan,
        planExpiresAt: t.planExpiresAt,
        primaryColor: t.primaryColor,
        status: t.status || "active",
      }));
      setRows(formattedRows);
      setTotal(res.total ?? 0);
    }
  }, [debouncedSearch, page, showToast]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        loadData();
      }
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  const columns: DataTableColumn<TenantRow>[] = [
    {
      key: "name",
      header: "Business Name",
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-slate-900 leading-tight">
            {r.name}
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {r.nameAr}
          </span>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact Details",
      render: (r) => (
        <div className="flex flex-col gap-0.5 text-xs text-slate-500 font-medium">
          {r.email && <span>{r.email}</span>}
          {r.phone && <span>{r.phone}</span>}
          {!r.email && !r.phone && <span className="text-slate-350">-</span>}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => {
        const isSuspended = r.status === "suspended";
        return (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
            isSuspended 
              ? "bg-red-50 text-red-700 border-red-200" 
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            {r.status || "active"}
          </span>
        );
      }
    },
    {
      key: "plan",
      header: "Subscription Plan",
      render: (r) => (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${planColors[r.plan] || "bg-gray-55 text-gray-800"}`}>
          {planLabel[r.plan] || r.plan}
        </span>
      ),
    },
    {
      key: "expiry",
      header: "Expiration Date",
      render: (r) => {
        if (!r.planExpiresAt) {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-[#0ca678] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Lifetime</span>
            </span>
          );
        }

        const expiryDate = new Date(r.planExpiresAt);
        const isExpired = expiryDate < new Date();

        return (
          <div className={`flex items-center gap-1 text-xs font-bold ${isExpired ? "text-red-650" : "text-slate-500"}`}>
            {isExpired ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                <span>Expired</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {expiryDate.toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </>
            )}
          </div>
        );
      },
    },
    {
      key: "color",
      header: "Branding",
      render: (r) => (
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-4 rounded-full border border-slate-200 shadow-sm shrink-0" 
            style={{ backgroundColor: r.primaryColor || "#377dff" }} 
          />
          <span className="text-[10px] font-mono text-slate-400 uppercase font-black">{r.primaryColor || "#377dff"}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => (
        <Link href={`/admin/tenants/${r.id}`}>
          <Button variant="secondary" size="xs" className="font-bold flex items-center gap-1.5 px-3 py-1">
            <Settings className="w-3.5 h-3.5" />
            <span>Manage</span>
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">TENANT DIRECTORY</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Search, audit, and configure subscription plan tiers, limits, and statuses for all business tenants.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative w-80">
          <Search className="absolute top-3 start-3 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name, email or VAT..."
            className="ps-9"
          />
        </div>
        <div className="text-xs font-black uppercase text-slate-400 tracking-wider">
          Total Tenants: {total}
        </div>
      </div>

      {/* Data Table Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Loading tenant roster...
          </span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            empty={{
              title: "No tenants found",
              description: "No business tenants match the current search filters.",
            }}
          />
        </div>
      )}
    </div>
  );
}
