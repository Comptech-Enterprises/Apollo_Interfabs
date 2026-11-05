import React from "react";
import { apiSkus } from "@/lib/api";
import { ToggleActiveButton } from "./ToggleActiveButton";

export function SkuActiveToggle({
  id,
  active,
  onToggle,
}: {
  id: string;
  active: boolean;
  onToggle?: (nextActive: boolean) => void;
}) {
  return (
    <ToggleActiveButton
      noun="SKU"
      active={active}
      action={async (a) => {
        const res = await apiSkus.toggleActive(id, a);
        onToggle?.(a);
        return res;
      }}
    />
  );
}
