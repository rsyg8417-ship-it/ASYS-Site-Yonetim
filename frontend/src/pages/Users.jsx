import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

const empty = { email: "", name: "", password: "", role: "muhasebe", phone: "" };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);

  const load = async () => { const r = await api.get("/users"); setUsers(r.data); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try { await api.post("/auth/register", form); toast.success("Kullanıcı oluşturuldu"); setOpen(false); setForm(empty); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };
  const toggle = async (u) => {
    try { await api.patch(`/users/${u.id}`, { active: !u.active }); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };

  return (
    <div className="space-y-6" data-testid="users-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Kullanıcılar</h1>
          <p className="text-sm text-slate-500 mt-1">Yönetici / Muhasebe / Denetçi rolleri</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button data-testid="new-user-btn"><UserPlus className="w-4 h-4 mr-1" />Yeni Kullanıcı</Button></DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader><DialogTitle>Yeni Kullanıcı</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>E-posta</Label><Input value={form.email} onChange={(e)=>setForm({...form, email: e.target.value})} data-testid="user-email-input" /></div>
              <div><Label>Ad Soyad</Label><Input value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} data-testid="user-name-input" /></div>
              <div><Label>Telefon</Label><Input value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} placeholder="0505 369 99 84" data-testid="user-phone-input" /></div>
              <div><Label>Parola</Label><Input type="password" value={form.password} onChange={(e)=>setForm({...form, password: e.target.value})} data-testid="user-password-input" /></div>
              <div><Label>Rol</Label>
                <Select value={form.role} onValueChange={(v)=>setForm({...form, role: v})}>
                  <SelectTrigger data-testid="user-role-select"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="admin">Yönetici</SelectItem>
                    <SelectItem value="muhasebe">Muhasebe</SelectItem>
                    <SelectItem value="denetci">Denetçi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={save} data-testid="user-save-btn">Kaydet</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="bg-white"><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>E-posta</TableHead><TableHead>Ad</TableHead><TableHead>Telefon</TableHead><TableHead>Rol</TableHead><TableHead>Durum</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {users.map(u => (
              <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                <TableCell className="font-medium">{u.email}</TableCell>
                <TableCell>{u.name}</TableCell>
                <TableCell className="font-mono text-sm">{u.phone || "-"}</TableCell>
                <TableCell><Badge variant="outline">{ROLE_LABEL[u.role]}</Badge></TableCell>
                <TableCell>{u.active ? <Badge className="bg-emerald-500">Aktif</Badge> : <Badge variant="secondary">Pasif</Badge>}</TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" onClick={()=>toggle(u)} data-testid={`user-toggle-${u.id}`}>
                    {u.active ? "Pasife Al" : "Aktifleştir"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
