import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { apiFabricTypes } from "@/lib/api";
import { AccessDenied, PageHeader, SubmitButton } from "@/components/ui";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import {
  InfiniteScrollSentinel,
  InfiniteScrollSpinner,
  InfiniteScrollEnd,
  BackToTopButton,
} from "@/components/InfiniteScroll";

export function FabricTypesPage() {
  const { can, defaultRoute } = useAuth();
  const hasAccess = can("modules.fabricTypes") && can("fabricTypes.view");
  const canCreate = can("fabricTypes.create");
  const canEdit = can("fabricTypes.edit");

  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const CHUNK_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(CHUNK_SIZE);
  const [search, setSearch] = useState("");

  const load = () => {
    if (!hasAccess) return;
    setLoading(true);
    apiFabricTypes
      .listAll()
      .then((data) => {
        setTypes(data || []);
        setVisibleCount(CHUNK_SIZE);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [hasAccess]);

  if (!hasAccess) {
    return <AccessDenied fallbackTo={defaultRoute} />;
  }

  const filtered = useMemo(() => {
    return search
      ? types.filter((ft) => ft.name.toLowerCase().includes(search.toLowerCase()))
      : types;
  }, [types, search]);

  const paged = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + CHUNK_SIZE, filtered.length));
  }, [filtered.length]);

  const { sentinelRef, showScrollTop, scrollToTop } = useInfiniteScroll({
    hasMore,
    isLoading: loading,
    onLoadMore: handleLoadMore,
    rootMargin: "300px",
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await apiFabricTypes.create(newName.trim());
      toast.success(res.message);
      setNewName("");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      const res = await apiFabricTypes.update(id, editName.trim());
      toast.success(res.message);
      setEditingId(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to rename");
    }
  };

  return (
    <>
      <PageHeader title="Fabric Types" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {canCreate ? (
          <form onSubmit={handleCreate} className="flex gap-2 items-end">
            <div>
              <label htmlFor="newFabricType" className="block text-sm font-medium text-slate-700 mb-1">
                Add fabric type
              </label>
              <input
                id="newFabricType"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={50}
                placeholder="e.g. Polyester"
                autoComplete="off"
                className="input w-56"
              />
            </div>
            <SubmitButton loading={creating} className="btn-primary px-4 py-2 cursor-pointer">
              Add
            </SubmitButton>
          </form>
        ) : (
          <div />
        )}

        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setVisibleCount(CHUNK_SIZE); }}
          placeholder="Search fabric types..."
          className="input w-full sm:w-56"
          autoComplete="off"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-red-100/90 bg-white/95 shadow-xs shadow-red-500/5">
        <table className="w-full">
          <thead className="border-b border-red-100 bg-red-50/50">
            <tr>
              <th className="th text-left">#</th>
              <th className="th text-left">Name</th>
              {canEdit && <th className="th text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={canEdit ? 3 : 2} className="py-12 text-center text-sm text-slate-500">Loading...</td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 3 : 2} className="py-12 text-center text-sm text-slate-500">
                  {search ? "No fabric types match your search." : "No fabric types yet."}
                </td>
              </tr>
            ) : (
              paged.map((ft, i) => {
                const id = ft.id || ft._id;
                const isEditing = canEdit && editingId === id;
                const rowNum = i + 1;
                return (
                  <tr key={id} className="transition-colors hover:bg-red-50/40">
                    <td className="td text-slate-400 text-xs w-10">{rowNum}</td>
                    <td className="td">
                      {isEditing ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleRename(id)}
                          onBlur={() => setEditingId(null)}
                          autoFocus
                          maxLength={50}
                          className="input text-sm py-1 w-full max-w-xs"
                        />
                      ) : (
                        <span className="font-medium text-slate-800">
                          {ft.name}
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="td text-right">
                        <div className="flex gap-2 justify-end">
                          {isEditing ? (
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); handleRename(id); }}
                              className="btn-secondary text-xs px-2.5 py-1 cursor-pointer"
                            >
                              Save
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setEditingId(id); setEditName(ft.name); }}
                              className="btn-secondary text-xs px-2.5 py-1 cursor-pointer"
                            >
                              Rename
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <InfiniteScrollSentinel innerRef={sentinelRef} />
      {hasMore && <InfiniteScrollSpinner label="Loading more fabric types..." />}
      {!hasMore && filtered.length > 0 && (
        <InfiniteScrollEnd count={filtered.length} label="fabric types" onScrollTop={scrollToTop} />
      )}

      <BackToTopButton visible={showScrollTop} onClick={scrollToTop} />
    </>
  );
}
