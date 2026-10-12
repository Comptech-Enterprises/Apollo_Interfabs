"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/result";
import { initialResult } from "@/lib/result";

export function SubmitButton({ children, pending: _p, className = "btn-primary", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { pending?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} {...rest}>
      {pending ? "Saving..." : children}
    </button>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Wraps a server action: shows success/error toasts, keeps field errors,
 * and optionally resets the form after success.
 */
export function useToastAction(
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>,
  opts: { resetOnSuccess?: boolean; onSuccess?: () => void } = {},
) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(action, initialResult);
  const seen = useRef<ActionResult>(initialResult);

  useEffect(() => {
    if (state === seen.current || !state.message) return;
    seen.current = state;
    if (state.ok) {
      toast.success(state.message);
      if (opts.resetOnSuccess) formRef.current?.reset();
      opts.onSuccess?.();
    } else toast.error(state.message);
  }, [state, opts]);

  return { formRef, formAction, state, errors: state.ok ? {} : (state.fields ?? {}) };
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, body, children }: { title: string; body?: string; children?: React.ReactNode }) {
  return (
    <div className="card text-center">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {body && <p className="mt-1 text-sm text-slate-600">{body}</p>}
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
  );
}
