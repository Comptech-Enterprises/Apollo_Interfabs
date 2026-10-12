import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { navItems } from "@/lib/site";

export const metadata: Metadata = { title: "Access denied", description: "You do not have access to this page." };

export default async function Forbidden() {
  const user = await requireUser();
  const items = navItems.filter((i) => !i.manager || user.role === "MANAGER").map(({ href, label }) => ({ href, label }));
  return (
    <div className="flex min-h-dvh flex-col">
      <Header items={items} userName={user.name} role={user.role} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold">Access denied</h1>
        <p className="mt-2 text-slate-600">Your account does not have permission to view this page.</p>
        <Link href="/dashboard" className="btn-primary mt-6">Back to inventory</Link>
      </main>
      <Footer />
    </div>
  );
}
