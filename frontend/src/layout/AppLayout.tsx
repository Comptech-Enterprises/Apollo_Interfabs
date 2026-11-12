import React, { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Header } from "@/components/Header";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Footer } from "@/components/Footer";
import { navItems } from "@/lib/site";

export function AppLayout() {
  const { user, can, refreshPermissions } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (user) {
      void refreshPermissions();
    }
  }, [location.pathname, user?.role]);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  const items = navItems
    .filter((i) => {
      if (i.roles && !i.roles.includes(user.role)) return false;
      if (i.permission && !can(i.permission)) return false;
      return true;
    })
    .map(({ href, label }) => ({ href, label }));

  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-br from-red-50/70 via-white to-red-100/40">
      <Header items={items} userName={user.name} role={user.role} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>
      <MobileBottomNav />
      <Footer />
    </div>
  );
}
