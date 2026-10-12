"use client";

import { useRef } from "react";
import { createUserAction, resetPasswordAction, setUserActiveAction } from "@/actions/users";
import { Field, SubmitButton, useToastAction } from "@/components/ui";
import { ToggleActiveButton } from "@/components/ToggleActiveButton";
import { PasswordInput } from "@/components/PasswordInput";

export function CreateUserForm() {
  const { formRef, formAction, errors } = useToastAction(createUserAction, { resetOnSuccess: true });
  return (
    <form ref={formRef} action={formAction} className="card space-y-4" noValidate>
      <h2 className="text-lg font-bold">Add user</h2>
      <Field label="Name" name="name" error={errors.name}>
        <input id="name" name="name" required maxLength={100} className="input" autoComplete="off" />
      </Field>
      <Field label="Email" name="email" error={errors.email}>
        <input id="email" name="email" type="email" required maxLength={120} className="input" autoComplete="off" />
      </Field>
      <Field label="Role" name="role" error={errors.role}>
        <select id="role" name="role" defaultValue="SALES" className="input">
          <option value="SALES">Sales</option>
          <option value="MANAGER">Manager</option>
        </select>
      </Field>
      <Field label="Temporary password" name="password" error={errors.password} hint="At least 8 characters. They must change it at first sign-in.">
        <PasswordInput id="password" name="password" required minLength={8} maxLength={100} autoComplete="off" />
      </Field>
      <SubmitButton className="btn-primary w-full">Create user</SubmitButton>
    </form>
  );
}

export function ResetPassword({ id, name }: { id: string; name: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { formAction } = useToastAction(resetPasswordAction, { onSuccess: () => dialog.current?.close() });
  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => dialog.current?.showModal()}>Reset password</button>
      <dialog ref={dialog} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl p-0 backdrop:bg-slate-900/50" aria-label={`Reset password for ${name}`}>
        <form action={formAction} className="space-y-4 p-5">
          <h2 className="text-lg font-bold">Reset password for {name}</h2>
          <input type="hidden" name="id" value={id} />
          <Field label="New temporary password" name={`pw-${id}`}>
            <PasswordInput id={`pw-${id}`} name="password" required minLength={8} maxLength={100} autoComplete="off" />
          </Field>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => dialog.current?.close()}>Cancel</button>
            <SubmitButton>Reset</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

export function UserActiveToggle({ id, active }: { id: string; active: boolean }) {
  return <ToggleActiveButton noun="user" active={active} action={(a) => setUserActiveAction(id, a)} />;
}
