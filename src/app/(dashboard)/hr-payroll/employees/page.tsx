"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import EmployeeModal, { Employee, DEPARTMENTS } from "@/components/forms/EmployeeModal";
import {
  Loader2,
  Search,
  Plus,
  Trash2,
  FileText,
  User,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Calendar,
} from "lucide-react";

interface SalaryPaymentLog {
  _id: string;
  paymentId: string;
  amount: number;
  paymentDate: string;
  paymentType: string;
  status: string;
}

export default function EmployeesPage() {
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalMonthlySalary, setTotalMonthlySalary] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Detail Modal State
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeePayments, setEmployeePayments] = useState<SalaryPaymentLog[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "15" });
    if (search) params.set("search", search);
    if (deptFilter) params.set("department", deptFilter);

    try {
      const res = await fetch(`/api/employees?${params}`);
      const data = await res.json();
      setEmployees(data.employees || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalEmployees(data.pagination?.total || 0);
      setTotalMonthlySalary(data.totalMonthlySalary || 0);
    } catch {
      showToast("Failed to load employees", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, deptFilter, showToast]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleDeptFilterChange = (val: string) => {
    setDeptFilter(val);
    setPage(1);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === employees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(employees.map((e) => e._id as string)));
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

  const handleBulkDelete = async () => {
    if (!confirm("Are you sure you want to delete all selected employees?")) return;

    setBulkActionLoading(true);
    try {
      const res = await fetch("/api/employees/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: Array.from(selectedIds) }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Employees deleted successfully", "success");
        setSelectedIds(new Set());
        fetchEmployees();
      } else {
        showToast(data.error || "Bulk delete failed", "error");
      }
    } catch {
      showToast("Bulk delete failed due to a network error", "error");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const openDetails = async (emp: Employee) => {
    setSelectedEmployee(emp);
    setLoadingDetails(true);
    setShowDetailsModal(true);
    try {
      const res = await fetch(`/api/employees/${emp._id}`);
      const data = await res.json();
      if (res.ok) {
        setEmployeePayments(data.payments || []);
      } else {
        showToast(data.error || "Failed to load details", "error");
      }
    } catch {
      showToast("Failed to load details", "error");
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Employees Directory"
        section="Workforce"
        breadcrumbs={[{ label: "Employees" }]}
        description="Manage independent employee profiles, files, and salary payments."
        actions={
          <Button
            onClick={() => {
              setEditingEmployee(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] px-5"
          >
            <Plus className="size-4" /> Add Employee
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-white p-6 border-l-4 border-primary">
          <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Total Employees</p>
          <p className="text-3xl font-extrabold text-foreground mt-2">{totalEmployees}</p>
        </div>
        <div className="card bg-white p-6 border-l-4 border-rose-500">
          <p className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Monthly Base Salary Expenditure</p>
          <p className="text-3xl font-extrabold text-rose-500 mt-2">SAR {totalMonthlySalary.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by Employee Name, Phone or ID..."
            className="pl-9 h-11 bg-white border-border"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => handleDeptFilterChange(e.target.value)}
          className="w-full sm:w-60 h-11 rounded-lg border border-border bg-white px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shadow-sm"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk actions banner */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-primary bg-primary/5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-primary uppercase tracking-wider">
              {selectedIds.size} Employees Selected
            </span>
            <Button
              onClick={handleBulkDelete}
              disabled={bulkActionLoading}
              variant="destructive"
              size="sm"
              className="flex items-center gap-1.5 h-8 text-[10px] font-bold uppercase tracking-wider"
            >
              <Trash2 className="size-3.5" /> Delete Selected
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Cancel Selection
          </Button>
        </div>
      )}

      {/* Employees Table */}
      <div className="card bg-white overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm font-semibold">
            <Loader2 className="size-8 text-primary animate-spin mb-3" />
            Loading employees list...
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <User className="size-12 text-muted/30 mb-3" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">No Employees Found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-[#f9fafb] border-b border-border">
                <tr>
                  <th className="w-12 px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={employees.length > 0 && selectedIds.size === employees.length}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = selectedIds.size > 0 && selectedIds.size < employees.length;
                        }
                      }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-4 text-start text-[11px] font-black uppercase tracking-widest text-muted-foreground">ID</th>
                  <th className="px-6 py-4 text-start text-[11px] font-black uppercase tracking-widest text-muted-foreground">Photo</th>
                  <th className="px-6 py-4 text-start text-[11px] font-black uppercase tracking-widest text-muted-foreground">Name</th>
                  <th className="px-6 py-4 text-start text-[11px] font-black uppercase tracking-widest text-muted-foreground">Phone</th>
                  <th className="px-6 py-4 text-start text-[11px] font-black uppercase tracking-widest text-muted-foreground">Designation</th>
                  <th className="px-6 py-4 text-start text-[11px] font-black uppercase tracking-widest text-muted-foreground">Department</th>
                  <th className="px-6 py-4 text-end text-[11px] font-black uppercase tracking-widest text-muted-foreground">Base Salary</th>
                  <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                  <th className="px-6 py-4 text-end text-[11px] font-black uppercase tracking-widest text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {employees.map((emp) => (
                  <tr
                    key={emp._id}
                    className="hover:bg-muted/10 transition-colors group"
                  >
                    <td className="w-12 px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(emp._id as string)}
                        onChange={() => toggleSelect(emp._id as string)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-primary">{emp.employeeId}</td>
                    <td className="px-6 py-4">
                      {emp.photo ? (
                        <img
                          src={emp.photo}
                          alt={emp.name}
                          className="size-9 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="size-9 rounded-full bg-muted/40 border border-border flex items-center justify-center text-xs font-black text-muted-foreground">
                          {emp.name
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">{emp.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{emp.phone}</td>
                    <td className="px-6 py-4 font-semibold text-muted-foreground">{emp.designation}</td>
                    <td className="px-6 py-4 text-muted-foreground">{emp.department}</td>
                    <td className="px-6 py-4 text-end font-mono font-bold text-primary">SAR {emp.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                          emp.isActive
                            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-700 border-rose-500/20"
                        }`}
                      >
                        {emp.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetails(emp)}
                          className="text-primary hover:bg-primary/10"
                          title="View Details"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingEmployee(emp);
                            setShowModal(true);
                          }}
                          className="text-amber-500 hover:bg-amber-500/10"
                          title="Edit Profile"
                        >
                          <Edit2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
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
            <ChevronLeft className="size-4" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground font-semibold px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1.5"
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Employee Modal (Add/Edit) */}
      {showModal && (
        <EmployeeModal
          employee={editingEmployee}
          open={showModal}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchEmployees();
          }}
        />
      )}

      {/* Details View Modal */}
      {showDetailsModal && selectedEmployee && (
        <Dialog open={showDetailsModal} onOpenChange={(val) => !val && setShowDetailsModal(false)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Employee File: {selectedEmployee.name}</DialogTitle>
            </DialogHeader>

            {loadingDetails ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground text-sm font-semibold">
                <Loader2 className="size-6 text-primary animate-spin me-2" />
                Loading details...
              </div>
            ) : (
              <div className="space-y-6 pt-4">
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row gap-5 items-center pb-5 border-b border-border">
                  {selectedEmployee.photo ? (
                    <img
                      src={selectedEmployee.photo}
                      alt={selectedEmployee.name}
                      className="size-20 rounded-full object-cover border-2 border-primary shadow-sm"
                    />
                  ) : (
                    <div className="size-20 rounded-full bg-muted border-2 border-border flex items-center justify-center text-2xl font-black text-muted-foreground">
                      {selectedEmployee.name
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                  <div className="text-center sm:text-start flex-1">
                    <h3 className="text-xl font-bold text-foreground">{selectedEmployee.name}</h3>
                    <p className="text-sm font-semibold text-primary">{selectedEmployee.designation}</p>
                    <p className="text-xs font-semibold text-muted-foreground mt-1">{selectedEmployee.department} Department</p>
                  </div>
                  <div className="text-center sm:text-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Employee ID</span>
                    <span className="text-lg font-mono font-bold text-primary block mt-0.5">{selectedEmployee.employeeId}</span>
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-sm">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Phone</span>
                    <span className="font-semibold text-foreground block mt-1">{selectedEmployee.phone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Email</span>
                    <span className="font-semibold text-foreground block mt-1 truncate">{selectedEmployee.email || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Joining Date</span>
                    <span className="font-semibold text-foreground block mt-1 flex items-center gap-1">
                      <Calendar className="size-3.5 text-muted-foreground" />
                      {new Date(selectedEmployee.joiningDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Iqama Number</span>
                    <span className="font-mono font-bold text-foreground block mt-1">{selectedEmployee.iqamaNumber || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Iqama Expiry Date</span>
                    <span className="font-semibold text-foreground block mt-1">
                      {selectedEmployee.iqamaExpiryDate
                        ? new Date(selectedEmployee.iqamaExpiryDate).toLocaleDateString()
                        : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Passport Number</span>
                    <span className="font-mono font-bold text-foreground block mt-1">{selectedEmployee.passportNumber || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Base Salary</span>
                    <span className="font-mono font-bold text-primary block mt-1">SAR {selectedEmployee.baseSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Custom Documents List */}
                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Uploaded Documents</h4>
                  {selectedEmployee.documents && selectedEmployee.documents.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedEmployee.documents.map((doc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/10"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="size-4 text-primary shrink-0" />
                            <span className="text-xs font-semibold text-foreground truncate">{doc.title}</span>
                          </div>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="text-primary hover:bg-primary/10 shrink-0"
                          >
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="size-4" />
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-muted-foreground/60 italic">No custom files uploaded yet.</p>
                  )}
                </div>

                {/* Payments log */}
                <div className="border-t border-border pt-4">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Salary Payments Log</h4>
                  {employeePayments.length > 0 ? (
                    <div className="overflow-x-auto border border-border rounded-lg">
                      <table className="w-full text-start text-xs">
                        <thead className="bg-[#f9fafb] border-b border-border">
                          <tr>
                            <th className="px-4 py-2.5 text-start font-bold uppercase tracking-wider text-muted-foreground">ID</th>
                            <th className="px-4 py-2.5 text-start font-bold uppercase tracking-wider text-muted-foreground">Period</th>
                            <th className="px-4 py-2.5 text-start font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                            <th className="px-4 py-2.5 text-end font-bold uppercase tracking-wider text-muted-foreground">Amount</th>
                            <th className="px-4 py-2.5 text-start font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                            <th className="px-4 py-2.5 text-center font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {employeePayments.map((p) => (
                            <tr key={p._id} className="hover:bg-muted/5">
                              <td className="px-4 py-2.5 font-mono font-semibold text-primary">{p.paymentId}</td>
                              <td className="px-4 py-2.5 font-semibold text-foreground">
                                {p.paymentType} {p.status === "Cancelled" && "(Cancelled)"}
                              </td>
                              <td className="px-4 py-2.5 font-semibold text-muted-foreground">{p.paymentType}</td>
                              <td className="px-4 py-2.5 text-end font-mono font-bold text-primary">SAR {p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-4 py-2.5 text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString()}</td>
                              <td className="px-4 py-2.5 text-center">
                                <span
                                  className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${
                                    p.status === "Active"
                                      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
                                      : "bg-rose-500/10 text-rose-700 border-rose-500/20"
                                  }`}
                                >
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-muted-foreground/60 italic">No salary payments logged yet.</p>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button type="button" onClick={() => setShowDetailsModal(false)}>
                    Close File
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
