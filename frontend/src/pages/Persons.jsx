import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSite } from "@/context/SiteContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Pencil } from "lucide-react";

const empty = { id: null, kind: "malik", name: "", phone: "", email: "", tc_no: "", unit_id: "", active: true };

export default function Persons() {
  const { siteId } = useSite();
  const { user } = useAuth();
  const [persons, setPersons] = useState([]);
  const [units, setUnits] = useState([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const canWrite = user?.role !== "denetci";

  const load = async () => {
    if (!siteId) return setPersons([]);
    const [p, u] = await Promise.all([
      api.get("/persons", { params: { site_id: siteId } }),
      api.get("/units", { params: { site_id: siteId } }),
    ]);
    setPersons(p.data); setUnits(u.data);
  };
  useEffect(() => { load(); }, [siteId]);

  const openNew = () => { setForm(empty); setOpen(true); };
  const openEdit = (p) => { setForm({ id: p.id, kind: p.kind, name: p.name, phone: p.phone || "", email: p.email || "", tc_no: p.tc_no || "", unit_id: p.unit_id || "", active: p.active !== false }); setOpen(true); };
  const save = async () => {
    const payload = { kind: form.kind, name: form.name, phone: form.phone, email: form.email, tc_no: form.tc_no, unit_id: form.unit_id, active: form.active };
    try {
      if (form.id) {
        await api.patch(`/persons/${form.id}`, payload);
        toast.success("Kişi güncellendi");
      } else {
        await api.post("/persons", { site_id: siteId, ...payload });
        toast.success("Kişi eklendi");
      }
      setOpen(false); setForm(empty); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };
  const toggleActive = async (p) => {
    try { await api.patch(`/persons/${p.id}`, { active: !(p.active !== false) }); load(); toast.success(p.active !== false ? "Pasife alındı" : "Aktifleştirildi"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };

  const unitLabel = (uid) => units.find(u=>u.id===uid)?.no || "-";

  return (
    <div className="space-y-6" data-testid="persons-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Kişiler</h1>
          <p className="text-sm text-slate-500 mt-1">Malik ve kiracı yönetimi</p></div>
        {canWrite && siteId && (
          <Button onClick={openNew} data-testid="new-person-btn"><UserPlus className="w-4 h-4 mr-1" />Yeni Kişi</Button>
        )}
      </div>
      <Card className="bg-white"><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Ad Soyad</TableHead><TableHead>Tür</TableHead><TableHead>B.B. No</TableHead><TableHead>Telefon</TableHead><TableHead>E-posta</TableHead><TableHead>Durum</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {persons.map(p => {
              const active = p.active !== false;
              return (
                <TableRow key={p.id} data-testid={`person-row-${p.id}`} className={active ? "" : "opacity-60"}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="outline" className={p.kind==="malik"?"bg-sky-50 border-sky-200 text-sky-700":"bg-amber-50 border-amber-200 text-amber-700"}>{p.kind==="malik"?"Malik":"Kiracı"}</Badge></TableCell>
                  <TableCell className="font-mono text-sm">{p.unit_id ? unitLabel(p.unit_id) : "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{p.phone}</TableCell>
                  <TableCell className="text-sm">{p.email}</TableCell>
                  <TableCell>{active ? <Badge className="bg-emerald-500">Aktif</Badge> : <Badge variant="secondary">Pasif</Badge>}</TableCell>
                  <TableCell>
                    {canWrite && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={()=>openEdit(p)} data-testid={`person-edit-${p.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={()=>toggleActive(p)} data-testid={`person-toggle-${p.id}`}>{active ? "Pasife Al" : "Aktifleştir"}</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {persons.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-6">Kayıt yok</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>{form.id ? "Kişi Düzenle" : "Yeni Kişi"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tür</Label>
              <Select value={form.kind} onValueChange={(v)=>setForm({...form, kind: v})}>
                <SelectTrigger data-testid="person-kind-select"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="malik">Malik</SelectItem>
                  <SelectItem value="kiraci">Kiracı</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Ad Soyad</Label><Input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} data-testid="person-name-input" /></div>
            <div><Label>Bağımsız Bölüm No</Label>
              <Select value={form.unit_id || "none"} onValueChange={(v)=>setForm({...form, unit_id: v === "none" ? "" : v})}>
                <SelectTrigger data-testid="person-unit-select"><SelectValue placeholder="Seç" /></SelectTrigger>
                <SelectContent className="bg-white max-h-72">
                  <SelectItem value="none">— Bağlı değil —</SelectItem>
                  {units.map(u => <SelectItem key={u.id} value={u.id}>{u.no}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Telefon</Label><Input value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} data-testid="person-phone-input" /></div>
              <div><Label>E-posta</Label><Input value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} /></div>
            </div>
            <div><Label>TC Kimlik No</Label><Input value={form.tc_no} onChange={(e)=>setForm({...form, tc_no: e.target.value})} /></div>
            <div><Label>Durum</Label>
              <Select value={form.active ? "true" : "false"} onValueChange={(v)=>setForm({...form, active: v === "true"})}>
                <SelectTrigger data-testid="person-active-select"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="true">Aktif</SelectItem>
                  <SelectItem value="false">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={save} data-testid="person-save-btn">Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
