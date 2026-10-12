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
      {pending ? "Saving..." : active ? `Mark inactive` : `Mark active`}
    </button>
  );
}
