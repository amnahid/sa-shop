"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/app/FormField";
import { ImageUpload } from "@/components/app/ImageUpload";
import { useToast } from "@/components/ui/toast";
import { updateProfile } from "@/lib/actions/team";
import { User as UserIcon } from "lucide-react";

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [avatarUrls, setAvatarUrls] = useState<string[]>(user.avatarUrl ? [user.avatarUrl] : []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if (avatarUrls.length > 0) {
      formData.set("avatarUrl", avatarUrls[0]);
    } else {
      formData.set("avatarUrl", "");
    }

    try {
      const result = await updateProfile(formData);
      if (!result.success) {
        showToast(result.error || "Failed to update profile", "error");
      } else {
        showToast("Profile updated successfully", "success");
        router.refresh();
      }
    } catch (error) {
      showToast("An unexpected error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 py-4 border-b border-gray-50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-soft-primary text-primary">
          <UserIcon className="size-4" />
        </div>
        <CardTitle className="text-sm font-bold uppercase tracking-tight">Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="pt-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <FormField label="Full Name" htmlFor="name" required>
                <Input name="name" id="name" defaultValue={user.name} required placeholder="Your full name" />
              </FormField>

              <FormField label="Email Address" htmlFor="email" hint="Contact support to change your email">
                <Input id="email" value={user.email} readOnly className="bg-gray-50/50 text-gray-400" />
              </FormField>

              <FormField label="Phone Number" htmlFor="phone">
                <Input name="phone" id="phone" defaultValue={user.phone} type="tel" placeholder="+966..." />
              </FormField>
            </div>

            <div className="space-y-4">
              <FormField label="Profile Picture" htmlFor="avatarUrl">
                <ImageUpload 
                  value={avatarUrls} 
                  onChange={setAvatarUrls} 
                  maxImages={1}
                />
              </FormField>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-50">
            <Button type="submit" disabled={loading} className="font-black uppercase tracking-widest text-[11px] px-12 h-11">
              {loading ? "Saving..." : "Save Profile Details"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
