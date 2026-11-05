import React, { useState } from "react";
import { toast } from "sonner";

export function ToggleActiveButton({
  action,
  active,
  noun,
}: {
  action: (nextActive: boolean) => Promise<{ ok: boolean; message: string }>;
  active: boolean;
  noun: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (active && !window.confirm(`Mark this ${noun} as inactive?`)) return;
    setLoading(true);
    try {
      const res = await action(!active);
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      className={`cursor-pointer ${active ? "btn-secondary" : "btn-primary"}`}
      onClick={handleClick}
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
      ) : active ? (
        "Mark inactive"
      ) : (
        "Mark active"
      )}
    </button>
  );
}
