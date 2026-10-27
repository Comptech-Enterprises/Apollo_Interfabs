"use client";

import { loginAction } from "@/actions/auth";
import { Field, SubmitButton, useToastAction } from "@/components/ui";
import { PasswordInput } from "@/components/PasswordInput";

export function LoginForm() {
  const { formAction, state } = useToastAction(loginAction);
  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      <Field label="Username" name="email">
        <input id="email" name="email" type="text" autoComplete="username" required maxLength={120} className="input" placeholder="Enter your username" suppressHydrationWarning />
      </Field>
      <Field label="Password" name="password">
        <PasswordInput id="password" name="password" autoComplete="current-password" required maxLength={100} />
      </Field>
      {!state.ok && state.message && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {state.message}
        </p>
      )}
      <SubmitButton className="btn-primary w-full">Sign in</SubmitButton>
    </form>
  );
}
