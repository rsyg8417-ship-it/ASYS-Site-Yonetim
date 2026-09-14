import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster, toast } from "sonner";
import { Building2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
      toast.success("E-posta gönderildi");
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
            <div className="text-xs text-slate-400 uppercase tracking-widest">Parola Sıfırlama</div>
          </div>
        </div>
        <Card className="bg-white border-slate-200" data-testid="forgot-password-card">
          <CardHeader><CardTitle>Parolamı Unuttum</CardTitle></CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-3 py-2" data-testid="forgot-sent-message">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm text-slate-700">
                  Eğer bu e-posta sistemde kayıtlıysa, parola sıfırlama bağlantısı gönderildi.
                </p>
                <p className="text-xs text-slate-500">Bağlantı 1 saat geçerlidir. Spam klasörünüzü de kontrol edin.</p>
                <Button variant="ghost" className="mt-4" onClick={() => navigate("/login")} data-testid="back-to-login-btn">
                  <ArrowLeft className="w-4 h-4 mr-1" />Giriş Sayfasına Dön
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <p className="text-sm text-slate-600">Kayıtlı e-postanızı girin, size sıfırlama bağlantısı gönderelim.</p>
                <div>
                  <Label>E-posta</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="forgot-email-input" />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="forgot-submit-btn">
                  {loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
                </Button>
                <button type="button" onClick={() => navigate("/login")} className="w-full text-sm text-slate-500 hover:text-slate-900" data-testid="back-to-login-link">
                  Giriş sayfasına dön
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
