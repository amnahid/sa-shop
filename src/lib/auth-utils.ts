"use server";

import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";

export async function getSession() {
  await connectDB();
  return auth();
}

export async function requireAuth() {
  await connectDB();
  const session = await auth();
  
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  
  return session;
}