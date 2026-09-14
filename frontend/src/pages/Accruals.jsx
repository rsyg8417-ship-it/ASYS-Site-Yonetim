import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSite } from "@/context/SiteContext";
import { useAuth } from "@/context/AuthContext";
import { formatTL, formatDate, todayISO, STATUS_LABEL, toKurus } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Receipt, Layers } from "lucide-react";

export default function Accruals() {
  const { siteId } = useSite();
  const { user } = useAuth();
  const [accruals, setAccruals] = useState([]);
  const [units, setUnits] = useState([]);
  const [batchForm, setBatchForm] = useState({ period: new Date().toISOString().slice(0,7), due_date: todayISO(), description: "Aylık Aidat", method: "esit", amount: "" });
  const [extraForm, setExtraForm] = useState({ unit_id: "", due_date: todayISO(), description: "", amount: "" });
  const [openBatch, setOpenBatch] = useState(false);
  const [openExtra, setOpenExtra] = useState(false);
  const canWrite = user?.role !== "denetci";

  const load = async () => {
    if (!siteId) return;
    const [a, u] = await Promise.all([
      api.get("/accruals", { params: { site_id: siteId } }),
      api.get("/units", { params: { site_id: siteId } }),
    ]);
    setAccruals(a.data); setUnits(u.data);
  };
  useEffect(() => { load(); }, [siteId]);

  const runBatch = async () => {
    try {
      const r = await api.post("/accruals/batch", {
        site_id: siteId, period: batchForm.period, due_date: batchForm.due_date,
        description: batchForm.description, method: batchForm.method,
        amount_total_kurus: toKurus(batchForm.amount),
      });
      toast.success(`${r.data.created} tahakkuk oluşturuldu`);
      setOpenBatch(false); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };
  const runExtra = async () => {
    try {
      await api.post("/accruals/extra", {
        site_id: siteId, unit_id: extraForm.unit_id, due_date: extraForm.due_date,
        description: extraForm.description, amount_kurus: toKurus(extraForm.amount),
      });
      toast.success("Ek tahakkuk oluşturuldu"); setOpenExtra(false); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };
  const reverse = async (id) => {
    const reason = prompt("İptal gerekçesi:");
    if (!reason) return;
    try { await api.post(`/accruals/${id}/reverse`, { reason }); toast.success("İptal edildi"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };

  const unitLabel = (uid) => units.find(u=>u.id===uid)?.no || "-";

  return (
    <div className="space-y-6" data-testid="accruals-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Aidat & Tahakkuk</h1>
          <p className="text-sm text-slate-500 mt-1">Toplu tahakkuk üretimi ve ek tahakkuk</p></div>
        {canWrite && (
          <div className="flex gap-2">
            <Dialog open={openExtra} onOpenChange={setOpenExtra}>
              <DialogTrigger asChild><Button variant="outline" data-testid="extra-accrual-btn"><Receipt className="w-4 h-4 mr-1" />Ek Tahakkuk</Button></DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader><DialogTitle>Ek Tahakkuk</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Bağımsız Bölüm</Label>
                    <Select value={extraForm.unit_id} onValueChange={(v)=>setExtraForm({...extraForm, unit_id: v})}>
                      <SelectTrigger data-testid="extra-unit-select"><SelectValue placeholder="Seç" /></SelectTrigger>
                      <SelectContent className="bg-white max-h-72">{units.map(u=><SelectItem key={u.id} value={u.id}>{u.no}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Vade</Label><Input type="date" value={extraForm.due_date} onChange={(e)=>setExtraForm({...extraForm, due_date: e.target.value})} /></div>
                  <div><Label>Açıklama</Label><Input value={extraForm.description} onChange={(e)=>setExtraForm({...extraForm, description: e.target.value})} /></div>
                  <div><Label>Tutar (TL)</Label><Input type="number" step="0.01" value={extraForm.amount} onChange={(e)=>setExtraForm({...extraForm, amount: e.target.value})} data-testid="extra-amount-input" /></div>
                </div>
                <DialogFooter><Button onClick={runExtra} data-testid="extra-save-btn">Kaydet</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={openBatch} onOpenChange={setOpenBatch}>
              <DialogTrigger asChild><Button data-testid="aidat-accrual-batch-btn"><Layers className="w-4 h-4 mr-1" />Toplu Tahakkuk</Button></DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader><DialogTitle>Toplu Aidat Tahakkuku</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Dönem</Label><Input placeholder="YYYY-MM" value={batchForm.period} onChange={(e)=>setBatchForm({...batchForm, period: e.target.value})} data-testid="batch-period-input" /></div>
                    <div><Label>Vade</Label><Input type="date" value={batchForm.due_date} onChange={(e)=>setBatchForm({...batchForm, due_date: e.target.value})} /></div>
                  </div>
                  <div><Label>Açıklama</Label><Input value={batchForm.description} onChange={(e)=>setBatchForm({...batchForm, description: e.target.value})} /></div>
                  <div><Label>Dağıtım Yöntemi</Label>
                    <Select value={batchForm.method} onValueChange={(v)=>setBatchForm({...batchForm, method: v})}>
                      <SelectTrigger data-testid="batch-method-select"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="esit">Eşit (daire başına)</SelectItem>
                        <SelectItem value="metrekare">m² oranında</SelectItem>
                        <SelectItem value="arsa_payi">Arsa payına göre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>{batchForm.method === "esit" ? "Daire Başı Tutar (TL)" : "Toplam Tutar (TL)"}</Label>
                    <Input type="number" step="0.01" value={batchForm.amount} onChange={(e)=>setBatchForm({...batchForm, amount: e.target.value})} data-testid="batch-amount-input" /></div>
                </div>
                <DialogFooter><Button onClick={runBatch} data-testid="batch-run-btn">Oluştur</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
      <Card className="bg-white"><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Vade</TableHead><TableHead>B.B.</TableHead><TableHead>Dönem</TableHead><TableHead>Açıklama</TableHead>
            <TableHead className="text-right">Tutar</TableHead><TableHead className="text-right">Ödenen</TableHead>
            <TableHead>Durum</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {accruals.map(a => (
              <TableRow key={a.id} data-testid={`accrual-row-${a.id}`}>
                <TableCell>{formatDate(a.due_date)}</TableCell>
                <TableCell className="font-medium">{unitLabel(a.unit_id)}</TableCell>
                <TableCell>{a.period}</TableCell>
                <TableCell className="text-sm">{a.description}</TableCell>
                <TableCell className="text-right font-mono">{formatTL(a.amount_kurus)}</TableCell>
                <TableCell className="text-right font-mono text-emerald-600">{formatTL(a.paid_kurus)}</TableCell>
                <TableCell><Badge variant={a.status==="paid"?"default":a.status==="reversed"?"secondary":"outline"}>{STATUS_LABEL[a.status]}</Badge></TableCell>
                <TableCell>
                  {canWrite && !a.reversed && a.paid_kurus === 0 && (
                    <Button size="sm" variant="ghost" onClick={()=>reverse(a.id)} data-testid={`accrual-reverse-${a.id}`}>İptal</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {accruals.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-6">Kayıt yok</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
