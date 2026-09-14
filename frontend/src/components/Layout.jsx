import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSite } from "@/context/SiteContext";
import { api, hasToken } from "@/lib/api";
import { getQueue, removeFromQueue, markConflict } from "@/lib/offline";
import { ROLE_LABEL } from "@/lib/format";
import SessionWatcher from "@/components/SessionWatcher";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toaster, toast } from "sonner";
import {
  LayoutDashboard, Building2, Users, Receipt, CreditCard, Wallet, BookOpen,
  Calendar, ScrollText, FileBarChart, Shield, LogOut, WifiOff, Wifi, RefreshCw, UserCircle
} from "lucide-react";

const nav = [
  { to: "/", icon: LayoutDashboard, label: "Gösterge Paneli", testid: "nav-dashboard" },
  { to: "/sites", icon: Building2, label: "Site & Yapı", testid: "nav-sites" },
  { to: "/persons", icon: Users, label: "Kişiler", testid: "nav-persons" },
  { to: "/accruals", icon: Receipt, label: "Aidat & Tahakkuk", testid: "nav-accruals" },
  { to: "/collections", icon: CreditCard, label: "Tahsilat", testid: "nav-collections" },
  { to: "/expenses", icon: Wallet, label: "Gider", testid: "nav-expenses" },
  { to: "/cashbank", icon: Wallet, label: "Kasa & Banka", testid: "nav-cashbank" },
  { to: "/journal", icon: BookOpen, label: "Yevmiye Defteri", testid: "nav-journal" },
  { to: "/periods", icon: Calendar, label: "Dönem Yönetimi", testid: "nav-periods" },
  { to: "/reports", icon: FileBarChart, label: "Raporlar", testid: "nav-reports" },
  { to: "/audit", icon: ScrollText, label: "Audit Log", testid: "nav-audit" },
  { to: "/users", icon: Shield, label: "Kullanıcılar", testid: "nav-users", roles: ["admin"] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { sites, siteId, changeSite } = useSite();
  const [online, setOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState(getQueue());
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    const onQ = () => setQueue(getQueue());
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    window.addEventListener("asys-queue-change", onQ);
    return () => {
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
      window.removeEventListener("asys-queue-change", onQ);
    };
  }, []);

  useEffect(() => {
    if (online && hasToken() && queue.filter((q) => q.status === "pending").length > 0) syncQueue();
  }, [online]);

  const syncQueue = async () => {
    if (!hasToken()) return; // Do not run background sync without authentication
    const pending = getQueue().filter((q) => q.status === "pending");
    if (pending.length === 0) return;
    setSyncing(true);
    try {
      const { data } = await api.post("/sync/batch", { operations: pending });
      for (const r of data.results) {
        if (r.ok) removeFromQueue(r.client_id);
        else markConflict(r.client_id, r.error);
      }
      setQueue(getQueue());
      const okCount = data.results.filter((r) => r.ok).length;
      if (okCount > 0) toast.success(`${okCount} işlem senkronize edildi`);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) {
        // Auth interceptor already cleared token; stay silent.
        return;
      }
      toast.error("Senkronizasyon başarısız");
    } finally {
      setSyncing(false);
    }
  };

  const doLogout = async () => { await logout(); navigate("/login"); };
  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const conflictCount = queue.filter((q) => q.status === "conflict").length;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Toaster position="top-right" richColors />
      <SessionWatcher onExpired={() => { logout(); navigate("/login"); }} />
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800" data-testid="app-sidebar">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-lg font-extrabold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>ASYS</div>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">Site Yönetimi</div>
        </div>
        <div className="px-3 py-3 border-b border-slate-800">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1.5 px-1">Aktif Site</div>
          <Select value={siteId} onValueChange={changeSite}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100" data-testid="site-selector-dropdown">
              <SelectValue placeholder="Site seçin" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
              {sites.length === 0 && <SelectItem value="none" disabled>Site yok</SelectItem>}
              {sites.map((s) => <SelectItem key={s.id} value={s.id} data-testid={`site-option-${s.id}`}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {nav.filter((n) => !n.roles || n.roles.includes(user?.role)).map((n) => {
            const Icon = n.icon;
            return (
              <NavLink key={n.to} to={n.to} end={n.to === "/"} data-testid={n.testid}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-sky-500/10 text-sky-400 border-l-2 border-sky-400" : "text-slate-300 hover:bg-slate-800 border-l-2 border-transparent"
                  }`
                }>
                <Icon className="w-4 h-4" />{n.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 p-3">
          <div className="text-xs text-slate-400 truncate">{user?.name}</div>
          <div className="text-[10px] text-slate-500">{ROLE_LABEL[user?.role]}</div>
          <NavLink to="/profile" data-testid="nav-profile"
            className={({ isActive }) =>
              `mt-2 flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-colors ${
                isActive ? "bg-sky-500/10 text-sky-400" : "text-slate-300 hover:bg-slate-800"
              }`
            }>
            <UserCircle className="w-3.5 h-3.5" />Profil
          </NavLink>
          <Button variant="ghost" size="sm" onClick={doLogout} data-testid="logout-btn"
            className="w-full mt-1 justify-start text-slate-300 hover:text-white hover:bg-slate-800">
            <LogOut className="w-3.5 h-3.5 mr-2" />Çıkış
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6" data-testid="app-topbar">
          <div className="text-sm text-slate-500">
            {sites.find((s) => s.id === siteId)?.name || "Site seçilmedi"}
          </div>
          <div className="flex items-center gap-3">
            {online ? (
              <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50" data-testid="status-online">
                <Wifi className="w-3 h-3 mr-1" />Çevrimiçi
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50" data-testid="status-offline">
                <WifiOff className="w-3 h-3 mr-1" />Çevrimdışı
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge className="bg-sky-500 text-white hover:bg-sky-600 cursor-pointer" onClick={syncQueue} data-testid="sync-queue-badge">
                <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
                {pendingCount} bekliyor
              </Badge>
            )}
            {conflictCount > 0 && (
              <Badge className="bg-rose-500 text-white" data-testid="sync-conflict-badge">
                {conflictCount} çakışma
              </Badge>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
