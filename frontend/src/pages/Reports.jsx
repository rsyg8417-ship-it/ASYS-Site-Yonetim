import { useEffect, useState } from "react";
import { api, API_BASE } from "@/lib/api";
import { useSite } from "@/context/SiteContext";
import { formatTL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, FileText } from "lucide-react";

export default function Reports() {
  const { siteId } = useSite();
  const [debtors, setDebtors] = useState([]);
  const [ie, setIe] = useState(null);
  const [period, setPeriod] = useState(new Date().toISOString().slice(0,7));

  const load = async () => {
    if (!siteId) return;
    const [d, i] = await Promise.all([
      api.get("/reports/debtors", { params: { site_id: siteId } }),
      api.get("/reports/income-expense", { params: { site_id: siteId, period } }),
    ]);
    setDebtors(d.data); setIe(i.data);
  };
  useEffect(() => { load(); }, [siteId, period]);

  const downloadWithAuth = async (path, filename) => {
    const token = localStorage.getItem("asys_token");
    const res = await fetch(`${API_BASE}${path}`, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div><h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Raporlar</h1>
        <p className="text-sm text-slate-500 mt-1">Borçlu listesi, gelir-gider, Excel ve PDF dışa aktarma</p></div>

      <Tabs defaultValue="debtors">
        <TabsList>
          <TabsTrigger value="debtors" data-testid="tab-debtors">Borçlu Listesi</TabsTrigger>
          <TabsTrigger value="ie" data-testid="tab-ie">Gelir-Gider</TabsTrigger>
        </TabsList>
        <TabsContent value="debtors">
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Borçlu Listesi</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={()=>downloadWithAuth(`/reports/debtors/export.xlsx?site_id=${siteId}`, "borclular.xlsx")} data-testid="export-excel-button">
                  <FileSpreadsheet className="w-4 h-4 mr-1" />Excel
                </Button>
                <Button variant="outline" size="sm" onClick={()=>downloadWithAuth(`/reports/debtors/export.pdf?site_id=${siteId}`, "borclular.pdf")} data-testid="export-pdf-button">
                  <FileText className="w-4 h-4 mr-1" />PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>B.B. No</TableHead><TableHead className="text-right">Borç</TableHead><TableHead className="text-right">Açık Tahakkuk</TableHead></TableRow></TableHeader>
                <TableBody>
                  {debtors.map(d => (
                    <TableRow key={d.unit_id} data-testid={`debtor-row-${d.unit_id}`}>
                      <TableCell className="font-medium">{d.unit_no}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-rose-600">{formatTL(d.debt_kurus)}</TableCell>
                      <TableCell className="text-right font-mono">{d.count}</TableCell>
                    </TableRow>
                  ))}
                  {debtors.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-slate-400 py-6">Borçlu yok</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ie">
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <Label>Dönem</Label>
                <Input value={period} onChange={(e)=>setPeriod(e.target.value)} className="w-32" placeholder="YYYY-MM" data-testid="ie-period-input" />
              </div>
              <Button variant="outline" size="sm" onClick={()=>downloadWithAuth(`/reports/income-expense/export.xlsx?site_id=${siteId}&period=${period}`, "gelir-gider.xlsx")} data-testid="export-ie-excel">
                <FileSpreadsheet className="w-4 h-4 mr-1" />Excel
              </Button>
            </CardHeader>
            <CardContent>
              {ie && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded border bg-emerald-50 border-emerald-200">
                    <div className="text-xs uppercase tracking-widest text-emerald-800">Gelir</div>
                    <div className="text-2xl font-mono font-bold text-emerald-700 mt-1">{formatTL(ie.income_kurus)}</div>
                  </div>
                  <div className="p-4 rounded border bg-rose-50 border-rose-200">
                    <div className="text-xs uppercase tracking-widest text-rose-800">Gider</div>
                    <div className="text-2xl font-mono font-bold text-rose-700 mt-1">{formatTL(ie.expense_kurus)}</div>
                  </div>
                  <div className="p-4 rounded border bg-sky-50 border-sky-200">
                    <div className="text-xs uppercase tracking-widest text-sky-800">Net</div>
                    <div className="text-2xl font-mono font-bold text-sky-700 mt-1">{formatTL(ie.net_kurus)}</div>
                  </div>
                </div>
              )}
              {ie && ie.expenses_by_category.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-semibold mb-2">Kategori Bazında Giderler</div>
                  <Table>
                    <TableHeader><TableRow><TableHead>Kategori</TableHead><TableHead className="text-right">Tutar</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {ie.expenses_by_category.map(c => (
                        <TableRow key={c.category}><TableCell>{c.category}</TableCell><TableCell className="text-right font-mono">{formatTL(c.sum_kurus)}</TableCell></TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
