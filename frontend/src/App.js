import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SiteProvider } from "@/context/SiteContext";
import Layout from "@/components/Layout";
import Setup from "@/pages/Setup";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Sites from "@/pages/Sites";
import Persons from "@/pages/Persons";
import Accruals from "@/pages/Accruals";
import Collections from "@/pages/Collections";
import Expenses from "@/pages/Expenses";
import CashBank from "@/pages/CashBank";
import Journal from "@/pages/Journal";
import Periods from "@/pages/Periods";
import AuditLog from "@/pages/AuditLog";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";

function Guarded() {
  const { user, setupRequired } = useAuth();
  if (user === null) return <div className="min-h-screen flex items-center justify-center text-slate-500">Yükleniyor…</div>;
  if (setupRequired) return <Setup />;
  if (!user) return <Login />;
  return (
    <SiteProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="sites" element={<Sites />} />
          <Route path="persons" element={<Persons />} />
          <Route path="accruals" element={<Accruals />} />
          <Route path="collections" element={<Collections />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="cashbank" element={<CashBank />} />
          <Route path="journal" element={<Journal />} />
          <Route path="periods" element={<Periods />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </SiteProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<Setup />} />
          <Route path="/*" element={<Guarded />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
