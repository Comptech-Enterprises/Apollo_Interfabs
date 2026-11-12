import React, { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { apiAccessControl } from "@/lib/api";
import {
  DEFAULT_ROLE_PERMISSIONS,
  type PermissionKey,
  type PermissionKind,
  type PermissionMeta,
} from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import { TableSkeleton } from "@/components/TableSkeleton";

type ConfigurableRole = "OWNER" | "MANAGER" | "SALES";
type KindFilter = "all" | "module" | "read" | "write" | "other";

const CONFIGURABLE_ROLES: { role: ConfigurableRole; label: string }[] = [
  { role: "OWNER", label: "Owner" },
  { role: "MANAGER", label: "Manager" },
  { role: "SALES", label: "Sales" },
];

const KIND_BADGE: Record<PermissionKind, { label: string; cls: string }> = {
  module: { label: "Module", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  read: { label: "Read / View", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  write: { label: "Write / Edit", cls: "bg-red-50 text-red-700 border-red-200" },
  field: { label: "Field View", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  scope: { label: "Data Scope", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

function ToggleSwitch({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange?: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/40 ${
        disabled
          ? "bg-slate-300 opacity-70 cursor-not-allowed"
          : checked
          ? "bg-red-600 cursor-pointer"
          : "bg-slate-200 hover:bg-slate-300 cursor-pointer"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function AccessManagementPage() {
  const { user, refreshPermissions, defaultRoute } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<PermissionMeta[]>([]);
  const [defaults, setDefaults] = useState<Record<string, Record<string, boolean>>>(
    DEFAULT_ROLE_PERMISSIONS as unknown as Record<string, Record<string, boolean>>
  );
  const [savedRoles, setSavedRoles] = useState<Record<string, Record<string, boolean>>>({});
  const [draftRoles, setDraftRoles] = useState<Record<string, Record<string, boolean>>>({});
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");

  if (user?.role !== "SUPER_ADMIN") {
    return <Navigate to={defaultRoute} replace />;
  }

  const syncRoleStates = (roles: Record<string, Record<string, boolean>>) => {
    setSavedRoles(roles);
    setDraftRoles({
      SUPER_ADMIN: { ...(roles.SUPER_ADMIN || {}) },
      OWNER: { ...(roles.OWNER || {}) },
      MANAGER: { ...(roles.MANAGER || {}) },
      SALES: { ...(roles.SALES || {}) },
    });
  };

  const loadConfig = () => {
    setLoading(true);
    apiAccessControl
      .getAll()
      .then((res) => {
        setCatalog(res.catalog || []);
        setDefaults(res.defaults || (DEFAULT_ROLE_PERMISSIONS as unknown as Record<string, Record<string, boolean>>));
        syncRoleStates(res.roles);
      })
      .catch((err) => {
        toast.error(err.message || "Failed to load access control settings");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const dirtyCountForRole = (role: ConfigurableRole): number => {
    const draft = draftRoles[role] || {};
    const saved = savedRoles[role] || {};
    let count = 0;
    for (const item of catalog) {
      if (Boolean(draft[item.key]) !== Boolean(saved[item.key])) count++;
    }
    return count;
  };

  const ownerDirty = dirtyCountForRole("OWNER");
  const managerDirty = dirtyCountForRole("MANAGER");
  const salesDirty = dirtyCountForRole("SALES");
  const hasChanges = ownerDirty > 0 || managerDirty > 0 || salesDirty > 0;

  const setPermission = (role: ConfigurableRole, key: PermissionKey, value: boolean) => {
    setDraftRoles((prev) => ({
      ...prev,
      [role]: {
        ...(prev[role] || {}),
        [key]: value,
      },
    }));
  };

  const applyRolePreset = (role: ConfigurableRole, preset: "all" | "readonly" | "default" | "none") => {
    const next: Record<string, boolean> = {};
    for (const item of catalog) {
      if (preset === "all") next[item.key] = true;
      else if (preset === "none") next[item.key] = false;
      else if (preset === "readonly") next[item.key] = item.kind === "module" || item.kind === "read" || item.kind === "field";
      else next[item.key] = Boolean(defaults[role]?.[item.key]);
    }
    setDraftRoles((prev) => ({ ...prev, [role]: next }));
  };

  const toggleGroupForRole = (role: ConfigurableRole, items: PermissionMeta[]) => {
    const current = draftRoles[role] || {};
    const allEnabled = items.every((i) => Boolean(current[i.key]));
    const nextVal = !allEnabled;
    setDraftRoles((prev) => {
      const updated = { ...(prev[role] || {}) };
      for (const i of items) {
        updated[i.key] = nextVal;
      }
      return { ...prev, [role]: updated };
    });
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      let latestRoles = savedRoles;
      for (const { role } of CONFIGURABLE_ROLES) {
        if (dirtyCountForRole(role) > 0) {
          const res = await apiAccessControl.updateRole(role, draftRoles[role] || {});
          latestRoles = res.roles;
        }
      }
      syncRoleStates(latestRoles);
      await refreshPermissions();
      toast.success("Access permissions saved.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    syncRoleStates(savedRoles);
  };

  const handleResetDefaults = async () => {
    setSaving(true);
    try {
      const res = await apiAccessControl.reset();
      syncRoleStates(res.roles);
      await refreshPermissions();
      toast.success(res.message);
    } catch (err: any) {
      toast.error(err.message || "Failed to reset defaults");
    } finally {
      setSaving(false);
    }
  };

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((item) => {
      if (kindFilter === "module" && item.kind !== "module") return false;
      if (kindFilter === "read" && item.kind !== "read") return false;
      if (kindFilter === "write" && item.kind !== "write") return false;
      if (kindFilter === "other" && item.kind !== "field" && item.kind !== "scope") return false;
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.key.toLowerCase().includes(q)
      );
    });
  }, [catalog, search, kindFilter]);

  const groupedCatalog = useMemo(() => {
    const map = new Map<string, PermissionMeta[]>();
    for (const item of filteredCatalog) {
      const list = map.get(item.group) || [];
      list.push(item);
      map.set(item.group, list);
    }
    return Array.from(map.entries());
  }, [filteredCatalog]);

  const enabledCount = (role: ConfigurableRole) =>
    catalog.filter((c) => Boolean(draftRoles[role]?.[c.key])).length;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Access Management"
        subtitle="Super Admin only: control which modules Owner, Manager, and Sales can see, read & write actions, field visibility, and data scope."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={saving || loading}
              className="btn-secondary text-xs cursor-pointer disabled:opacity-50"
            >
              Reset Defaults
            </button>
            {hasChanges && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary text-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        }
      />

      {loading ? (
        <TableSkeleton cols={5} rows={8} />
      ) : (
        <>
          {/* Role summary & quick presets */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-red-100/90 bg-white/95 p-4 shadow-xs">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-red-700">Super Admin</p>
                  <p className="mt-0.5 text-lg font-bold text-slate-900">
                    {catalog.length} / {catalog.length} enabled
                  </p>
                </div>
                <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                  Full Access · Locked
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Only Super Admin can access this screen and always retains full system control.
              </p>
            </div>

            {CONFIGURABLE_ROLES.map(({ role, label }) => {
              const dirty = dirtyCountForRole(role);
              return (
                <div key={role} className="rounded-xl border border-red-100/90 bg-white/95 p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
                      <p className="mt-0.5 text-lg font-bold text-slate-900">
                        {enabledCount(role)} / {catalog.length} enabled
                      </p>
                    </div>
                    {dirty > 0 && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                        {dirty} unsaved
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyRolePreset(role, "all")}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Enable All
                    </button>
                    <button
                      type="button"
                      onClick={() => applyRolePreset(role, "readonly")}
                      className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 cursor-pointer"
                    >
                      Read-Only
                    </button>
                    <button
                      type="button"
                      onClick={() => applyRolePreset(role, "default")}
                      className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
                    >
                      Default
                    </button>
                    <button
                      type="button"
                      onClick={() => applyRolePreset(role, "none")}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer"
                    >
                      Disable All
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Search & Kind Filters */}
          <div className="flex flex-col gap-3 rounded-xl border border-red-100/90 bg-white/95 p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "all", label: "All Controls" },
                  { id: "module", label: "Modules" },
                  { id: "read", label: "Read / View" },
                  { id: "write", label: "Write / Edit" },
                  { id: "other", label: "Fields & Scope" },
                ] as { id: KindFilter; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setKindFilter(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    kindFilter === tab.id
                      ? "bg-red-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search permissions, modules..."
              className="input h-9 min-h-9 w-full py-1 text-sm sm:w-64"
              autoComplete="off"
            />
          </div>

          {/* Permission Matrix Groups */}
          {groupedCatalog.length === 0 ? (
            <div className="card py-10 text-center text-sm text-slate-500">
              No controls match your filter.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedCatalog.map(([group, items]) => (
                <section
                  key={group}
                  className="overflow-hidden rounded-xl border border-red-100/90 bg-white/95 shadow-xs shadow-red-500/5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-100 bg-red-50/50 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">{group}</h2>
                      <p className="text-xs text-slate-500">{items.length} controls</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {CONFIGURABLE_ROLES.map(({ role, label }) => {
                        const allOn = items.every((i) => Boolean(draftRoles[role]?.[i.key]));
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => toggleGroupForRole(role, items)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:border-red-200 hover:bg-red-50 cursor-pointer"
                          >
                            {label}: {allOn ? "Disable All" : "Enable All"}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <table className="w-full">
                      <thead className="border-b border-slate-100 bg-slate-50/60">
                        <tr>
                          <th className="th text-left">Permission / Control</th>
                          <th className="th w-28 text-center">Super Admin</th>
                          <th className="th w-24 text-center">Owner</th>
                          <th className="th w-24 text-center">Manager</th>
                          <th className="th w-24 text-center">Sales</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((item) => {
                          const badge = KIND_BADGE[item.kind];
                          return (
                            <tr key={item.key} className="hover:bg-red-50/30 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                                  <span
                                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}
                                  >
                                    {badge.label}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="inline-flex flex-col items-center">
                                  <ToggleSwitch checked={true} disabled label={`${item.label} for Super Admin`} />
                                </div>
                              </td>
                              {CONFIGURABLE_ROLES.map(({ role, label }) => {
                                const val = Boolean(draftRoles[role]?.[item.key]);
                                const changed = val !== Boolean(savedRoles[role]?.[item.key]);
                                return (
                                  <td key={role} className="px-4 py-3 text-center">
                                    <div className="inline-flex flex-col items-center gap-1">
                                      <ToggleSwitch
                                        checked={val}
                                        label={`${item.label} for ${label}`}
                                        onChange={(next) => setPermission(role, item.key, next)}
                                      />
                                      {changed && (
                                        <span className="text-[10px] font-semibold text-amber-700">Modified</span>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card Rows */}
                  <ul className="divide-y divide-slate-100 md:hidden">
                    {items.map((item) => {
                      const badge = KIND_BADGE[item.kind];
                      return (
                        <li key={item.key} className="p-4 space-y-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-slate-900">{item.label}</span>
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}
                              >
                                {badge.label}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5 rounded-lg bg-slate-50 p-2.5 text-center text-xs sm:grid-cols-4">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="font-semibold text-slate-500">Super Admin</span>
                              <ToggleSwitch checked={true} disabled label={`${item.label} for Super Admin`} />
                            </div>
                            {CONFIGURABLE_ROLES.map(({ role, label }) => {
                              const val = Boolean(draftRoles[role]?.[item.key]);
                              return (
                                <div key={role} className="flex flex-col items-center gap-1.5">
                                  <span className="font-semibold text-slate-700">{label}</span>
                                  <ToggleSwitch
                                    checked={val}
                                    label={`${item.label} for ${label}`}
                                    onChange={(next) => setPermission(role, item.key, next)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}

          {/* Sticky Unsaved Bar */}
          {hasChanges && (
            <div className="fixed bottom-18 lg:bottom-4 inset-x-0 z-30 mx-auto max-w-3xl px-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-white/95 px-4 py-3 shadow-xl shadow-red-900/10 backdrop-blur-md">
                <div className="text-sm">
                  <p className="font-bold text-slate-900">Unsaved permission changes</p>
                  <p className="text-xs text-slate-500">
                    {[
                      ownerDirty > 0 ? `Owner (${ownerDirty})` : null,
                      managerDirty > 0 ? `Manager (${managerDirty})` : null,
                      salesDirty > 0 ? `Sales (${salesDirty})` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={saving}
                    className="btn-secondary text-xs cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary text-xs cursor-pointer"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
