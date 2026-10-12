import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ActiveBadge } from "@/components/bits";
import { formatDate } from "@/lib/format";
import { CreateUserForm, ResetPassword, UserActiveToggle } from "./UserControls";

export const metadata: Metadata = { title: "Users", description: "Manage manager and sales accounts." };
export const dynamic = "force-dynamic";

export default async function Users() {
  const me = await requireManager();
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });
  return (
    <>
      <PageHeader title="Users" subtitle="Managers create and manage accounts. There is no public sign-up." />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <ul className="space-y-3">
          {users.map((u) => (
            <li key={u.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-semibold">{u.name}{u.id === me.uid && <span className="ml-2 text-xs font-normal text-slate-500">(you)</span>}</p>
                  <p className="break-all text-sm text-slate-600">{u.email}</p>
                  <p className="text-xs text-slate-500">{u.role === "MANAGER" ? "Manager" : "Sales"} · added {formatDate(u.createdAt)}</p>
                </div>
                <ActiveBadge active={u.active} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ResetPassword id={u.id} name={u.name} />
                {u.id !== me.uid && <UserActiveToggle id={u.id} active={u.active} />}
              </div>
            </li>
          ))}
        </ul>
        <CreateUserForm />
      </div>
    </>
  );
}
