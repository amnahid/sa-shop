"use server";

import { auth } from "@/lib/auth";
import { User, Tenant, AuditLog } from "@/models";
import mongoose from "mongoose";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  
  const user = await User.findById(session.user.id);
  const systemAdminEmails = (process.env.SYSTEM_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
  const isSuperAdmin = user?.isSuperAdmin || (user?.email && systemAdminEmails.includes(user.email.toLowerCase()));
  
  if (!isSuperAdmin) {
    throw new Error("Unauthorized: Super Admin access required");
  }
}

export async function listAuditLogs(
  filters: {
    tenantId?: string;
    userId?: string;
    action?: string;
    collectionName?: string;
  } = {},
  page = 1,
  limit = 20
) {
  try {
    await requireSuperAdmin();
    
    const query: any = {};
    
    if (filters.tenantId) {
      query.tenantId = new mongoose.Types.ObjectId(filters.tenantId);
    }
    if (filters.userId) {
      query.userId = new mongoose.Types.ObjectId(filters.userId);
    }
    if (filters.action) {
      query.action = filters.action;
    }
    if (filters.collectionName) {
      query.collection = filters.collectionName;
    }
    
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: "userId",
          select: "name email",
          model: User
        }),
      AuditLog.countDocuments(query),
    ]);
    
    // We also want to fetch the tenant names dynamically to make the logs human readable
    const tenantIds = Array.from(new Set(logs.map(l => l.tenantId?.toString()).filter(Boolean)));
    const tenants = await Tenant.find({ _id: { $in: tenantIds } }).select("name nameAr");
    const tenantMap = tenants.reduce((acc, t) => {
      acc[t._id.toString()] = { name: t.name, nameAr: t.nameAr };
      return acc;
    }, {} as Record<string, { name: string; nameAr: string }>);
    
    const logsWithTenants = logs.map(log => {
      const logObj = log.toObject();
      const tInfo = tenantMap[log.tenantId?.toString() ?? ""];
      return {
        ...logObj,
        tenantName: tInfo ? tInfo.name : "System / Global",
        tenantNameAr: tInfo ? tInfo.nameAr : "النظام / عام",
      };
    });
    
    return {
      logs: JSON.parse(JSON.stringify(logsWithTenants)),
      total,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    const err = error as Error;
    return { error: err.message || "Failed to list audit logs" };
  }
}
