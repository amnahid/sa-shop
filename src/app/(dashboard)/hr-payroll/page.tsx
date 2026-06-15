import { getCurrentMembership } from "@/lib/utils/membership";
import { Membership, EmployeeProfile, Attendance, Payroll } from "@/models";
import { PageHeader } from "@/components/app/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/app/DataTable";
import { StatusBadge } from "@/components/app/StatusBadge";
import { User, Calendar, Wallet } from "lucide-react";
import { AttendanceRecordButton } from "./AttendanceRecordButton";
import { GeneratePayrollButton } from "./GeneratePayrollButton";
import { EditEmployeeDialog } from "./EditEmployeeDialog";
import { AttendanceHistoryDialog } from "./AttendanceHistoryDialog";

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
}

interface Employee {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  jobTitle: string;
  salary: string;
}

interface PayrollRow {
  id: string;
  userId: PopulatedUser;
  month: number;
  year: number;
  netSalary: string;
  status: string;
}

export default async function HrPayrollPage() {
  const membership = await getCurrentMembership();
  if (!membership) return <div>No active membership</div>;

  const tenantId = membership.tenantId;

  // Fetch Employees
  const memberships = await Membership.find({ tenantId, status: "active" }).populate("userId");
  const profiles = await EmployeeProfile.find({ tenantId });
  
  const employees: Employee[] = memberships.map(m => {
    const user = m.userId as unknown as PopulatedUser;
    const profile = profiles.find(p => p.userId.toString() === user._id.toString());
    return {
      id: m._id.toString(),
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: m.role,
      jobTitle: profile?.jobTitle || "Not set",
      salary: profile?.baseSalary || "0",
    };
  });

  // Fetch Attendance (for today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dailyAttendance = await Attendance.find({ tenantId, date: today });

  // Fetch Payroll (last 3 months)
  const payrolls = await Payroll.find({ tenantId }).sort({ year: -1, month: -1 }).limit(10).populate("userId");

  const employeeColumns: DataTableColumn<Employee>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-bold">{r.name}</span> },
    { key: "email", header: "Email" },
    { key: "role", header: "Role", render: (r) => <StatusBadge status={r.role} variant="neutral" /> },
    { key: "jobTitle", header: "Job Title" },
    { key: "salary", header: "Base Salary", render: (r) => <span className="font-mono text-primary font-bold">SAR {r.salary}</span> },
    { key: "actions", header: "", className: "text-end", render: (r) => <EditEmployeeDialog employee={r} /> },
  ];

  const attendanceColumns: DataTableColumn<Employee>[] = [
    { key: "name", header: "Employee", render: (r) => <span className="font-bold">{r.name}</span> },
    { key: "status", header: "Status", render: (r) => {
      const record = dailyAttendance.find(a => a.userId.toString() === r.userId);
      return <StatusBadge status={record?.status || "Not recorded"} variant={record?.status === "present" ? "success" : "warning"} />;
    }},
    { key: "actions", header: "Actions", className: "text-end", render: (r) => {
      const record = dailyAttendance.find(a => a.userId.toString() === r.userId);
      return (
        <div className="flex items-center justify-end gap-2">
          <AttendanceHistoryDialog userId={r.userId} userName={r.name} />
          <AttendanceRecordButton userId={r.userId} currentStatus={record?.status} />
        </div>
      );
    }},
  ];

  const payrollColumns: DataTableColumn<PayrollRow>[] = [
    { key: "name", header: "Employee", render: (r) => <span className="font-bold">{r.userId.name}</span> },
    { key: "period", header: "Period", render: (r) => <span>{r.month}/{r.year}</span> },
    { key: "netSalary", header: "Net Salary", render: (r) => <span className="font-mono text-primary font-bold">SAR {r.netSalary}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} variant={r.status === "paid" ? "success" : "neutral"} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Human Resources"
        section="Workforce"
        breadcrumbs={[{ label: "HR & Payroll" }]}
        description="Manage your staff, track attendance, and process monthly payroll."
        actions={<GeneratePayrollButton />}
      />

      <Tabs defaultValue="employees">
        <TabsList variant="line">
          <TabsTrigger value="employees">
            <User className="size-4" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <Calendar className="size-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="payroll">
            <Wallet className="size-4" />
            Payroll
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-6">
          <DataTable
            columns={employeeColumns}
            rows={employees}
            rowKey={(r) => r.id}
            empty={{ title: "No employees found" }}
          />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <DataTable
            columns={attendanceColumns}
            rows={employees}
            rowKey={(r) => r.id}
            empty={{ title: "No attendance records today" }}
          />
        </TabsContent>

        <TabsContent value="payroll" className="mt-6">
          <DataTable
            columns={payrollColumns}
            rows={payrolls.map(p => {
              const obj = p.toObject();
              return { ...obj, id: p._id.toString() } as unknown as PayrollRow;
            })}
            rowKey={(r) => r.id}
            empty={{ title: "No payroll records generated yet" }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

