import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSite } from "@/context/SiteContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Lock, Unlock } from "lucide-react";

const months = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

export default function Periods() {
  const { siteId } = useSite();
  const { user } = useAuth();
  const [periods, setPeriods] = useState([]);
  const [form, setForm] = useState({ year: new Date().getFullYear(), month: new Date().getMonth()+1, reason: "" });
  const [openClose, setOpenClose] = useState(false);
  const [openReopen, setOpenReopen] = useState(false);
  const [target, setTarget] = useState(null);
  const isAdmin = user?.role === "admin";

  const load = async () => {
    if (!siteId) return;
    const r = await api.get("/periods", { params: { site_id: siteId } });
    setPeriods(r.data);
  };
  useEffect(() => { load(); }, [siteId]);

  const doClose = async () => {
    try { await api.post("/periods/close", { site_id: siteId, year: form.year, month: form.month, reason: form.reason }); toast.success("Dönem kapatıldı"); setOpenClose(false); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };
  const doReopen = async () => {
    try { await api.post("/periods/reopen", { site_id: siteId, year: target.year, month: target.month, reason: form.reason }); toast.success("Dönem yeniden açıldı"); setOpenReopen(false); setForm({...form, reason: ""}); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };

  return (
    <div className="space-y-6" data-testid="periods-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Dönem Yönetimi</h1>
          <p className="text-sm text-slate-500 mt-1">Aylık dönem açma/kapama. Yalnız Yönetici. Yeniden açma audit log'a düşer.</p></div>
        {isAdmin && (
          <Dialog open={openClose} onOpenChange={setOpenClose}>
            <DialogTrigger asChild><Button data-testid="close-period-btn"><Lock className="w-4 h-4 mr-1" />Dönem Kapat</Button></DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader><DialogTitle>Dönem Kapatma</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Yıl</Label><Input type="number" value={form.year} onChange={(e)=>setForm({...form, year: parseInt(e.target.value)})} data-testid="period-year-input" /></div>
                  <div><Label>Ay</Label>
                    <Select value={String(form.month)} onValueChange={(v)=>setForm({...form, month: parseInt(v)})}>
                      <SelectTrigger data-testid="period-month-select"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white">{months.map((m,i)=><SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Not (opsiyonel)</Label><Input value={form.reason} onChange={(e)=>setForm({...form, reason: e.target.value})} /></div>
              </div>
              <DialogFooter><Button onClick={doClose} data-testid="period-close-confirm">Kapat</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Card className="bg-white"><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Dönem</TableHead><TableHead>Durum</TableHead><TableHead>Kapatan</TableHead><TableHead>Kapatılma</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {periods.map(p => (
              <TableRow key={`${p.year}-${p.month}`} data-testid={`period-row-${p.year}-${p.month}`}>
                <TableCell className="font-medium">{p.year} {months[p.month-1]}</TableCell>
                <TableCell>{p.status === "closed" ? <Badge className="bg-rose-500">Kapalı</Badge> : <Badge variant="outline">Açık</Badge>}</TableCell>
                <TableCell className="text-sm">{p.closed_by || "-"}</TableCell>
                <TableCell className="text-sm">{p.closed_at ? new Date(p.closed_at).toLocaleString("tr-TR") : "-"}</TableCell>
                <TableCell>
                  {isAdmin && p.status === "closed" && (
                    <Button size="sm" variant="outline" onClick={()=>{setTarget(p); setOpenReopen(true);}} data-testid={`period-reopen-${p.year}-${p.month}`}>
                      <Unlock className="w-3 h-3 mr-1" />Yeniden Aç
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {periods.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-6">Kapatılmış dönem yok</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
      <Dialog open={openReopen} onOpenChange={setOpenReopen}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>Dönemi Yeniden Aç</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Bu işlem audit log'a kaydedilir. Gerekçe zorunludur.</p>
            <div><Label>Gerekçe (min 5 karakter)</Label><Input value={form.reason} onChange={(e)=>setForm({...form, reason: e.target.value})} data-testid="reopen-reason-input" /></div>
          </div>
          <DialogFooter><Button onClick={doReopen} data-testid="reopen-confirm-btn">Yeniden Aç</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
