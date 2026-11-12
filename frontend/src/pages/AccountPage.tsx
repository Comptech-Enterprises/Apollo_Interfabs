import React, { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { apiAuth } from "@/lib/api";
import { Field, PageHeader, SubmitButton } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";

export function AccountPage() {
  const { user, updateUser, can } = useAuth();
  const canChangePw = can("account.changePassword");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setErrors({ currentPassword: "Enter your current password" });
      return;
    }
    if (newPassword.length < 8) {
      setErrors({ newPassword: "New password must be at least 8 characters" });
      return;
    }
    if (currentPassword === newPassword) {
      setErrors({ newPassword: "New password must be different from current password" });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const res = await apiAuth.changePassword({ currentPassword, newPassword });
      toast.success(res.message);
      updateUser({ mustChangePassword: false });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      if (err.fields) setErrors(err.fields);
      toast.error(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Account" />
      {user?.mustChangePassword && (
        <p
          role="status"
          className="mx-auto mb-4 max-w-md rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          Please choose a new password to replace your temporary one.
        </p>
      )}
      <div className="mx-auto max-w-md space-y-4">
        {user && (
          <div className="card">
            <p className="text-sm text-slate-500">Signed in as</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">{user.name}</p>
            <p className="text-xs font-semibold text-red-600">{user.role}</p>
          </div>
        )}
        {canChangePw ? (
          <form onSubmit={handleSubmit} className="card space-y-4" noValidate>
            <h2 className="text-lg font-bold text-slate-900">Change password</h2>
            <Field label="Current password" name="currentPassword" error={errors.currentPassword}>
              <PasswordInput
                id="currentPassword"
                name="currentPassword"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </Field>
            <Field
              label="New password"
              name="newPassword"
              error={errors.newPassword}
              hint="At least 8 characters"
            >
              <PasswordInput
                id="newPassword"
                name="newPassword"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            <SubmitButton loading={loading} className="btn-primary w-full cursor-pointer">
              Update password
            </SubmitButton>
          </form>
        ) : (
          <div className="card text-sm text-slate-600">
            Password changes are disabled for your role. Contact the Owner if you need a password reset.
          </div>
        )}
      </div>
    </>
  );
}
