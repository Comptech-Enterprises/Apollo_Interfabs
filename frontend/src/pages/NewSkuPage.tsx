import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied, PageHeader } from "@/components/ui";
import { SkuForm } from "@/components/SkuForm";

export function NewSkuPage() {
  const { user, can, defaultRoute } = useAuth();
  if (!can("inventory.createSku")) {
    return <AccessDenied fallbackTo={defaultRoute} />;
  }
  return (
    <>
      <PageHeader
        title="Add SKU"
        actions={
          <Link to="/dashboard" className="btn-secondary">
            Back to Inventory
          </Link>
        }
      />
      <div className="mx-auto max-w-2xl">
        <SkuForm mode="create" allowedWarehouses={user?.warehouses} role={user?.role} />
      </div>
    </>
  );
}
