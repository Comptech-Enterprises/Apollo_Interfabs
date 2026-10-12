"use client";

import { useRouter } from "next/navigation";
import { changePasswordAction } from "@/actions/auth";
import { Field, SubmitButton, useToastAction } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";

export function PasswordForm() {
  const router = useRouter();
  const { formRef, formAction, errors } = useToastAction(changePasswordAction, {
    resetOnSuccess: true,
    onSuccess: () => {
      // Redirect to dashboard immediately after changing password so the prompt is gone
      router.push("/dashboard");
      router.refresh();
    },
  });
  return (
    <form ref={formRef} action={formAction} className="card space-y-4" noValidate>
      <Field label="Current password" name="currentPassword" error={errors.currentPassword}>
        <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" required maxLength={100} />
      </Field>
      <Field label="New password" name="newPassword" error={errors.newPassword} hint="At least 8 characters.">
        <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" required minLength={8} maxLength={100} />
      </Field>
      <SubmitButton className="btn-primary w-full">Update password</SubmitButton>
    </form>
  );
}
