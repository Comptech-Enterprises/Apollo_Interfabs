"use client";

import { changePasswordAction } from "@/actions/auth";
import { Field, SubmitButton, useToastAction } from "@/components/ui";

export function PasswordForm() {
  const { formRef, formAction, errors } = useToastAction(changePasswordAction, { resetOnSuccess: true });
  return (
    <form ref={formRef} action={formAction} className="card space-y-4" noValidate>
      <Field label="Current password" name="currentPassword" error={errors.currentPassword}>
        <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required className="input" />
      </Field>
      <Field label="New password" name="newPassword" error={errors.newPassword} hint="At least 8 characters.">
        <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required className="input" />
      </Field>
      <SubmitButton className="btn-primary w-full">Update password</SubmitButton>
    </form>
  );
}
