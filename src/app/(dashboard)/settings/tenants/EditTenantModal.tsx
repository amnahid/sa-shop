"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/app/FormField";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { useToast } from "@/components/ui/toast";
import { updateTenantDetails, updateTenantSubscription, getTenantStats } from "@/lib/actions/tenants";
import { Users, FileText, GitBranch, Loader2 } from "lucide-react";

interface EditTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: any;
  onUpdate: () => void;
}

export function EditTenantModal({ isOpen, onClose, tenant, onUpdate }: EditTenantModalProps) {
  const { t, locale } = useTranslation();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"general" | "subscription" | "stats">("general");
  
  // General Form States
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [crNumber, setCrNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [addressAr, setAddressAr] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#377dff");
  
  // Subscription States
  const [plan, setPlan] = useState<"starter" | "growth" | "pro" | "enterprise">("starter");
  const [expiryDate, setExpiryDate] = useState("");
  
  // Loading & Error States
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{ employees: number; invoices: number; branches: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (tenant) {
      setName(tenant.name || "");
      setNameAr(tenant.nameAr || "");
      setVatNumber(tenant.vatNumber || "");
      setCrNumber(tenant.crNumber || "");
      setPhone(tenant.phone || "");
      setEmail(tenant.email || "");
      setAddress(tenant.address || "");
      setAddressAr(tenant.addressAr || "");
      setPrimaryColor(tenant.primaryColor || "#377dff");
      setPlan(tenant.plan || "starter");
      
      if (tenant.planExpiresAt) {
        setExpiryDate(new Date(tenant.planExpiresAt).toISOString().split("T")[0]);
      } else {
        setExpiryDate("");
      }
      
      setStats(null);
      setActiveTab("general");
    }
  }, [tenant, isOpen]);

  useEffect(() => {
    if (activeTab === "stats" && tenant?._id) {
      setLoadingStats(true);
      getTenantStats(tenant._id).then(res => {
        if ("stats" in res && res.stats) {
          setStats(res.stats);
        } else if ("error" in res) {
          showToast(res.error, "error");
        }
        setLoadingStats(false);
      });
    }
  }, [activeTab, tenant?._id]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !nameAr) {
      showToast("English and Arabic names are required", "error");
      return;
    }
    
    setLoading(true);
    const res = await updateTenantDetails(tenant._id, {
      name,
      nameAr,
      vatNumber: vatNumber || undefined,
      crNumber: crNumber || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      addressAr: addressAr || undefined,
      primaryColor,
    });
    setLoading(false);

    if ("error" in res) {
      showToast(res.error, "error");
    } else {
      showToast("Tenant details updated successfully", "success");
      onUpdate();
    }
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await updateTenantSubscription(
      tenant._id,
      plan,
      expiryDate ? expiryDate : null
    );
    setLoading(false);

    if ("error" in res) {
      showToast(res.error, "error");
    } else {
      showToast("Subscription plan updated successfully", "success");
      onUpdate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-gray-900 tracking-tight">
            {locale === "ar" ? "إعدادات الشركة / الاشتراك" : "Tenant Settings"}
          </DialogTitle>
        </DialogHeader>

        {/* Tab Headers */}
        <div className="flex border-b border-gray-100 mb-6 gap-2">
          <button
            onClick={() => setActiveTab("general")}
            className={`py-2.5 px-4 font-bold text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              activeTab === "general"
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {locale === "ar" ? "بيانات الشركة" : "Business Details"}
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`py-2.5 px-4 font-bold text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              activeTab === "subscription"
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {locale === "ar" ? "خطة الاشتراك" : "Subscription Plan"}
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`py-2.5 px-4 font-bold text-xs uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              activeTab === "stats"
                ? "border-primary text-primary"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {locale === "ar" ? "الإحصائيات والنشاط" : "Usage Stats"}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "general" && (
          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label={locale === "ar" ? "اسم الشركة (إنجليزي)" : "Business Name (EN)"} htmlFor="name" required>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. My Shop Co." />
              </FormField>
              <FormField label={locale === "ar" ? "اسم الشركة (عربي)" : "Business Name (AR)"} htmlFor="nameAr" required>
                <Input id="nameAr" value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="مثال: شركة متجري" className="text-right" dir="rtl" />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label={locale === "ar" ? "الرقم الضريبي (VAT)" : "VAT Number"} htmlFor="vatNumber">
                <Input id="vatNumber" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} placeholder="e.g. 300000000000003" />
              </FormField>
              <FormField label={locale === "ar" ? "السجل التجاري (CR)" : "CR Number"} htmlFor="crNumber">
                <Input id="crNumber" value={crNumber} onChange={(e) => setCrNumber(e.target.value)} placeholder="e.g. 1010000000" />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label={locale === "ar" ? "البريد الإلكتروني" : "Email"} htmlFor="email">
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@company.com" />
              </FormField>
              <FormField label={locale === "ar" ? "الهاتف" : "Phone"} htmlFor="phone">
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966500000000" />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label={locale === "ar" ? "العنوان (إنجليزي)" : "Address (EN)"} htmlFor="address">
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Olaya, Riyadh" />
              </FormField>
              <FormField label={locale === "ar" ? "العنوان (عربي)" : "Address (AR)"} htmlFor="addressAr">
                <Input id="addressAr" value={addressAr} onChange={(e) => setAddressAr(e.target.value)} placeholder="العليا، الرياض" className="text-right" dir="rtl" />
              </FormField>
            </div>

            <FormField label={locale === "ar" ? "اللون الرئيسي للمنشأة" : "Brand Primary Color"} htmlFor="primaryColor">
              <div className="flex items-center gap-3">
                <Input id="primaryColor" type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-12 h-10 p-1 border rounded" />
                <Input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#377dff" className="font-mono text-xs uppercase" />
              </div>
            </FormField>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {locale === "ar" ? "حفظ التغييرات" : "Save Changes"}
              </Button>
            </div>
          </form>
        )}

        {activeTab === "subscription" && (
          <form onSubmit={handleSaveSubscription} className="space-y-4">
            <FormField label={locale === "ar" ? "خطة الاشتراك" : "Subscription Plan"} htmlFor="plan">
              <Select value={plan} onValueChange={(val: any) => setPlan(val)}>
                <SelectTrigger id="plan">
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label={locale === "ar" ? "تاريخ انتهاء الاشتراك" : "Plan Expiration Date"} htmlFor="expiryDate">
              <Input id="expiryDate" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </FormField>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {locale === "ar" ? "تحديث الاشتراك" : "Update Plan"}
              </Button>
            </div>
          </form>
        )}

        {activeTab === "stats" && (
          <div className="space-y-6">
            {loadingStats ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <span className="text-xs font-bold uppercase tracking-wider">{locale === "ar" ? "جاري تحميل الإحصائيات..." : "Loading stats..."}</span>
              </div>
            ) : stats ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border bg-[#f8fafc] p-4 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-primary text-primary mx-auto mb-3">
                    <Users className="size-5" />
                  </div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    {locale === "ar" ? "الموظفين" : "Employees"}
                  </p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{stats.employees}</p>
                </div>

                <div className="rounded-lg border bg-[#f8fafc] p-4 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e6fcf5] text-[#0ca678] mx-auto mb-3">
                    <FileText className="size-5" />
                  </div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    {locale === "ar" ? "الفواتير المصدرة" : "Invoices"}
                  </p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{stats.invoices}</p>
                </div>

                <div className="rounded-lg border bg-[#f8fafc] p-4 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff9db] text-[#f59f00] mx-auto mb-3">
                    <GitBranch className="size-5" />
                  </div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    {locale === "ar" ? "الفروع" : "Branches"}
                  </p>
                  <p className="text-2xl font-black text-gray-900 mt-1">{stats.branches}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-danger font-bold text-xs uppercase tracking-wider">
                {locale === "ar" ? "فشل تحميل الإحصائيات" : "Failed to load usage statistics."}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={onClose}>
                {locale === "ar" ? "إغلاق" : "Close"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
