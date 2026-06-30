"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { listTenants } from "@/lib/actions/tenants";
import { EditTenantModal } from "./EditTenantModal";
import { Edit2, Search, Calendar, ShieldAlert, CheckCircle2, Loader2 } from "lucide-react";
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
  raw: any;
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

export function TenantManagementClient() {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await listTenants(debouncedSearch, page, 10);
    setLoading(false);

    if ("error" in res) {
      showToast(res.error, "error");
    } else {
      const formattedRows: TenantRow[] = (res.tenants ?? []).map((t: any) => ({
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
        raw: t,
      }));
      setRows(formattedRows);
      setTotal(res.total ?? 0);
    }
  }, [debouncedSearch, page, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditClick = (tenantRow: TenantRow) => {
    setSelectedTenant(tenantRow.raw);
    setIsModalOpen(true);
  };

  const columns: DataTableColumn<TenantRow>[] = [
    {
      key: "name",
      header: locale === "ar" ? "اسم الشركة" : "Business Name",
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-gray-900 leading-tight">
            {locale === "ar" ? r.nameAr : r.name}
          </span>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            {locale === "ar" ? r.name : r.nameAr}
          </span>
        </div>
      ),
    },
    {
      key: "contact",
      header: locale === "ar" ? "معلومات الاتصال" : "Contact Details",
      render: (r) => (
        <div className="flex flex-col gap-0.5 text-xs text-gray-500 font-medium">
          {r.email && <span>{r.email}</span>}
          {r.phone && <span>{r.phone}</span>}
          {!r.email && !r.phone && <span className="text-gray-300">-</span>}
        </div>
      ),
    },
    {
      key: "vat",
      header: locale === "ar" ? "الرقم الضريبي / السجل" : "VAT / CR Number",
      render: (r) => (
        <div className="flex flex-col gap-0.5 text-xs text-gray-600 font-bold">
          {r.vatNumber && <span>VAT: {r.vatNumber}</span>}
          {r.crNumber && <span>CR: {r.crNumber}</span>}
          {!r.vatNumber && !r.crNumber && <span className="text-gray-300 font-medium">-</span>}
        </div>
      ),
    },
    {
      key: "plan",
      header: locale === "ar" ? "باقة الاشتراك" : "Subscription Plan",
      render: (r) => (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${planColors[r.plan] || "bg-gray-50 text-gray-800"}`}>
          {planLabel[r.plan] || r.plan}
        </span>
      ),
    },
    {
      key: "expiry",
      header: locale === "ar" ? "تاريخ الصلاحية" : "Expiration Date",
      render: (r) => {
        if (!r.planExpiresAt) {
          return (
            <span className="inline-flex items-center gap-1 text-xs text-[#0ca678] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {locale === "ar" ? "مدى الحياة" : "Lifetime"}
            </span>
          );
        }

        const expiryDate = new Date(r.planExpiresAt);
        const isExpired = expiryDate < new Date();

        return (
          <div className={`flex items-center gap-1 text-xs font-bold ${isExpired ? "text-danger" : "text-gray-500"}`}>
            {isExpired ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{locale === "ar" ? "منتهي الصلاحية" : "Expired"}</span>
              </>
            ) : (
              <>
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {expiryDate.toLocaleDateString("en-SA", {
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
      header: locale === "ar" ? "اللون الرئيسي" : "Branding",
      render: (r) => (
        <div className="flex items-center gap-2">
          <div 
            className="w-5 h-5 rounded-full border border-gray-200 shadow-sm shrink-0" 
            style={{ backgroundColor: r.primaryColor || "#377dff" }} 
          />
          <span className="text-[10px] font-mono text-gray-400 uppercase font-black">{r.primaryColor || "#377dff"}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: locale === "ar" ? "الإجراءات" : "Actions",
      align: locale === "ar" ? "left" : "right",
      render: (r) => (
        <Button variant="secondary" size="xs" className="font-bold flex items-center gap-1.5 px-3 py-1" onClick={() => handleEditClick(r)}>
          <Edit2 className="w-3 h-3" />
          {locale === "ar" ? "إدارة" : "Manage"}
        </Button>
      ),
    },
  ];

  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="space-y-6">
      <PageHeader
        title={locale === "ar" ? "إدارة الشركات والاشتراكات" : "Tenant Management"}
        section={locale === "ar" ? "إدارة النظام" : "System Administration"}
        breadcrumbs={[
          { label: locale === "ar" ? "الإعدادات" : "Settings", href: "/settings" },
          { label: locale === "ar" ? "إدارة الاشتراكات" : "Tenants" },
        ]}
        description={locale === "ar" ? "استعراض وتعديل خطط اشتراك الشركات، الفواتير، ونسب الاستخدام." : "Browse, filter, and manage subscription plan tiers, limits, and configurations for all tenants."}
      />

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border">
        <div className="relative w-72">
          <Search className="absolute top-2.5 start-3 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === "ar" ? "البحث بالاسم أو البريد..." : "Search by name, email or VAT..."}
            className="ps-9"
          />
        </div>
        <div className="text-xs font-black uppercase text-gray-400 tracking-wider">
          {locale === "ar" ? `إجمالي الشركات: ${total}` : `Total Tenants: ${total}`}
        </div>
      </div>

      {/* Data Table Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
            {locale === "ar" ? "جاري تحميل قائمة الشركات..." : "Loading tenants list..."}
          </span>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          empty={{
            title: locale === "ar" ? "لا توجد شركات مسجلة" : "No tenants found",
            description: locale === "ar" ? "لم نجد أي شركات تطابق معايير البحث." : "No business tenants match the current search filters.",
          }}
        />
      )}

      {/* Edit Tenant Dialog */}
      <EditTenantModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTenant(null);
        }}
        tenant={selectedTenant}
        onUpdate={() => {
          loadData();
          setIsModalOpen(false);
          setSelectedTenant(null);
        }}
      />
    </div>
  );
}
