import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster, toast } from "sonner";
import { Building2 } from "lucide-react";

export default function Setup() {
  const { setupAdmin, formatApiError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("rsyg8417@gmail.com");
  const [name, setName] = useState("Yönetici");
  const [phone, setPhone] = useState("0505 369 99 84");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Parola en az 6 karakter olmalı");
    if (password !== confirm) return toast.error("Parolalar eşleşmiyor");
    setLoading(true);
    try {
      await setupAdmin(email, name, password, phone);
      toast.success("Kurulum tamamlandı");
      navigate("/", { replace: true });
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <Toaster position="top-right" richColors />
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-10 h-10 rounded bg-sky-500 flex items-center justify-center"><Building2 className="w-6 h-6 text-white" /></div>
          <div>
            <div className="text-2xl font-extrabold text-white tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>ASYS</div>
            <div className="text-xs text-slate-400 uppercase tracking-widest">Apartman & Site Yönetimi</div>
          </div>
        </div>
        <Card className="bg-white border-slate-200" data-testid="first-run-wizard-container">
          <CardHeader>
            <CardTitle>İlk Kurulum</CardTitle>
            <p className="text-sm text-slate-500">Yönetici hesabını oluşturun. Bu ekran yalnızca bir kez görüntülenir.</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div><Label>E-posta</Label><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required data-testid="setup-email" /></div>
              <div><Label>Ad Soyad</Label><Input value={name} onChange={(e)=>setName(e.target.value)} required data-testid="setup-name" /></div>
              <div><Label>Telefon</Label><Input value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="0505 369 99 84" data-testid="setup-phone" /></div>
              <div><Label>Parola</Label><Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required data-testid="setup-password" /></div>
              <div><Label>Parola (Tekrar)</Label><Input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required data-testid="setup-password-confirm" /></div>
              <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="admin-create-submit-button">
                {loading ? "Oluşturuluyor..." : "Yöneticiyi Oluştur"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
