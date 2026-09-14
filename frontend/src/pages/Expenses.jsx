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
import { Wallet } from "lucide-react";

const CATEGORIES = ["Elektrik", "Su", "Doğalgaz", "Temizlik", "Bakım-Onarım", "Personel", "Yönetim", "Vergi", "Diğer"];
const empty = { account_id: "", account_kind: "cash", date: todayISO(), amount: "", category: "Elektrik", vendor: "", invoice_no: "", description: "", reference: "" };

export default function Expenses() {
  const { siteId } = useSite();
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const canWrite = user?.role !== "denetci";

  const load = async () => {
    if (!siteId) return;
    const [e, a] = await Promise.all([
      api.get("/expenses", { params: { site_id: siteId } }),
      api.get("/accounts", { params: { site_id: siteId } }),
    ]);
    setExpenses(e.data); setAccounts(a.data);
  };
  useEffect(() => { load(); }, [siteId]);

  const save = async () => {
    const body = { site_id: siteId, ...form, amount_kurus: toKurus(form.amount) };
    delete body.amount;
    if (!navigator.onLine) {
      enqueue({ endpoint: "/expenses", method: "POST", body });
      toast.success("Çevrimdışı: Kuyruğa alındı");
      setOpen(false); setForm(empty); return;
    }
    try { await api.post("/expenses", body); toast.success("Gider kaydedildi"); setOpen(false); setForm(empty); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };

  const accLabel = (id, kind) => accounts.find(x=>x.id===id && x.kind===kind)?.name || "-";

  return (
    <div className="space-y-6" data-testid="expenses-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Gider</h1>
          <p className="text-sm text-slate-500 mt-1">Gider kayıtları ve kategoriler</p></div>
        {canWrite && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button data-testid="new-expense-btn"><Wallet className="w-4 h-4 mr-1" />Yeni Gider</Button></DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader><DialogTitle>Yeni Gider</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Hesap</Label>
                  <Select value={form.account_id ? `${form.account_kind}:${form.account_id}` : ""} onValueChange={(v)=>{const [k,i]=v.split(":");setForm({...form, account_kind: k, account_id: i});}}>
                    <SelectTrigger data-testid="expense-account-select"><SelectValue placeholder="Kasa/Banka" /></SelectTrigger>
                    <SelectContent className="bg-white">{accounts.map(a=><SelectItem key={`${a.kind}:${a.id}`} value={`${a.kind}:${a.id}`}>{a.name} ({a.kind==="cash"?"Kasa":"Banka"})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Tarih</Label><Input type="date" value={form.date} onChange={(e)=>setForm({...form, date: e.target.value})} /></div>
                  <div><Label>Tutar (TL)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e)=>setForm({...form, amount: e.target.value})} data-testid="expense-amount-input" /></div>
                </div>
                <div><Label>Kategori</Label>
                  <Select value={form.category} onValueChange={(v)=>setForm({...form, category: v})}>
                    <SelectTrigger data-testid="expense-category-select"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">{CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Tedarikçi</Label><Input value={form.vendor} onChange={(e)=>setForm({...form, vendor: e.target.value})} /></div>
                  <div><Label>Fatura No</Label><Input value={form.invoice_no} onChange={(e)=>setForm({...form, invoice_no: e.target.value})} /></div>
                </div>
                <div><Label>Açıklama</Label><Input value={form.description} onChange={(e)=>setForm({...form, description: e.target.value})} /></div>
                <div><Label>Banka Referansı</Label><Input value={form.reference} onChange={(e)=>setForm({...form, reference: e.target.value})} /></div>
              </div>
              <DialogFooter><Button onClick={save} data-testid="expense-save-btn">Kaydet</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Card className="bg-white"><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>Kategori</TableHead><TableHead>Tedarikçi</TableHead><TableHead>Hesap</TableHead><TableHead>Fatura</TableHead><TableHead className="text-right">Tutar</TableHead></TableRow></TableHeader>
          <TableBody>
            {expenses.map(e => (
              <TableRow key={e.id} data-testid={`expense-row-${e.id}`}>
                <TableCell>{formatDate(e.date)}</TableCell>
                <TableCell><span className="text-xs px-2 py-0.5 bg-amber-50 border border-amber-200 rounded text-amber-800">{e.category}</span></TableCell>
                <TableCell>{e.vendor}</TableCell>
                <TableCell className="text-sm">{accLabel(e.account_id, e.account_kind)}</TableCell>
                <TableCell className="font-mono text-xs">{e.invoice_no}</TableCell>
                <TableCell className="text-right font-mono font-semibold text-rose-600">{formatTL(e.amount_kurus)}</TableCell>
              </TableRow>
            ))}
            {expenses.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-6">Kayıt yok</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
