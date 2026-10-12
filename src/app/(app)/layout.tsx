import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { requireUser } from "@/lib/auth";
import { navItems } from "@/lib/site";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const items = navItems.filter((i) => !i.manager || user.role === "MANAGER");
  return (
    <div className="flex min-h-dvh flex-col">
      <Header items={items.map(({ href, label }) => ({ href, label }))} userName={user.name} role={user.role} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-6">{children}</main>
      <Footer />
      <MobileBottomNav role={user.role} />
    </div>
  );
}
