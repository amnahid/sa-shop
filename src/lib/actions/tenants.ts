"use server";

import { auth } from "@/lib/auth";
import { User, Tenant, Employee, Invoice, Branch } from "@/models";
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

export async function listTenants(search?: string, page = 1, limit = 10) {
  try {
    await requireSuperAdmin();
    
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { nameAr: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { vatNumber: { $regex: search, $options: "i" } },
      ];
    }
    
    const skip = (page - 1) * limit;
    const [tenants, total] = await Promise.all([
      Tenant.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Tenant.countDocuments(query),
    ]);
    
    return {
      tenants: JSON.parse(JSON.stringify(tenants)),
      total,
      pages: Math.ceil(total / limit),
    };
  } catch (error: any) {
    return { error: error.message || "Failed to list tenants" };
  }
}

export async function getTenantStats(tenantId: string) {
  try {
    await requireSuperAdmin();
    
    const tId = new mongoose.Types.ObjectId(tenantId);
    
    const [employeeCount, invoiceCount, branchCount] = await Promise.all([
      Employee.countDocuments({ tenantId: tId }),
      Invoice.countDocuments({ tenantId: tId }),
      Branch.countDocuments({ tenantId: tId }),
    ]);
    
    return {
      stats: {
        employees: employeeCount,
        invoices: invoiceCount,
        branches: branchCount,
      }
    };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch tenant stats" };
  }
}

export async function updateTenantDetails(
  tenantId: string,
  updateData: {
    name: string;
    nameAr: string;
    vatNumber?: string;
    crNumber?: string;
    address?: string;
    addressAr?: string;
    phone?: string;
    email?: string;
    baseCurrency?: string;
    primaryColor?: string;
  }
) {
  try {
    await requireSuperAdmin();
    
    // Clean up empty strings or nulls for unique indices like vatNumber
    const cleanedData = { ...updateData };
    if (!cleanedData.vatNumber) {
      delete cleanedData.vatNumber;
    }
    
    const updated = await Tenant.findByIdAndUpdate(
      tenantId,
      { $set: cleanedData },
      { new: true, runValidators: true }
    );
    
    return {
      tenant: JSON.parse(JSON.stringify(updated)),
      success: true,
    };
  } catch (error: any) {
    return { error: error.message || "Failed to update tenant details" };
  }
}

export async function updateTenantSubscription(
  tenantId: string,
  plan: 'starter' | 'growth' | 'pro' | 'enterprise',
  expiresAtStr?: string | null
) {
  try {
    await requireSuperAdmin();
    
    const planExpiresAt = expiresAtStr ? new Date(expiresAtStr) : undefined;
    
    const updated = await Tenant.findByIdAndUpdate(
      tenantId,
      { 
        $set: { 
          plan,
          planExpiresAt 
        } 
      },
      { new: true }
    );
    
    return {
      tenant: JSON.parse(JSON.stringify(updated)),
      success: true,
    };
  } catch (error: any) {
    return { error: error.message || "Failed to update tenant subscription" };
  }
}
