import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth, RequireRole, RedirectIfAuthed } from './routes/guards';
import { Toaster } from './components/ui/Toast';

import { CatalogPage } from './pages/CatalogPage';
import { LoginPage } from './pages/LoginPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { NotFoundPage } from './pages/NotFoundPage';

import { DashboardLayout } from './layouts/DashboardLayout';
import { DashboardHomePage } from './pages/dashboard/DashboardHomePage';
import { PosPage } from './pages/dashboard/PosPage';
import { InventoryPage } from './pages/dashboard/InventoryPage';
import { ProductsPage } from './pages/dashboard/ProductsPage';
import { CategoriesPage } from './pages/dashboard/CategoriesPage';
import { OrdersPage } from './pages/dashboard/OrdersPage';
import { QrPage } from './pages/dashboard/QrPage';
import { FinancePage } from './pages/dashboard/FinancePage';
import { ReportsPage } from './pages/dashboard/ReportsPage';
import { UsersPage } from './pages/dashboard/UsersPage';

const ADMIN: string[] = ['ADMIN'];

export const App: React.FC = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/order/confirmation/:id" element={<OrderConfirmationPage />} />

        <Route element={<RedirectIfAuthed />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHomePage />} />
            <Route path="pos" element={<PosPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="qr" element={<QrPage />} />

            <Route element={<RequireRole roles={ADMIN} />}>
              <Route path="finance" element={<FinancePage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/dashboard/*" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <Toaster />
    </>
  );
};
