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
import { Plus, UserPlus } from "lucide-react";

const empty = { kind: "malik", name: "", phone: "", email: "", tc_no: "", active: true };

export default function Persons() {
  const { siteId } = useSite();
  const { user } = useAuth();
  const [persons, setPersons] = useState([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const canWrite = user?.role !== "denetci";

  const load = async () => {
    if (!siteId) return setPersons([]);
    const r = await api.get("/persons", { params: { site_id: siteId } });
    setPersons(r.data);
  };
  useEffect(() => { load(); }, [siteId]);

  const save = async () => {
    try { await api.post("/persons", { site_id: siteId, ...form }); setOpen(false); setForm(empty); load(); toast.success("Kişi eklendi"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };

  return (
    <div className="space-y-6" data-testid="persons-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Kişiler</h1>
          <p className="text-sm text-slate-500 mt-1">Malik ve kiracı yönetimi</p></div>
        {canWrite && siteId && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button data-testid="new-person-btn"><UserPlus className="w-4 h-4 mr-1" />Yeni Kişi</Button></DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader><DialogTitle>Yeni Kişi</DialogTitle></DialogHeader>
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
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Telefon</Label><Input value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} /></div>
                  <div><Label>E-posta</Label><Input value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} /></div>
                </div>
                <div><Label>TC Kimlik No</Label><Input value={form.tc_no} onChange={(e)=>setForm({...form, tc_no: e.target.value})} /></div>
              </div>
              <DialogFooter><Button onClick={save} data-testid="person-save-btn">Kaydet</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
      <Card className="bg-white"><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Ad Soyad</TableHead><TableHead>Tür</TableHead><TableHead>Telefon</TableHead><TableHead>E-posta</TableHead><TableHead>Durum</TableHead></TableRow></TableHeader>
          <TableBody>
            {persons.map(p => (
              <TableRow key={p.id} data-testid={`person-row-${p.id}`}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell><Badge variant="outline" className={p.kind==="malik"?"bg-sky-50 border-sky-200 text-sky-700":"bg-amber-50 border-amber-200 text-amber-700"}>{p.kind==="malik"?"Malik":"Kiracı"}</Badge></TableCell>
                <TableCell className="font-mono text-sm">{p.phone}</TableCell>
                <TableCell className="text-sm">{p.email}</TableCell>
                <TableCell>{p.active ? <Badge className="bg-emerald-500">Aktif</Badge> : <Badge variant="secondary">Pasif</Badge>}</TableCell>
              </TableRow>
            ))}
            {persons.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-6">Kayıt yok</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
