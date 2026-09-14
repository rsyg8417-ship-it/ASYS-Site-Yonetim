import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster, toast } from "sonner";
import { Building2 } from "lucide-react";

export default function Login() {
  const { login, formatApiError } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Giriş başarılı");
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
        <Card className="bg-white border-slate-200">
          <CardHeader><CardTitle>Giriş</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div><Label>E-posta</Label><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required data-testid="login-email" /></div>
              <div><Label>Parola</Label><Input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required data-testid="login-password" /></div>
              <Button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800" data-testid="login-submit-btn">
                {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
