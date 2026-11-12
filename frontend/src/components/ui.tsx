import React from "react";
import { Link } from "react-router-dom";

export function SubmitButton({
  children,
  loading = false,
  className = "btn-primary",
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={`${className} transition-all duration-200`}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          Saving...
        </span>
      ) : (
        children
      )}
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

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
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

export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card animate-page-enter text-center">
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {body && <p className="mt-1 text-sm text-slate-600">{body}</p>}
      {children && <div className="mt-4 flex justify-center">{children}</div>}
    </div>
  );
}

export function AccessDenied({
  title = "Access disabled",
  body = "This module or action is currently disabled for your role. Contact the Owner if you need access.",
  fallbackTo = "/account",
}: {
  title?: string;
  body?: string;
  fallbackTo?: string;
}) {
  return (
    <div className="mx-auto max-w-lg py-10">
      <div className="card animate-page-enter border-red-200 bg-white text-center py-8 px-6">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-1.5 text-sm text-slate-600">{body}</p>
        <div className="mt-5 flex justify-center">
          <Link to={fallbackTo} className="btn-secondary text-xs">
            Go to allowed page
          </Link>
        </div>
      </div>
    </div>
  );
}
