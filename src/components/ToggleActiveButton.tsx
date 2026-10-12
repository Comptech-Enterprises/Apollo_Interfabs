"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/result";

/** Generic confirm-less toggle button for activate/deactivate actions. */
export function ToggleActiveButton({
  action,
  active,
  noun,
}: {
  action: (active: boolean) => Promise<ActionResult>;
  active: boolean;
  noun: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={active ? "btn-secondary" : "btn-primary"}
      onClick={() => {
        if (active && !window.confirm(`Mark this ${noun} as inactive?`)) return;
        start(async () => {
          const r = await action(!active);
          r.ok ? toast.success(r.message) : toast.error(r.message);
        });
      }}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          Saving...
        </span>
      ) : active ? (
        "Mark inactive"
      ) : (
        "Mark active"
      )}
    </button>
  );
}
