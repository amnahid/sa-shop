"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FormField } from "@/components/app/FormField";
import { Input } from "@/components/ui/input";
import { updateEmployeeProfile } from "@/lib/actions/hr";
import { useToast } from "@/components/ui/toast";
import { Settings2, Loader2 } from "lucide-react";

interface EditEmployeeDialogProps {
  employee: {
    userId: string;
    name: string;
    jobTitle: string;
    salary: string;
  };
}

export function EditEmployeeDialog({ employee }: EditEmployeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      jobTitle: formData.get("jobTitle"),
      baseSalary: formData.get("baseSalary"),
      employeeId: `EMP-${employee.userId.slice(-4).toUpperCase()}`,
      joinDate: new Date(),
    };

    try {
      const result = await updateEmployeeProfile(employee.userId, data);
      if ("error" in result) {
        showToast(result.error || "Failed to update profile", "error");
      } else {
        showToast("Employee profile updated", "success");
        setOpen(false);
      }
    } catch {
      showToast("An error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Employee: {employee.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <FormField label="Job Title" htmlFor="jobTitle">
            <Input name="jobTitle" id="jobTitle" defaultValue={employee.jobTitle} required />
          </FormField>
          <FormField label="Base Salary (SAR)" htmlFor="baseSalary">
            <Input name="baseSalary" id="baseSalary" type="number" step="0.01" defaultValue={employee.salary} required />
          </FormField>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="size-4 me-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
