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
import { Building2, Plus, Pencil } from "lucide-react";

const emptyUnit = { id: null, block_id: "", no: "", kind: "konut", area_m2: 0, share_ratio: 0, active: true };

export default function Sites() {
  const { sites, siteId, refreshSites, changeSite } = useSite();
  const { user } = useAuth();
  const [blocks, setBlocks] = useState([]);
  const [units, setUnits] = useState([]);
  const [siteForm, setSiteForm] = useState({ name: "", address: "", tax_no: "" });
  const [blockName, setBlockName] = useState("");
  const [unitForm, setUnitForm] = useState(emptyUnit);
  const [openSite, setOpenSite] = useState(false);
  const [openUnit, setOpenUnit] = useState(false);

  const isAdmin = user?.role === "admin";
  const canWrite = user?.role !== "denetci";

  const load = async () => {
    if (!siteId) { setBlocks([]); setUnits([]); return; }
    const [b, u] = await Promise.all([
      api.get("/blocks", { params: { site_id: siteId } }),
      api.get("/units", { params: { site_id: siteId } }),
    ]);
    setBlocks(b.data); setUnits(u.data);
  };
  useEffect(() => { load(); }, [siteId]);

  const createSite = async () => {
    try { const r = await api.post("/sites", siteForm); await refreshSites(); changeSite(r.data.id); setOpenSite(false); setSiteForm({ name: "", address: "", tax_no: "" }); toast.success("Site oluşturuldu"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };
  const createBlock = async () => {
    if (!blockName) return;
    try { await api.post("/blocks", { site_id: siteId, name: blockName }); setBlockName(""); load(); toast.success("Blok eklendi"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };
  const openNewUnit = () => { setUnitForm(emptyUnit); setOpenUnit(true); };
  const openEditUnit = (u) => { setUnitForm({ id: u.id, block_id: u.block_id, no: u.no, kind: u.kind, area_m2: u.area_m2, share_ratio: u.share_ratio, active: u.active !== false }); setOpenUnit(true); };
  const saveUnit = async () => {
    const payload = { block_id: unitForm.block_id, no: unitForm.no, kind: unitForm.kind, area_m2: parseFloat(unitForm.area_m2) || 0, share_ratio: parseFloat(unitForm.share_ratio) || 0, active: unitForm.active };
    try {
      if (unitForm.id) {
        await api.patch(`/units/${unitForm.id}`, payload);
        toast.success("Bağımsız bölüm güncellendi");
      } else {
        await api.post("/units", { site_id: siteId, ...payload });
        toast.success("Bağımsız bölüm eklendi");
      }
      setOpenUnit(false); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };
  const toggleActive = async (u) => {
    try { await api.patch(`/units/${u.id}`, { active: !(u.active !== false) }); load(); toast.success(u.active !== false ? "Pasife alındı" : "Aktifleştirildi"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Hata"); }
  };

  return (
    <div className="space-y-6" data-testid="sites-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Site & Yapı</h1>
          <p className="text-sm text-slate-500 mt-1">Site, blok ve bağımsız bölüm yönetimi</p>
        </div>
        {isAdmin && (
          <Dialog open={openSite} onOpenChange={setOpenSite}>
            <DialogTrigger asChild><Button data-testid="new-site-btn"><Plus className="w-4 h-4 mr-1" />Yeni Site</Button></DialogTrigger>
            <DialogContent className="bg-white">
              <DialogHeader><DialogTitle>Yeni Site</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Site Adı</Label><Input value={siteForm.name} onChange={(e)=>setSiteForm({...siteForm, name: e.target.value})} data-testid="site-name-input" /></div>
                <div><Label>Adres</Label><Input value={siteForm.address} onChange={(e)=>setSiteForm({...siteForm, address: e.target.value})} /></div>
                <div><Label>Vergi No</Label><Input value={siteForm.tax_no} onChange={(e)=>setSiteForm({...siteForm, tax_no: e.target.value})} /></div>
              </div>
              <DialogFooter><Button onClick={createSite} data-testid="site-save-btn">Kaydet</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {sites.length === 0 && (
        <Card><CardContent className="p-10 text-center text-slate-500">
          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />Henüz site yok. "Yeni Site" ile başlayın.
        </CardContent></Card>
      )}

      {siteId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="bg-white">
            <CardHeader><CardTitle className="text-base">Bloklar</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {canWrite && (
                <div className="flex gap-2">
                  <Input placeholder="Blok adı (Örn: A)" value={blockName} onChange={(e)=>setBlockName(e.target.value)} data-testid="block-name-input" />
                  <Button size="sm" onClick={createBlock} data-testid="block-add-btn"><Plus className="w-3 h-3" /></Button>
                </div>
              )}
              <div className="space-y-1 mt-2">
                {blocks.length === 0 && <div className="text-xs text-slate-400 py-2">Blok yok</div>}
                {blocks.map((b) => (
                  <div key={b.id} className="px-3 py-2 border rounded flex items-center justify-between bg-slate-50" data-testid={`block-row-${b.id}`}>
                    <div className="text-sm font-medium">{b.name}</div>
                    <div className="text-xs text-slate-500">{units.filter(u=>u.block_id===b.id).length} b.b.</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Bağımsız Bölümler ({units.length})</CardTitle>
              {canWrite && blocks.length > 0 && (
                <Button size="sm" onClick={openNewUnit} data-testid="new-unit-btn"><Plus className="w-4 h-4 mr-1" />Yeni</Button>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Blok</TableHead><TableHead>No</TableHead><TableHead>Tür</TableHead><TableHead className="text-right">m²</TableHead><TableHead className="text-right">Arsa Payı</TableHead><TableHead>Durum</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {units.map(u => {
                    const active = u.active !== false;
                    return (
                      <TableRow key={u.id} data-testid={`unit-row-${u.id}`} className={active ? "" : "opacity-60"}>
                        <TableCell>{blocks.find(b=>b.id===u.block_id)?.name || "-"}</TableCell>
                        <TableCell className="font-medium">{u.no}</TableCell>
                        <TableCell>{u.kind === "konut" ? "Konut" : "İşyeri"}</TableCell>
                        <TableCell className="text-right font-mono">{u.area_m2}</TableCell>
                        <TableCell className="text-right font-mono">{u.share_ratio}</TableCell>
                        <TableCell>{active ? <Badge className="bg-emerald-500">Aktif</Badge> : <Badge variant="secondary">Pasif</Badge>}</TableCell>
                        <TableCell>
                          {canWrite && (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={()=>openEditUnit(u)} data-testid={`unit-edit-${u.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                              <Button size="sm" variant="ghost" onClick={()=>toggleActive(u)} data-testid={`unit-toggle-${u.id}`}>{active ? "Pasife Al" : "Aktifleştir"}</Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {units.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-slate-400 py-4">Kayıt yok</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Unit form dialog (create or edit) */}
      <Dialog open={openUnit} onOpenChange={setOpenUnit}>
        <DialogContent className="bg-white">
          <DialogHeader><DialogTitle>{unitForm.id ? "Bağımsız Bölüm Düzenle" : "Yeni Bağımsız Bölüm"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Blok</Label>
              <Select value={unitForm.block_id} onValueChange={(v)=>setUnitForm({...unitForm, block_id: v})}>
                <SelectTrigger data-testid="unit-block-select"><SelectValue placeholder="Blok seç" /></SelectTrigger>
                <SelectContent className="bg-white">{blocks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Daire No</Label><Input value={unitForm.no} onChange={(e)=>setUnitForm({...unitForm, no: e.target.value})} data-testid="unit-no-input" /></div>
            <div><Label>Tür</Label>
              <Select value={unitForm.kind} onValueChange={(v)=>setUnitForm({...unitForm, kind: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="konut">Konut</SelectItem>
                  <SelectItem value="isyeri">İşyeri</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>m²</Label><Input type="number" value={unitForm.area_m2} onChange={(e)=>setUnitForm({...unitForm, area_m2: e.target.value})} /></div>
              <div><Label>Arsa Payı</Label><Input type="number" value={unitForm.share_ratio} onChange={(e)=>setUnitForm({...unitForm, share_ratio: e.target.value})} /></div>
            </div>
            <div><Label>Durum</Label>
              <Select value={unitForm.active ? "true" : "false"} onValueChange={(v)=>setUnitForm({...unitForm, active: v === "true"})}>
                <SelectTrigger data-testid="unit-active-select"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="true">Aktif</SelectItem>
                  <SelectItem value="false">Pasif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button onClick={saveUnit} data-testid="unit-save-btn">Kaydet</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
