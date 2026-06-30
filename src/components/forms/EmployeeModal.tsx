"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/app/FormField";
import { ImageUpload } from "@/components/app/ImageUpload";
import { useToast } from "@/components/ui/toast";
import { Loader2, Plus, Trash2, FileText, Upload } from "lucide-react";

export interface ICustomDocument {
  title: string;
  url: string;
}

export interface Employee {
  _id?: string;
  employeeId?: string;
  name: string;
  phone: string;
  email?: string;
  passportNumber?: string;
  iqamaNumber?: string;
  iqamaExpiryDate?: string;
  designation: string;
  department: string;
  baseSalary: number;
  commissionRate?: number;
  joiningDate: string;
  isActive: boolean;
  photo?: string;
  documents: ICustomDocument[];
}

export const DEPARTMENTS = ["Sales", "Service", "Accounts", "Finance", "Admin", "Management", "Operations"] as const;

interface EmployeeModalProps {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function EmployeeModal({ employee, open, onClose, onSave }: EmployeeModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [form, setForm] = useState<Omit<Employee, "_id" | "employeeId">>({
    name: employee?.name || "",
    phone: employee?.phone || "",
    email: employee?.email || "",
    passportNumber: employee?.passportNumber || "",
    iqamaNumber: employee?.iqamaNumber || "",
    iqamaExpiryDate: employee?.iqamaExpiryDate ? employee.iqamaExpiryDate.split("T")[0] : "",
    designation: employee?.designation || "",
    department: employee?.department || "Sales",
    baseSalary: employee?.baseSalary || 0,
    commissionRate: employee?.commissionRate || 0,
    joiningDate: employee?.joiningDate ? employee?.joiningDate.split("T")[0] : new Date().toISOString().split("T")[0],
    isActive: employee?.isActive !== false,
    photo: employee?.photo || "",
    documents: employee?.documents || [],
  });

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newDocTitle.trim()) {
      showToast("Please enter a custom title for the document first", "error");
      return;
    }

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (res.ok && result.asset?.url) {
        setForm((prev) => ({
          ...prev,
          documents: [...prev.documents, { title: newDocTitle.trim(), url: result.asset.url }],
        }));
        setNewDocTitle("");
        showToast("Document uploaded successfully", "success");
      } else {
        showToast(result.error?.message || "Failed to upload document", "error");
      }
    } catch {
      showToast("An error occurred during document upload", "error");
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  const removeDocument = (index: number) => {
    setForm((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = employee?._id ? `/api/employees/${employee._id}` : "/api/employees";
      const method = employee?._id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Failed to save employee profile", "error");
        return;
      }

      showToast(employee?._id ? "Employee updated successfully" : "Employee created successfully", "success");
      onSave();
      onClose();
    } catch {
      showToast("An error occurred while saving employee", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee?._id ? `Edit Employee: ${employee.name}` : "Add New Employee"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Photo Upload */}
          <div className="flex justify-center">
            <ImageUpload
              value={form.photo ? [form.photo] : []}
              onChange={(urls) => setForm((prev) => ({ ...prev, photo: urls[0] || "" }))}
              maxImages={1}
              label="Employee Photo"
              previewSize="compact"
              className="w-full max-w-[200px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Full Name *" htmlFor="name">
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
              />
            </FormField>

            <FormField label="Phone Number *" htmlFor="phone">
              <Input
                id="phone"
                required
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+966 50 000 0000"
              />
            </FormField>

            <FormField label="Email Address" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@example.com"
              />
            </FormField>

            <FormField label="Designation *" htmlFor="designation">
              <Input
                id="designation"
                required
                value={form.designation}
                onChange={(e) => setForm((prev) => ({ ...prev, designation: e.target.value }))}
                placeholder="Sales Executive"
              />
            </FormField>

            <FormField label="Department *" htmlFor="department">
              <select
                id="department"
                required
                value={form.department}
                onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                className="w-full h-11 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shadow-sm"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Base Salary (SAR) *" htmlFor="baseSalary">
              <Input
                id="baseSalary"
                required
                type="number"
                min="0"
                step="0.01"
                value={form.baseSalary}
                onChange={(e) => setForm((prev) => ({ ...prev, baseSalary: parseFloat(e.target.value) || 0 }))}
              />
            </FormField>

            <FormField label="Commission Rate (%)" htmlFor="commissionRate">
              <Input
                id="commissionRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.commissionRate}
                onChange={(e) => setForm((prev) => ({ ...prev, commissionRate: parseFloat(e.target.value) || 0 }))}
              />
            </FormField>

            <FormField label="Joining Date *" htmlFor="joiningDate">
              <Input
                id="joiningDate"
                required
                type="date"
                value={form.joiningDate}
                onChange={(e) => setForm((prev) => ({ ...prev, joiningDate: e.target.value }))}
              />
            </FormField>

            <FormField label="Iqama Number" htmlFor="iqamaNumber">
              <Input
                id="iqamaNumber"
                value={form.iqamaNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, iqamaNumber: e.target.value }))}
                placeholder="2000000000"
              />
            </FormField>

            <FormField label="Iqama Expiry Date" htmlFor="iqamaExpiryDate">
              <Input
                id="iqamaExpiryDate"
                type="date"
                value={form.iqamaExpiryDate}
                onChange={(e) => setForm((prev) => ({ ...prev, iqamaExpiryDate: e.target.value }))}
              />
            </FormField>

            <FormField label="Passport Number" htmlFor="passportNumber">
              <Input
                id="passportNumber"
                value={form.passportNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, passportNumber: e.target.value }))}
                placeholder="L0000000"
              />
            </FormField>
          </div>

          {/* Custom Document Uploads Section */}
          <div className="space-y-3 border-t border-border pt-4">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Employee Documents</h4>
            
            {/* List of uploaded documents */}
            {form.documents.length > 0 && (
              <ul className="space-y-2">
                {form.documents.map((doc, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="size-4 text-primary" />
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-primary hover:underline truncate max-w-xs md:max-w-sm"
                      >
                        {doc.title}
                      </a>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDocument(idx)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {/* Document Upload Input */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="flex-1">
                <FormField label="Custom Document Title" htmlFor="docTitle">
                  <Input
                    id="docTitle"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="e.g. Contract, Iqama copy, Passport copy"
                  />
                </FormField>
              </div>
              <div className="flex items-center">
                <input
                  type="file"
                  id="docFileInput"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleDocUpload}
                  disabled={uploadingDoc || !newDocTitle.trim()}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("docFileInput")?.click()}
                  disabled={uploadingDoc || !newDocTitle.trim()}
                  className="h-11 w-full sm:w-auto flex items-center gap-2"
                >
                  {uploadingDoc ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  Upload Document
                </Button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 me-2 animate-spin" />}
              Save Employee
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
