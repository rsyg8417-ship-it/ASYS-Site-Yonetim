import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSite } from "@/context/SiteContext";
import { useAuth } from "@/context/AuthContext";
import { formatTL, formatDate, todayISO, toKurus } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, ArrowRightLeft } from "lucide-react";

export default function CashBank() {
  const { siteId } = useSite();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ kind: "cash", name: "", iban: "", bank_name: "", opening: "0" });
  const [xfer, setXfer] = useState({ from: "", to: "", date: todayISO(), amount: "", reference: "", note: "" });
  const [open, setOpen] = useState(false);
  const [openX, setOpenX] = useState(false);
  const canWrite = user?.role !== "denetci";

  const load = async () => {
    if (!siteId) return setAccounts([]);
    const r = await api.get("/accounts", { params: { site_id: siteId } });
    setAccounts(r.data);
  };
  useEffect(() => { load(); }, [siteId]);

  const save = async () => {
    try {
      await api.post("/accounts", { site_id: siteId, kind: form.kind, name: form.name, iban: form.iban, bank_name: form.bank_name, opening_balance_kurus: toKurus(form.opening) });
      toast.success("Hesap eklendi"); setOpen(false); setForm({ kind: "cash", name: "", iban: "", bank_name: "", opening: "0" }); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };
  const doTransfer = async () => {
    const [fk, fi] = xfer.from.split(":"); const [tk, ti] = xfer.to.split(":");
    try {
      await api.post("/transfers", { site_id: siteId, from_id: fi, from_kind: fk, to_id: ti, to_kind: tk, date: xfer.date, amount_kurus: toKurus(xfer.amount), reference: xfer.reference, note: xfer.note });
      toast.success("Virman yapıldı"); setOpenX(false); setXfer({ from: "", to: "", date: todayISO(), amount: "", reference: "", note: "" }); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };

  return (
    <div className="space-y-6" data-testid="cashbank-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Kasa & Banka</h1>
          <p className="text-sm text-slate-500 mt-1">Hesaplar, bakiyeler ve virman işlemleri</p></div>
        {canWrite && (
          <div className="flex gap-2">
            <Dialog open={openX} onOpenChange={setOpenX}>
              <DialogTrigger asChild><Button variant="outline" disabled={accounts.length < 2} data-testid="new-transfer-btn"><ArrowRightLeft className="w-4 h-4 mr-1" />Virman</Button></DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader><DialogTitle>Virman</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Kaynak</Label>
                    <Select value={xfer.from} onValueChange={(v)=>setXfer({...xfer, from: v})}>
                      <SelectTrigger data-testid="transfer-from-select"><SelectValue placeholder="Seç" /></SelectTrigger>
                      <SelectContent className="bg-white">{accounts.map(a=><SelectItem key={`${a.kind}:${a.id}`} value={`${a.kind}:${a.id}`}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Hedef</Label>
                    <Select value={xfer.to} onValueChange={(v)=>setXfer({...xfer, to: v})}>
                      <SelectTrigger data-testid="transfer-to-select"><SelectValue placeholder="Seç" /></SelectTrigger>
                      <SelectContent className="bg-white">{accounts.map(a=><SelectItem key={`${a.kind}:${a.id}`} value={`${a.kind}:${a.id}`}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Tarih</Label><Input type="date" value={xfer.date} onChange={(e)=>setXfer({...xfer, date: e.target.value})} /></div>
                    <div><Label>Tutar (TL)</Label><Input type="number" step="0.01" value={xfer.amount} onChange={(e)=>setXfer({...xfer, amount: e.target.value})} data-testid="transfer-amount-input" /></div>
                  </div>
                  <div><Label>Not</Label><Input value={xfer.note} onChange={(e)=>setXfer({...xfer, note: e.target.value})} /></div>
                </div>
                <DialogFooter><Button onClick={doTransfer} data-testid="transfer-save-btn">Kaydet</Button></DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button data-testid="new-account-btn"><Plus className="w-4 h-4 mr-1" />Yeni Hesap</Button></DialogTrigger>
              <DialogContent className="bg-white">
                <DialogHeader><DialogTitle>Yeni Hesap</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Tür</Label>
                    <Select value={form.kind} onValueChange={(v)=>setForm({...form, kind: v})}>
                      <SelectTrigger data-testid="account-kind-select"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="cash">Kasa</SelectItem>
                        <SelectItem value="bank">Banka</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Ad</Label><Input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} data-testid="account-name-input" /></div>
                  {form.kind === "bank" && <>
                    <div><Label>Banka</Label><Input value={form.bank_name} onChange={(e)=>setForm({...form, bank_name: e.target.value})} /></div>
                    <div><Label>IBAN</Label><Input value={form.iban} onChange={(e)=>setForm({...form, iban: e.target.value})} /></div>
                  </>}
                  <div><Label>Açılış Bakiyesi (TL)</Label><Input type="number" step="0.01" value={form.opening} onChange={(e)=>setForm({...form, opening: e.target.value})} /></div>
                </div>
                <DialogFooter><Button onClick={save} data-testid="account-save-btn">Kaydet</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(a => (
          <Card key={`${a.kind}:${a.id}`} className="bg-white" data-testid={`account-card-${a.id}`}>
            <CardHeader><CardTitle className="text-base flex items-center justify-between">
              <span>{a.name}</span>
              <span className="text-xs uppercase tracking-widest text-slate-500 font-medium">{a.kind==="cash"?"Kasa":"Banka"}</span>
            </CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-mono font-bold">{formatTL(a.balance_kurus)}</div>
              {a.iban && <div className="text-xs text-slate-500 mt-2 font-mono">{a.iban}</div>}
            </CardContent>
          </Card>
        ))}
        {accounts.length === 0 && <div className="col-span-3 text-center text-slate-400 py-10">Hesap yok</div>}
      </div>
    </div>
  );
}
