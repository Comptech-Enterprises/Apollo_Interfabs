import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "./context/AuthContext";
import { AppLayout } from "./layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SkusPage } from "./pages/SkusPage";
import { NewSkuPage } from "./pages/NewSkuPage";
import { SkuDetailPage } from "./pages/SkuDetailPage";
import { EditSkuPage } from "./pages/EditSkuPage";
import { SalesLogPage } from "./pages/SalesLogPage";
import { NewSalePage } from "./pages/NewSalePage";
import { PurchasesPage } from "./pages/PurchasesPage";
import { NewStockInPage } from "./pages/NewStockInPage";
import { PurchaseOrdersPage } from "./pages/PurchaseOrdersPage";
import { NewPOPage } from "./pages/NewPOPage";
import { UsersPage } from "./pages/UsersPage";
import { AccountPage } from "./pages/AccountPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors closeButton />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/skus" element={<SkusPage />} />
            <Route path="/skus/new" element={<NewSkuPage />} />
            <Route path="/skus/:id" element={<SkuDetailPage />} />
            <Route path="/skus/:id/edit" element={<EditSkuPage />} />
            <Route path="/sales" element={<SalesLogPage />} />
            <Route path="/sales/new" element={<NewSalePage />} />
            <Route path="/purchases" element={<PurchasesPage />} />
            <Route path="/stock-in/new" element={<NewStockInPage />} />
            <Route path="/po" element={<PurchaseOrdersPage />} />
            <Route path="/po/new" element={<NewPOPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/account" element={<AccountPage />} />
          </Route>
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
