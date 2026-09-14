import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, formatApiError } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { KeyRound, User } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (next.length < 6) return toast.error("Yeni parola en az 6 karakter olmalı");
    if (next !== confirm) return toast.error("Parolalar eşleşmiyor");
    setLoading(true);
    try {
      await api.post("/auth/change-password", { current_password: current, new_password: next });
      toast.success("Parolanız güncellendi");
      setCurrent(""); setNext(""); setConfirm("");
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="profile-page">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Profil</h1>
        <p className="text-sm text-slate-500 mt-1">Hesap bilgileri ve parola değişikliği</p>
      </div>

      <Card className="bg-white">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" />Hesap Bilgileri</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label className="text-xs text-slate-500">Ad Soyad</Label><div className="mt-1 font-medium">{user?.name}</div></div>
            <div><Label className="text-xs text-slate-500">Rol</Label><div className="mt-1 font-medium">{ROLE_LABEL[user?.role]}</div></div>
            <div><Label className="text-xs text-slate-500">E-posta</Label><div className="mt-1 font-mono text-sm">{user?.email}</div></div>
            <div><Label className="text-xs text-slate-500">Telefon</Label><div className="mt-1 font-mono text-sm">{user?.phone || "—"}</div></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="w-4 h-4" />Parolayı Değiştir</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Mevcut Parola</Label>
              <Input type="password" value={current} onChange={(e)=>setCurrent(e.target.value)} required data-testid="profile-current-password" />
            </div>
            <div>
              <Label>Yeni Parola</Label>
              <Input type="password" value={next} onChange={(e)=>setNext(e.target.value)} required data-testid="profile-new-password" />
            </div>
            <div>
              <Label>Yeni Parola (Tekrar)</Label>
              <Input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required data-testid="profile-new-password-confirm" />
            </div>
            <Button type="submit" disabled={loading} className="bg-slate-900 hover:bg-slate-800" data-testid="profile-change-password-btn">
              {loading ? "Güncelleniyor..." : "Parolayı Değiştir"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
