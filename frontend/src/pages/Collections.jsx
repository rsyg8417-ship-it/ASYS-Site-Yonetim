import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSite } from "@/context/SiteContext";
import { useAuth } from "@/context/AuthContext";
import { formatTL, formatDate, todayISO, toKurus } from "@/lib/format";
import { enqueue } from "@/lib/offline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

const empty = { unit_id: "", account_id: "", account_kind: "cash", date: todayISO(), amount: "", reference: "", note: "" };

export default function Collections() {
  const { siteId } = useSite();
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [units, setUnits] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const canWrite = user?.role !== "denetci";

  const load = async () => {
    if (!siteId) return;
    const [p, u, a] = await Promise.all([
      api.get("/collections", { params: { site_id: siteId } }),
      api.get("/units", { params: { site_id: siteId } }),
      api.get("/accounts", { params: { site_id: siteId } }),
    ]);
    setPayments(p.data); setUnits(u.data); setAccounts(a.data);
  };
  useEffect(() => { load(); }, [siteId]);

  const save = async () => {
    const body = {
      site_id: siteId, unit_id: form.unit_id, account_id: form.account_id,
      account_kind: form.account_kind, date: form.date,
      amount_kurus: toKurus(form.amount), reference: form.reference, note: form.note,
    };
    if (!navigator.onLine) {
      enqueue({ endpoint: "/collections", method: "POST", body });
      toast.success("Çevrimdışı: Kuyruğa alındı, senkronizasyon bekliyor");
      setOpen(false); setForm(empty); return;
    }
    try {
      const r = await api.post("/collections", body);
      if (r.data.advance_added_kurus > 0) toast.success(`Tahsilat kaydedildi. ${r.data.message}`);
      else toast.success("Tahsilat kaydedildi");
      setOpen(false); setForm(empty); load();
    } catch (e) {
      const detail = e?.response?.data?.detail || "Hata";
      toast.error(detail);
    }
  };

  const unitLabel = (uid) => units.find(u=>u.id===uid)?.no || "-";
  const accLabel = (id, kind) => {
    const a = accounts.find(x=>x.id===id && x.kind===kind);
    return a ? `${a.name} (${kind==="cash"?"Kasa":"Banka"})` : "-";
  };

  return (
    <div className="space-y-6" data-testid="collections-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Tahsilat</h1>
          <p className="text-sm text-slate-500 mt-1">FIFO mahsup, fazla ödeme otomatik avans hesabına aktarılır</p></div>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button data-testid="new-collection-btn"><CreditCard className="w-4 h-4 mr-1" />Yeni Tahsilat</Button></DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader><DialogTitle>Yeni Tahsilat</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Bağımsız Bölüm</Label>
                  <Select value={form.unit_id} onValueChange={(v)=>setForm({...form, unit_id: v})}>
                    <SelectTrigger data-testid="collection-unit-select"><SelectValue placeholder="Seç" /></SelectTrigger>
                    <SelectContent className="bg-white max-h-72">{units.map(u=><SelectItem key={u.id} value={u.id}>{u.no}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Hesap</Label>
                  <Select value={form.account_id ? `${form.account_kind}:${form.account_id}` : ""} onValueChange={(v)=>{const [k,i]=v.split(":");setForm({...form, account_kind: k, account_id: i});}}>
                    <SelectTrigger data-testid="collection-account-select"><SelectValue placeholder="Kasa/Banka" /></SelectTrigger>
                    <SelectContent className="bg-white">{accounts.map(a=><SelectItem key={`${a.kind}:${a.id}`} value={`${a.kind}:${a.id}`}>{a.name} ({a.kind==="cash"?"Kasa":"Banka"})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Tarih</Label><Input type="date" value={form.date} onChange={(e)=>setForm({...form, date: e.target.value})} /></div>
                  <div><Label>Tutar (TL)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e)=>setForm({...form, amount: e.target.value})} data-testid="collection-amount-input" /></div>
                </div>
                <div><Label>Banka Referansı (opsiyonel)</Label><Input value={form.reference} onChange={(e)=>setForm({...form, reference: e.target.value})} data-testid="collection-reference-input" /></div>
                <div><Label>Not</Label><Input value={form.note} onChange={(e)=>setForm({...form, note: e.target.value})} /></div>
              </div>
              <DialogFooter><Button onClick={save} data-testid="collection-save-btn">Kaydet</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Card className="bg-white"><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Tarih</TableHead><TableHead>B.B.</TableHead><TableHead>Hesap</TableHead>
            <TableHead className="text-right">Tutar</TableHead><TableHead className="text-right">Avans</TableHead>
            <TableHead>Ref.</TableHead><TableHead>Not</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {payments.map(p => (
              <TableRow key={p.id} data-testid={`payment-row-${p.id}`}>
                <TableCell>{formatDate(p.date)}</TableCell>
                <TableCell className="font-medium">{unitLabel(p.unit_id)}</TableCell>
                <TableCell className="text-sm">{accLabel(p.account_id, p.account_kind)}</TableCell>
                <TableCell className="text-right font-mono font-semibold">{formatTL(p.amount_kurus)}</TableCell>
                <TableCell className="text-right font-mono text-sky-600">{p.advance_added_kurus > 0 ? formatTL(p.advance_added_kurus) : "-"}</TableCell>
                <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                <TableCell className="text-sm text-slate-600">{p.note}</TableCell>
              </TableRow>
            ))}
            {payments.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-6">Kayıt yok</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
