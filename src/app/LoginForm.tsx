"use client";

import { loginAction } from "@/actions/auth";
import { Field, SubmitButton, useToastAction } from "@/components/ui";

export function LoginForm() {
  const { formAction, state } = useToastAction(loginAction);
  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      <Field label="Email" name="email">
        <input id="email" name="email" type="email" autoComplete="username" required className="input" />
      </Field>
      <Field label="Password" name="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
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
