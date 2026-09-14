import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSite } from "@/context/SiteContext";
import { formatTL, fromKurus } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, AlertCircle, TrendingUp, TrendingDown, Wallet, CircleDollarSign } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

export default function Dashboard() {
  const { siteId, sites } = useSite();
  const [data, setData] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    if (!siteId) return;
    (async () => {
      try {
        const [r, a] = await Promise.all([
          api.get("/dashboard", { params: { site_id: siteId } }),
          api.get("/dashboard/activity", { params: { site_id: siteId, days: 7 } }),
        ]);
        setData(r.data);
        setActivity(a.data.map((d) => ({
          date: new Date(d.date).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }),
          tahsilat: fromKurus(d.collections_kurus),
          gider: fromKurus(d.expenses_kurus),
        })));
      } catch { setData(null); }
    })();
  }, [siteId]);

  if (!siteId) return <EmptyState msg="Önce Site & Yapı bölümünden bir site oluşturun." />;
  if (!data) return <div className="text-sm text-slate-500">Yükleniyor…</div>;

  const cards = [
    { label: "Toplam Borç", value: formatTL(data.total_debt_kurus), sub: `${data.debtor_count} borçlu`, icon: AlertCircle, tone: "rose", testid: "kpi-total-debt-card" },
    { label: "Bu Ay Tahsilat", value: formatTL(data.month_collections_kurus), icon: TrendingUp, tone: "emerald", testid: "kpi-month-collections-card" },
    { label: "Bu Ay Gider", value: formatTL(data.month_expenses_kurus), icon: TrendingDown, tone: "amber", testid: "kpi-month-expenses-card" },
    { label: "Kasa+Banka Bakiyesi", value: formatTL(data.cash_bank_total_kurus), icon: Wallet, tone: "sky", testid: "kpi-cash-bank-card" },
    { label: "Bağımsız Bölüm", value: data.unit_count, icon: Building2, tone: "slate", testid: "kpi-unit-count-card" },
    { label: "Aktif Kişi", value: data.person_count, icon: Users, tone: "slate", testid: "kpi-person-count-card" },
  ];

  const tone = {
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
  };

  const fmtTL = (v) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v || 0);

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>Gösterge Paneli</h1>
        <p className="text-sm text-slate-500 mt-1">{sites.find(s => s.id === siteId)?.name}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" data-testid={c.testid}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-slate-500 font-medium">{c.label}</div>
                    <div className="text-2xl font-bold mt-2 font-mono tracking-tight">{c.value}</div>
                    {c.sub && <div className="text-xs text-slate-500 mt-1">{c.sub}</div>}
                  </div>
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${tone[c.tone]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-white" data-testid="activity-chart-card">
        <CardHeader>
          <CardTitle className="text-base">Son 7 Gün Hareketi</CardTitle>
          <p className="text-xs text-slate-500">Günlük tahsilat ve gider akışı</p>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activity} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={fmtTL} />
                <Tooltip formatter={(v) => fmtTL(v)} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="tahsilat" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Tahsilat" />
                <Line type="monotone" dataKey="gider" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Gider" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({ msg }) {
  return <div className="p-10 text-center text-slate-500"><CircleDollarSign className="w-8 h-8 mx-auto mb-2 opacity-40" />{msg}</div>;
}
