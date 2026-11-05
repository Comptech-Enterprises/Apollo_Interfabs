import React, { useEffect, useRef, useState } from "react";
import { apiNotifications } from "@/lib/api";

type Note = { id: string; message: string; link: string | null; read: boolean; createdAt: string };

export function NotificationBell() {
  const [count, setCount] = useState(0);
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchUnread = () => {
    apiNotifications
      .unreadCount()
      .then((res) => setCount(res.count))
      .catch(() => {});
  };

  useEffect(() => {
    fetchUnread();
    const iv = setInterval(fetchUnread, 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const toggle = async () => {
    if (!open) {
      try {
        const n = await apiNotifications.list();
        setNotes(n);
        await apiNotifications.markRead();
        setCount(0);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    }
    setOpen((o) => !o);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative rounded-lg p-2 text-slate-700 hover:bg-red-50 hover:text-red-700 active:scale-95 transition-all duration-150 cursor-pointer"
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-xs">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl bg-white shadow-2xl border border-red-100 z-50">
          <div className="border-b border-red-100 bg-red-50/50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
          </div>
          {notes.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications</p>
          ) : (
            <ul className="divide-y divide-red-50">
              {notes.map((n) => (
                <li key={n.id} className={`px-4 py-3 text-sm ${n.read ? "" : "bg-red-50/60"}`}>
                  <p className="text-slate-800">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(n.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
