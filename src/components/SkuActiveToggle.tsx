"use client";

import { setSkuActiveAction } from "@/actions/skus";
import { ToggleActiveButton } from "./ToggleActiveButton";

export function SkuActiveToggle({ id, active }: { id: string; active: boolean }) {
  return <ToggleActiveButton noun="SKU" active={active} action={(a) => setSkuActiveAction(id, a)} />;
}
