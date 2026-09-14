import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster, toast } from "sonner";
import { Building2, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Parola en az 6 karakter olmalı");
    if (pw !== confirm) return toast.error("Parolalar eşleşmiyor");
    if (!token) return toast.error("Geçersiz bağlantı");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pw });
      setDone(true);
      toast.success("Parola güncellendi");
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
            <div className="text-xs text-slate-400 uppercase tracking-widest">Yeni Parola</div>
          </div>
        </div>
        <Card className="bg-white border-slate-200" data-testid="reset-password-card">
          <CardHeader><CardTitle>Yeni Parola Belirle</CardTitle></CardHeader>
          <CardContent>
            {!token && <p className="text-sm text-rose-600" data-testid="reset-no-token">Geçersiz sıfırlama bağlantısı.</p>}
            {done ? (
              <div className="text-center space-y-3 py-2" data-testid="reset-done">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm text-slate-700">Parolanız başarıyla güncellendi.</p>
                <Button className="mt-2 bg-slate-900 hover:bg-slate-800" onClick={() => navigate("/login")} data-testid="reset-goto-login-btn">
                  Giriş Yap
                </Button>
              </div>
            ) : token && (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label>Yeni Parola</Label>
                  <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required data-testid="reset-password-input" />
                </div>
                <div>
                  <Label>Yeni Parola (Tekrar)</Label>
                  <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required data-testid="reset-password-confirm" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="reset-submit-btn">
                  {loading ? "Güncelleniyor..." : "Parolayı Güncelle"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
