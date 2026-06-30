import mongoose from "mongoose";
import { Membership, User } from "@/models";
import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";

export async function getCurrentMembership() {
  await connectDB();
  const session = await auth();
  if (!session?.user) return null;

  let userIdStr = session.user.id;
  if (!userIdStr && session.user.email) {
    const user = await User.findOne({ email: session.user.email.toLowerCase() }).select({ _id: 1 });
    if (user) {
      userIdStr = user._id.toString();
    }
  }

  if (!userIdStr) return null;

  const membership = await Membership.findOne({
    userId: new mongoose.Types.ObjectId(userIdStr),
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