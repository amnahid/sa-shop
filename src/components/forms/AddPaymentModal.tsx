"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/app/FormField";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { Loader2 } from "lucide-react";

interface EmployeeDetail {
  _id: string;
  employeeId: string;
  name: string;
  baseSalary: number;
}

interface AddPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const PAYMENT_TYPES = ["Monthly", "Bonus", "Advance", "Deduction"] as const;

export default function AddPaymentModal({ open, onClose, onSave }: AddPaymentModalProps) {
  const { showToast } = useToast();
  const { t, locale } = useTranslation();
  const [employees, setEmployees] = useState<EmployeeDetail[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(true);
  const [form, setForm] = useState({
    employeeId: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentType: "Monthly" as typeof PAYMENT_TYPES[number],
    notes: "",
  });

  useEffect(() => {
    if (open) {
      setFetchingEmployees(true);
      fetch("/api/employees?limit=100&active=true")
        .then((res) => res.json())
        .then((data) => {
          setEmployees(data.employees || []);
        })
        .catch(() => {
          showToast(locale === "ar" ? "فشل في جلب قائمة الموظفين" : "Failed to fetch employees list", "error");
        })
        .finally(() => {
          setFetchingEmployees(false);
        });
    }
  }, [open, showToast, locale]);

  const handleEmployeeChange = (empId: string) => {
    const emp = employees.find((e) => e._id === empId) || null;
    setSelectedEmployee(emp);
    setForm((f) => ({
      ...f,
      employeeId: empId,
      amount: emp ? emp.baseSalary.toString() : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) {
      showToast(t("salaryPayments.selectEmployeeError", "Please select an employee"), "error");
      return;
    }

    setLoading(true);
    try {
      const paymentDate = new Date(form.paymentDate);
      const res = await fetch("/api/salary-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee: selectedEmployee._id,
          employeeId: selectedEmployee.employeeId,
          employeeName: selectedEmployee.name,
          amount: parseFloat(form.amount) || 0,
          paymentDate: form.paymentDate,
          month: paymentDate.getMonth() + 1,
          year: paymentDate.getFullYear(),
          paymentType: form.paymentType,
          notes: form.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || (locale === "ar" ? "فشل في تسجيل دفعة الراتب" : "Failed to record payment"), "error");
        return;
      }

      showToast(t("salaryPayments.recordSuccess", "Salary payment recorded successfully"), "success");
      onSave();
      onClose();
    } catch {
      showToast(locale === "ar" ? "حدث خطأ أثناء تسجيل الدفعة" : "An error occurred while recording payment", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("salaryPayments.recordSalaryPayment", "Record Salary Payment")}</DialogTitle>
        </DialogHeader>

        {fetchingEmployees ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm font-semibold" dir={locale === "ar" ? "rtl" : "ltr"}>
            <Loader2 className="size-5 animate-spin me-2" />
            {locale === "ar" ? "جاري تحميل قائمة الموظفين..." : "Loading employees list..."}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-4" dir={locale === "ar" ? "rtl" : "ltr"}>
            <FormField label={`${t("salaryPayments.selectEmployee", "Select Employee")} *`} htmlFor="employeeSelect">
              <select
                id="employeeSelect"
                required
                value={form.employeeId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shadow-sm"
              >
                <option value="">{t("salaryPayments.chooseEmployee", "-- Choose Employee --")}</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>
                    {e.name} ({e.employeeId})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={`${t("salaryPayments.amount", "Amount")} (SAR) *`} htmlFor="amount">
              <Input
                id="amount"
                required
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
              />
            </FormField>

            <FormField label={`${t("salaryPayments.paymentDate", "Payment Date")} *`} htmlFor="paymentDate">
              <Input
                id="paymentDate"
                required
                type="date"
                value={form.paymentDate}
                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
              />
            </FormField>

            <FormField label={`${t("salaryPayments.type", "Payment Type")} *`} htmlFor="paymentType">
              <select
                id="paymentType"
                required
                value={form.paymentType}
                onChange={(e) => setForm({ ...form, paymentType: e.target.value as any })}
                className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shadow-sm"
              >
                {PAYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`salaryPayments.types.${type}`, type)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t("salaryPayments.notes", "Notes")} htmlFor="notes">
              <textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t("salaryPayments.notesPlaceholder", "Additional payment details, bonus description, deduction reasons...")}
                className="w-full min-h-20 rounded-lg border border-border bg-card p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shadow-sm resize-none"
              />
            </FormField>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="size-4 me-2 animate-spin" />}
                {t("salaryPayments.savePayment", "Save Payment")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
