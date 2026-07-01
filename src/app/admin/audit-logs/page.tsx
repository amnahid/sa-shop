"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { listAuditLogs } from "@/lib/actions/admin-logs";
import { 
  Loader2, 
  History, 
  Eye, 
  Filter, 
  Database
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface AuditLog {
  _id: string;
  tenantId: string;
  tenantName: string;
  tenantNameAr: string;
  userId?: {
    name: string;
    email: string;
  };
  action: "create" | "update" | "delete" | "void";
  collection: string;
  documentId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  timestamp: string;
}

export default function AdminAuditLogsPage() {
  const { showToast } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  
  // Detail modal
  const [viewLog, setViewLog] = useState<AuditLog | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const filters: { action?: string; collectionName?: string } = {};
    if (selectedAction !== "all") {
      filters.action = selectedAction;
    }
    if (selectedCollection.trim()) {
      filters.collectionName = selectedCollection.trim().toLowerCase();
    }

    const res = await listAuditLogs(filters, page, 15);
    setLoading(false);

    if ("error" in res) {
      showToast(res.error || "Failed to load audit logs", "error");
    } else {
      setLogs(res.logs ?? []);
      setTotal(res.total ?? 0);
    }
  }, [selectedAction, selectedCollection, page, showToast]);

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

  const handleApplyFilters = () => {
    setPage(1);
    loadData();
  };

  const columns: DataTableColumn<AuditLog>[] = [
    {
      key: "timestamp",
      header: "Timestamp",
      render: (r) => (
        <span className="text-xs font-mono text-slate-500 font-medium">
          {new Date(r.timestamp).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short"
          })}
        </span>
      ),
    },
    {
      key: "tenant",
      header: "Business Organization",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-900 leading-tight">{r.tenantName}</span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{r.tenantNameAr}</span>
        </div>
      ),
    },
    {
      key: "user",
      header: "Performed By",
      render: (r) => (
        r.userId ? (
          <div className="flex flex-col">
            <span className="font-bold text-slate-950 text-xs">{r.userId.name}</span>
            <span className="text-[10px] text-slate-500 font-semibold">{r.userId.email}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-medium italic">System</span>
        )
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (r) => {
        const colors: Record<string, string> = {
          create: "bg-emerald-50 text-emerald-700 border-emerald-200",
          update: "bg-blue-50 text-blue-700 border-blue-200",
          delete: "bg-red-50 text-red-700 border-red-200",
          void: "bg-amber-50 text-amber-700 border-amber-200",
        };
        return (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${colors[r.action] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
            {r.action}
          </span>
        );
      },
    },
    {
      key: "collection",
      header: "Resource Model",
      render: (r) => (
        <span className="inline-flex items-center gap-1 text-xs text-slate-650 font-bold">
          <Database className="size-3.5 text-slate-400" />
          <span>{r.collection}</span>
        </span>
      ),
    },
    {
      key: "documentId",
      header: "Document ID",
      render: (r) => (
        <span className="font-mono text-xs text-slate-400 font-bold">
          {r.documentId}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Inspection",
      align: "right",
      render: (r) => (
        <Button 
          variant="outline" 
          size="xs" 
          className="font-bold flex items-center gap-1.5"
          onClick={() => setViewLog(r)}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Inspect</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">AUDIT HISTORY</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Monitor system mutations, data changes, and administrative actions platform-wide.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex-wrap lg:flex-nowrap">
        <div className="flex items-center gap-4 flex-wrap lg:flex-nowrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Action:</span>
            <Select value={selectedAction} onValueChange={setSelectedAction}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Collection:</span>
            <Input
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              placeholder="e.g. products, tenants..."
              className="w-48 h-9"
            />
          </div>

          <Button size="sm" onClick={handleApplyFilters} className="font-bold flex items-center gap-1.5 h-9 px-4">
            <Filter className="size-3.5" />
            <span>Apply Filters</span>
          </Button>
        </div>

        <div className="text-xs font-black uppercase text-slate-400 tracking-wider">
          Total Logs: {total}
        </div>
      </div>

      {/* Data Table Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-lg shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Fetching system logs...
          </span>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            rows={logs}
            rowKey={(r) => r._id}
            empty={{
              title: "No audit logs found",
              description: "No database mutations match the applied filter criteria.",
            }}
          />
        </div>
      )}

      {/* Audit Detail Modal */}
      <Dialog open={!!viewLog} onOpenChange={(open) => !open && setViewLog(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
              <History className="size-4 text-primary" />
              <span>Inspect Database Mutation</span>
            </DialogTitle>
          </DialogHeader>

          {viewLog && (
            <div className="space-y-6">
              {/* Profile Details */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                <div className="space-y-1">
                  <p className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Business Context</p>
                  <p className="text-slate-800 font-extrabold">{viewLog.tenantName} ({viewLog.tenantId})</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Resource Mutated</p>
                  <p className="text-slate-800 font-extrabold">Model: {viewLog.collection} | ID: {viewLog.documentId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Actor Account</p>
                  <p className="text-slate-800 font-extrabold">{viewLog.userId ? `${viewLog.userId.name} (${viewLog.userId.email})` : "System / Global"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Timestamp</p>
                  <p className="text-slate-800 font-extrabold">{new Date(viewLog.timestamp).toString()}</p>
                </div>
              </div>

              {/* Diffs JSON Viewer */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Mutation Payload Diff</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Before */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-red-500 tracking-wider">Before State</p>
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg overflow-x-auto text-[11px] font-mono text-slate-300 max-h-64">
                      {viewLog.before ? (
                        <pre>{JSON.stringify(viewLog.before, null, 2)}</pre>
                      ) : (
                        <span className="italic text-slate-500">[Nil / Empty State]</span>
                      )}
                    </div>
                  </div>

                  {/* After */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-wider">After State</p>
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg overflow-x-auto text-[11px] font-mono text-slate-300 max-h-64">
                      {viewLog.after ? (
                        <pre>{JSON.stringify(viewLog.after, null, 2)}</pre>
                      ) : (
                        <span className="italic text-slate-500">[Deleted / Voided]</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setViewLog(null)}>
                  Close Inspection
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
