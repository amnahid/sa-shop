"use server";

import { auth } from "@/lib/auth";
import { User, Tenant, Branch, Membership, Invoice, Product } from "@/models";
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
  } catch (error) {
    const err = error as Error;
    return { error: err.message || "Failed to list tenants" };
  }
}

export async function getTenantDetails(tenantId: string) {
  try {
    await requireSuperAdmin();
    
    const tId = new mongoose.Types.ObjectId(tenantId);
    
    const [tenant, branches, memberships, invoiceCount, productCount] = await Promise.all([
      Tenant.findById(tId),
      Branch.find({ tenantId: tId }),
      Membership.find({ tenantId: tId }).populate({
        path: "userId",
        select: "name email phone isSuperAdmin",
        model: User
      }),
      Invoice.countDocuments({ tenantId: tId }),
      Product.countDocuments({ tenantId: tId }),
    ]);
    
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    
    return {
      tenant: JSON.parse(JSON.stringify(tenant)),
      branches: JSON.parse(JSON.stringify(branches)),
      memberships: JSON.parse(JSON.stringify(memberships)),
      stats: {
        invoiceCount,
        productCount,
        branchCount: branches.length,
        memberCount: memberships.length,
      },
      success: true,
    };
  } catch (error) {
    const err = error as Error;
    return { error: err.message || "Failed to fetch tenant details" };
  }
}

export async function toggleTenantStatus(tenantId: string, suspend: boolean) {
  try {
    await requireSuperAdmin();
    
    const tId = new mongoose.Types.ObjectId(tenantId);
    const newStatus = suspend ? "suspended" : "active";
    
    // Update tenant record
    const updatedTenant = await Tenant.findByIdAndUpdate(
      tId,
      { $set: { status: newStatus } },
      { new: true }
    );
    
    if (!updatedTenant) {
      throw new Error("Tenant not found");
    }
    
    // Suspend or activate all memberships under this tenant
    await Membership.updateMany(
      { tenantId: tId },
      { $set: { status: suspend ? "suspended" : "active" } }
    );
    
    return {
      tenant: JSON.parse(JSON.stringify(updatedTenant)),
      success: true,
      message: suspend ? "Tenant suspended successfully" : "Tenant activated successfully",
    };
  } catch (error) {
    const err = error as Error;
    return { error: err.message || "Failed to update tenant activation state" };
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
  } catch (error) {
    const err = error as Error;
    return { error: err.message || "Failed to update tenant details" };
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
  } catch (error) {
    const err = error as Error;
    return { error: err.message || "Failed to update tenant subscription" };
  }
}
