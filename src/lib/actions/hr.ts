"use server";

import { revalidatePath } from "next/cache";
import { Attendance, EmployeeProfile, Membership, Payroll } from "@/models";
import { getSession } from "@/lib/auth-utils";

async function getHRContext() {
  const session = await getSession();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const membership = await Membership.findOne({ userId: session.user.id, status: "active" });
  if (!membership) {
    return { error: "No active membership" };
  }

  return {
    tenantId: membership.tenantId.toString(),
    sessionUserId: session.user.id,
  };
}

export async function updateEmployeeProfile(userId: string, data: Record<string, unknown>) {
  const auth = await getHRContext();
  if ("error" in auth) return { error: auth.error };

  const tenantId = auth.tenantId;

  await EmployeeProfile.findOneAndUpdate(
    { tenantId, userId },
    { ...data, tenantId, userId },
    { upsert: true, new: true }
  );

  revalidatePath("/hr-payroll");
  return { success: true };
}

export async function recordAttendance(userId: string, date: Date, status: string, note?: string) {
  const auth = await getHRContext();
  if ("error" in auth) return { error: auth.error };

  const tenantId = auth.tenantId;

  await Attendance.findOneAndUpdate(
    { tenantId, userId, date: new Date(date.setHours(0, 0, 0, 0)) },
    { status, note, tenantId, userId },
    { upsert: true }
  );

  revalidatePath("/hr-payroll");
  return { success: true };
}

export async function getAttendanceHistory(userId: string, from: Date, to: Date) {
  const auth = await getHRContext();
  if ("error" in auth) return { error: auth.error };

  const tenantId = auth.tenantId;

  const records = await Attendance.find({
    tenantId,
    userId,
    date: { $gte: from, $lte: to },
  }).sort({ date: -1 });

  return records.map(r => ({
    id: r._id.toString(),
    date: r.date,
    status: r.status,
    note: r.note,
  }));
}

export async function generatePayroll(month: number, year: number) {
  const auth = await getHRContext();
  if ("error" in auth) return { error: auth.error };

  const tenantId = auth.tenantId;

  const employees = await EmployeeProfile.find({ tenantId, active: true });
  
  let count = 0;
  for (const emp of employees) {
    // Skip if payroll already exists and is NOT draft (e.g. already paid or approved)
    const existing = await Payroll.findOne({ tenantId, userId: emp.userId, month, year });
    if (existing && existing.status !== 'draft') continue;

    const baseSalary = parseFloat(emp.baseSalary);
    const allowances = parseFloat(emp.housingAllowance || "0") + 
                      parseFloat(emp.transportAllowance || "0") + 
                      parseFloat(emp.otherAllowances || "0");
    const netSalary = (baseSalary + allowances).toString();

    await Payroll.findOneAndUpdate(
      { tenantId, userId: emp.userId, month, year },
      {
        baseSalary: emp.baseSalary,
        allowances: allowances.toString(),
        netSalary,
        status: 'draft',
        tenantId,
        userId: emp.userId,
      },
      { upsert: true }
    );
    count++;
  }

  revalidatePath("/hr-payroll");
  return { success: true, count };
}
