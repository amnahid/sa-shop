"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import AddPaymentModal, { PAYMENT_TYPES } from "@/components/forms/AddPaymentModal";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import {
  Loader2,
  Plus,
  Trash2,
  Calendar,
  Wallet,
  ChevronLeft,
  ChevronRight,
  FilterX,
  XCircle,
} from "lucide-react";

interface SalaryPayment {
  _id: string;
  paymentId: string;
  employee: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  paymentDate: string;
  month: number;
  year: number;
  paymentType: "Monthly" | "Bonus" | "Advance" | "Deduction";
  status: "Active" | "Cancelled";
  notes?: string;
}

interface EmployeeDetail {
  _id: string;
  employeeId: string;
  name: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function SalaryPaymentsPage() {
  const { showToast } = useToast();
  const { t, locale } = useTranslation();
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [employees, setEmployees] = useState<EmployeeDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalThisMonth, setTotalThisMonth] = useState(0);
  const [totalShown, setTotalShown] = useState(0);
  const [totalPayments, setTotalPayments] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Filters
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterType, setFilterType] = useState("");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const translateMonth = (monthNum: number) => {
    const monthKeys = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];
    const key = monthKeys[monthNum - 1];
    return t(`salaryPayments.months.${key}`, MONTH_NAMES[monthNum - 1]);
  };

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "20" });
    if (filterEmployee) params.set("employeeId", filterEmployee);
    if (filterMonth) params.set("month", filterMonth);
    if (filterYear) params.set("year", filterYear);
    if (filterType) params.set("paymentType", filterType);

    try {
      const res = await fetch(`/api/salary-payments?${params}`);
      const data = await res.json();
      setPayments(data.payments || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalThisMonth(data.totalThisMonth || 0);
      setTotalShown(data.totalShown || 0);
      setTotalPayments(data.pagination?.total || 0);
    } catch {
      showToast(t("salaryPayments.loadingFailed", "Failed to load salary payments log"), "error");
    } finally {
      setLoading(false);
    }
  }, [page, filterEmployee, filterMonth, filterYear, filterType, showToast, t]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    fetch("/api/employees?limit=100&active=true")
      .then((res) => res.json())
      .then((data) => setEmployees(data.employees || []))
      .catch(console.error);
  }, []);

  const handleCancelPayment = async (id: string) => {
    if (!confirm(t("salaryPayments.confirmCancel", "Are you sure you want to cancel this salary payment? This cannot be undone."))) return;

    try {
      const res = await fetch(`/api/salary-payments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(locale === "ar" ? "تم إلغاء دفعة الراتب بنجاح" : "Salary payment cancelled successfully", "success");
        fetchPayments();
      } else {
        showToast(data.error || "Failed to cancel salary payment", "error");
      }
    } catch {
      showToast("Network error. Failed to cancel salary payment", "error");
    }
  };

  const toggleSelectAll = () => {
    const activePayments = payments.filter((p) => p.status === "Active");
    if (selectedIds.size === activePayments.length && activePayments.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activePayments.map((p) => p._id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkCancel = async () => {
    if (!confirm(t("salaryPayments.confirmCancelBulk", "Are you sure you want to cancel all selected salary payments?"))) return;

    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/salary-payments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", ids: Array.from(selectedIds) }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(locale === "ar" ? "تم إلغاء الدفعات المحددة بنجاح" : "Selected payments cancelled successfully", "success");
        setSelectedIds(new Set());
        fetchPayments();
      } else {
        showToast(data.error || "Bulk cancellation failed", "error");
      }
    } catch {
      showToast("Bulk cancellation failed due to a network error", "error");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const resetFilters = () => {
    setFilterEmployee("");
    setFilterMonth("");
    setFilterYear("");
    setFilterType("");
    setPage(1);
  };

  const TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
    Monthly: { bg: "bg-emerald-500/10", color: "text-emerald-700", border: "border-emerald-500/20" },
    Bonus: { bg: "bg-sky-500/10", color: "text-sky-700", border: "border-sky-500/20" },
    Advance: { bg: "bg-amber-500/10", color: "text-amber-700", border: "border-amber-500/20" },
    Deduction: { bg: "bg-rose-500/10", color: "text-rose-700", border: "border-rose-500/20" },
  };

  return (
    <div className="space-y-6 pb-12" dir={locale === "ar" ? "rtl" : "ltr"}>
      <PageHeader
        title={t("salaryPayments.title", "Salary Payments Log")}
        section={t("salaryPayments.section", "Workforce")}
        breadcrumbs={[{ label: t("common.payroll", "Salary Payments") }]}
        description={t("salaryPayments.description", "Record and track employee wages, bonus payouts, salary advances, and deductions.")}
        actions={
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] px-5"
          >
            <Plus className="size-4" /> {t("salaryPayments.recordSalary", "Record Salary")}
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-white p-6 border-l-4 border-rose-500">
          <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{t("salaryPayments.totalPaidMonth", "Total Paid This Month")}</p>
          <p className="text-2xl font-extrabold text-rose-500 mt-2">SAR {totalThisMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card bg-white p-6 border-l-4 border-primary">
          <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{t("salaryPayments.activeTotalShown", "Active Total Shown")}</p>
          <p className="text-2xl font-extrabold text-primary mt-2">SAR {totalShown.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="card bg-white p-6 border-l-4 border-slate-600">
          <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{t("salaryPayments.totalRecords", "Total Records")}</p>
          <p className="text-2xl font-extrabold text-foreground mt-2">{totalPayments}</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterEmployee}
          onChange={(e) => {
            setFilterEmployee(e.target.value);
            setPage(1);
          }}
          className="h-11 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shadow-sm min-w-52"
        >
          <option value="">{t("salaryPayments.allEmployees", "All Employees")}</option>
          {employees.map((e) => (
            <option key={e._id} value={e._id}>
              {e.name}
            </option>
          ))}
        </select>

        <select
          value={filterMonth}
          onChange={(e) => {
            setFilterMonth(e.target.value);
            setPage(1);
          }}
          className="h-11 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shadow-sm"
        >
          <option value="">{t("salaryPayments.allMonths", "All Months")}</option>
          {MONTH_NAMES.map((m, idx) => (
            <option key={idx} value={idx + 1}>
              {translateMonth(idx + 1)}
            </option>
          ))}
        </select>

        <select
          value={filterYear}
          onChange={(e) => {
            setFilterYear(e.target.value);
            setPage(1);
          }}
          className="h-11 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shadow-sm"
        >
          <option value="">{t("salaryPayments.allYears", "All Years")}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => {
            setFilterType(e.target.value);
            setPage(1);
          }}
          className="h-11 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shadow-sm"
        >
          <option value="">{t("salaryPayments.allTypes", "All Types")}</option>
          {PAYMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`salaryPayments.types.${type}`, type)}
            </option>
          ))}
        </select>

        {(filterEmployee || filterMonth || filterYear || filterType) && (
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs"
          >
            <FilterX className="size-4" /> {t("salaryPayments.clearFilters", "Clear Filters")}
          </Button>
        )}
      </div>

      {/* Bulk actions banner */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-primary bg-primary/5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-primary uppercase tracking-wider">
              {selectedIds.size} {t("salaryPayments.selected", "Payments Selected")}
            </span>
            <Button
              onClick={handleBulkCancel}
              disabled={bulkActionLoading}
              variant="destructive"
              size="sm"
              className="flex items-center gap-1.5 h-8 text-[10px] font-bold uppercase tracking-wider"
            >
              <XCircle className="size-3.5" /> {t("salaryPayments.cancelSelected", "Cancel Selected Payments")}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            {t("salaryPayments.cancelSelection", "Cancel Selection")}
          </Button>
        </div>
      )}

      {/* Salary Payments Table */}
      <div className="card bg-white overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm font-semibold">
            <Loader2 className="size-8 text-primary animate-spin mb-3" />
            {t("salaryPayments.loading", "Loading salary payments log...")}
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Wallet className="size-12 text-muted/30 mb-3" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t("salaryPayments.noPayments", "No Payments Recorded")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-[#f9fafb] border-b border-border">
                <tr>
                  <th className="w-12 px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={
                        payments.filter((p) => p.status === "Active").length > 0 &&
                        payments
                          .filter((p) => p.status === "Active")
                          .every((p) => selectedIds.has(p._id))
                      }
                      ref={(input) => {
                        if (input) {
                          const activePayments = payments.filter((p) => p.status === "Active");
                          input.indeterminate = selectedIds.size > 0 && selectedIds.size < activePayments.length;
                        }
                      }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-start text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("salaryPayments.paymentId", "Payment ID")}</th>
                  <th className="px-6 py-4 text-start text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("salaryPayments.employee", "Employee")}</th>
                  <th className="px-6 py-4 text-start text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("salaryPayments.period", "Period")}</th>
                  <th className="px-6 py-4 text-start text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("salaryPayments.type", "Type")}</th>
                  <th className="px-6 py-4 text-end text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("salaryPayments.amount", "Amount")}</th>
                  <th className="px-6 py-4 text-start text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("salaryPayments.paymentDate", "Payment Date")}</th>
                  <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("salaryPayments.status", "Status")}</th>
                  <th className="px-6 py-4 text-end text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("salaryPayments.actions", "Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => {
                  const colors = TYPE_COLORS[p.paymentType] || { bg: "bg-slate-100", color: "text-slate-700", border: "border-slate-200" };
                  return (
                    <tr
                      key={p._id}
                      className={`hover:bg-muted/10 transition-colors group ${
                        p.status === "Cancelled" ? "opacity-60 bg-muted/5" : ""
                      }`}
                    >
                      <td className="w-12 px-6 py-4 text-center">
                        {p.status === "Active" && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p._id)}
                            onChange={() => toggleSelect(p._id)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-primary">{p.paymentId}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-foreground">{p.employeeName}</div>
                        <div className="text-[10px] font-bold font-mono text-muted-foreground tracking-wider mt-0.5">{p.employeeId}</div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {translateMonth(p.month)} {p.year}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${colors.bg} ${colors.color} ${colors.border}`}
                        >
                          {t(`salaryPayments.types.${p.paymentType}`, p.paymentType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-end font-mono font-bold text-foreground">
                        {p.paymentType === "Deduction" ? "-" : ""}SAR {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                            p.status === "Active"
                              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-700 border-rose-500/20"
                          }`}
                        >
                          {t(`salaryPayments.statuses.${p.status}`, p.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-end">
                        {p.status === "Active" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelPayment(p._id)}
                            className="text-rose-500 hover:bg-rose-500/10 text-xs font-bold uppercase tracking-wider h-8"
                          >
                            {t("salaryPayments.cancelPayment", "Cancel Payment")}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1.5"
          >
            <ChevronLeft className="size-4" /> {locale === "ar" ? "السابق" : "Previous"}
          </Button>
          <span className="text-xs text-muted-foreground font-semibold px-2">
            {locale === "ar" ? `الصفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5"
          >
            {locale === "ar" ? "التالي" : "Next"} <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Add Salary Payment Modal */}
      {showAddModal && (
        <AddPaymentModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            fetchPayments();
          }}
        />
      )}
    </div>
  );
}
