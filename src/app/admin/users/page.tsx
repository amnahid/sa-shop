"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FormField } from "@/components/app/FormField";
import { 
  listUsers, 
  updateUserStatus, 
  resetUserPassword, 
  setUserSuspension 
} from "@/lib/actions/admin-users";
import { 
  Search, 
  Loader2, 
  ShieldCheck, 
  UserX, 
  UserCheck, 
  Key
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isSuperAdmin: boolean;
  emailVerifiedAt?: string;
  createdAt: string;
}

interface RawUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isSuperAdmin?: boolean;
  emailVerifiedAt?: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { showToast } = useToast();
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Password reset modal states
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [submittingPassword, setSubmittingPassword] = useState(false);

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
    const res = await listUsers(debouncedSearch, page, 10);
    setLoading(false);

    if ("error" in res) {
      showToast(res.error || "Failed to load users", "error");
    } else {
      const formattedRows: UserRow[] = ((res.users ?? []) as unknown as RawUser[]).map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        isSuperAdmin: u.isSuperAdmin === true,
        emailVerifiedAt: u.emailVerifiedAt,
        createdAt: u.createdAt,
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

  // Actions
  const handleToggleAdmin = async (user: UserRow) => {
    const confirm = window.confirm(
      user.isSuperAdmin
        ? `Are you sure you want to DEMOTE ${user.name} from Super Admin?`
        : `Are you sure you want to PROMOTE ${user.name} to Super Admin?`
    );
    if (!confirm) return;

    setLoading(true);
    const res = await updateUserStatus(user.id, !user.isSuperAdmin);
    setLoading(false);

    if ("error" in res) {
      showToast(res.error || "Failed to update admin status", "error");
    } else {
      showToast(`User status updated successfully`, "success");
      loadData();
    }
  };

  const handleToggleSuspension = async (user: UserRow) => {
    const isCurrentlySuspended = !user.emailVerifiedAt;
    const confirm = window.confirm(
      isCurrentlySuspended
        ? `Are you sure you want to REACTIVATE ${user.name}?`
        : `Are you sure you want to SUSPEND ${user.name}? This will log them out and block access immediately.`
    );
    if (!confirm) return;

    setLoading(true);
    const res = await setUserSuspension(user.id, !isCurrentlySuspended);
    setLoading(false);

    if ("error" in res) {
      showToast(res.error || "Failed to toggle suspension", "error");
    } else {
      showToast(res.message || "Suspension toggled", "success");
      loadData();
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !newPassword || newPassword.length < 6) {
      showToast("Password must be at least 6 characters long", "error");
      return;
    }

    setSubmittingPassword(true);
    const res = await resetUserPassword(resetUser.id, newPassword);
    setSubmittingPassword(false);

    if ("error" in res) {
      showToast(res.error || "Failed to reset password", "error");
    } else {
      showToast(`Password for ${resetUser.name} has been updated`, "success");
      setResetUser(null);
      setNewPassword("");
    }
  };

  const columns: DataTableColumn<UserRow>[] = [
    {
      key: "name",
      header: "User Profile",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 leading-tight">{r.name}</span>
          {r.phone && <span className="text-[10px] text-slate-400 font-bold">{r.phone}</span>}
        </div>
      ),
    },
    {
      key: "email",
      header: "Email Address",
      render: (r) => <span className="text-xs text-slate-650 font-bold">{r.email}</span>,
    },
    {
      key: "isSuperAdmin",
      header: "Super Admin",
      render: (r) => (
        r.isSuperAdmin ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
            <ShieldCheck className="size-3" />
            <span>Super Admin</span>
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-50 text-slate-400 border border-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest">
            Regular
          </span>
        )
      ),
    },
    {
      key: "status",
      header: "Account Status",
      render: (r) => {
        const isSuspended = !r.emailVerifiedAt;
        return (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
            isSuspended 
              ? "bg-red-50 text-red-700 border-red-200" 
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}>
            {isSuspended ? "suspended" : "active"}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Registered On",
      render: (r) => (
        <span className="text-xs text-slate-500 font-medium">
          {new Date(r.createdAt).toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          })}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r) => {
        const isSuspended = !r.emailVerifiedAt;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button 
              variant="outline" 
              size="xs" 
              className="font-bold flex items-center gap-1"
              onClick={() => handleToggleAdmin(r)}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{r.isSuperAdmin ? "Demote" : "Promote"}</span>
            </Button>
            <Button 
              variant="outline" 
              size="xs" 
              className="font-bold flex items-center gap-1"
              onClick={() => setResetUser(r)}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Password</span>
            </Button>
            <Button 
              variant={isSuspended ? "secondary" : "destructive"} 
              size="xs" 
              className="font-bold flex items-center gap-1"
              onClick={() => handleToggleSuspension(r)}
            >
              {isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
              <span>{isSuspended ? "Reactivate" : "Suspend"}</span>
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">USER DIRECTORY</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Manage system users, promote accounts to Super Admin, override passwords, and toggle suspensions.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
        <div className="relative w-80">
          <Search className="absolute top-3 start-3 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, email or phone..."
            className="ps-9"
          />
        </div>
        <div className="text-xs font-black uppercase text-slate-400 tracking-wider">
          Total Users: {total}
        </div>
      </div>

      {/* Data Table Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Loading user profiles...
          </span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            empty={{
              title: "No users found",
              description: "No registered accounts match the current search filters.",
            }}
          />
        </div>
      )}

      {/* Reset Password Modal */}
      <Dialog open={!!resetUser} onOpenChange={(open) => !open && setResetUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
              <Key className="size-4 text-primary" />
              <span>Reset User Password</span>
            </DialogTitle>
          </DialogHeader>

          {resetUser && (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="p-3 bg-slate-50 border rounded-lg space-y-1 text-xs">
                <p className="text-slate-550 font-bold">User Information:</p>
                <p className="text-slate-800 font-extrabold">{resetUser.name}</p>
                <p className="text-slate-500 font-semibold">{resetUser.email}</p>
              </div>

              <FormField label="Enter New Password" htmlFor="newPassword" required>
                <Input 
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
              </FormField>

              <DialogFooter className="pt-4 border-t border-slate-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setResetUser(null)} disabled={submittingPassword}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submittingPassword}>
                  {submittingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Reset Password
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
