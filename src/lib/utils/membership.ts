import mongoose from "mongoose";
import { Membership } from "@/models";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";

export async function getCurrentMembership() {
  await connectDB();
  const session = await auth();
  if (!session?.user?.id) return null;

  const membership = await Membership.findOne({
    userId: new mongoose.Types.ObjectId(session.user.id),
    status: "active",
  });

  return membership;
}

export async function requireMembership() {
  const membership = await getCurrentMembership();
  if (!membership) {
    throw new Error("No active membership");
  }
  return membership;
}