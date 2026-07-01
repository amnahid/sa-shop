"use server";

import { auth } from "@/lib/auth";
import { User, Membership } from "@/models";
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

export async function listUsers(search?: string, page = 1, limit = 10) {
  try {
    await requireSuperAdmin();
    
    const query: any = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);
    
    return {
      users: JSON.parse(JSON.stringify(users)),
      total,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    const err = error as Error;
    return { error: err.message || "Failed to list users" };
  }
}

export async function updateUserStatus(userId: string, isSuperAdmin: boolean) {
  try {
    await requireSuperAdmin();
    
    const updated = await User.findByIdAndUpdate(
      userId,
      { $set: { isSuperAdmin } },
      { new: true }
    );
    
    return {
      user: JSON.parse(JSON.stringify(updated)),
      success: true,
    };
  } catch (error) {
    const err = error as Error;
    return { error: err.message || "Failed to update user status" };
  }
}

export async function resetUserPassword(userId: string, passwordPlain: string) {
  try {
    await requireSuperAdmin();
    
    if (!passwordPlain || passwordPlain.length < 6) {
      throw new Error("Password must be at least 6 characters long");
    }
    
    const userDoc = await User.findById(userId);
    if (!userDoc) {
      throw new Error("User not found");
    }
    
    userDoc.passwordHash = passwordPlain; // Mongoose pre-save hook will hash this
    await userDoc.save();
    
    return {
      success: true,
      message: "Password reset successful",
    };
  } catch (error) {
    const err = error as Error;
    return { error: err.message || "Failed to reset password" };
  }
}

export async function setUserSuspension(userId: string, suspend: boolean) {
  try {
    await requireSuperAdmin();
    
    const uId = new mongoose.Types.ObjectId(userId);
    
    // Suspend or activate all memberships for this user
    await Membership.updateMany(
      { userId: uId },
      { $set: { status: suspend ? "suspended" : "active" } }
    );
    
    // As a secondary block, toggle emailVerifiedAt so the Credentials authorize check throws
    const userDoc = await User.findById(userId);
    if (userDoc) {
      if (suspend) {
        // Backup emailVerifiedAt if we want to store it (or just clear it)
        userDoc.emailVerifiedAt = undefined;
      } else {
        userDoc.emailVerifiedAt = new Date();
      }
      await userDoc.save();
    }
    
    return {
      success: true,
      message: suspend ? "User successfully suspended" : "User successfully activated",
    };
  } catch (error) {
    const err = error as Error;
    return { error: err.message || "Failed to toggle user suspension" };
  }
}
