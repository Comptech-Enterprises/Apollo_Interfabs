"use client";

import { useTransition } from "react";
import { updatePurchaseOrderStatus } from "@/actions/purchase-orders";

const statuses = [
  { value: "PENDING", label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  { value: "APPROVED", label: "Approved", color: "bg-green-100 text-green-800" },
  { value: "REJECTED", label: "Rejected", color: "bg-red-100 text-red-800" },
  { value: "FULFILLED", label: "Fulfilled", color: "bg-blue-100 text-blue-800" },
];

export function POStatusBadge({ status }: { status: string }) {
  const s = statuses.find((st) => st.value === status) ?? statuses[0];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.color}`}>{s.label}</span>;
}

export function POStatusButton({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={currentStatus}
      disabled={pending}
      onChange={(e) => startTransition(() => { updatePurchaseOrderStatus(id, e.target.value); })}
      className="input py-1 text-xs"
    >
      {statuses.map((s) => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}
