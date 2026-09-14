import { useEffect, useRef, useState } from "react";
import { api, hasToken } from "@/lib/api";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock } from "lucide-react";

// Reads JWT exp claim to detect impending session expiry.
function decodeExp(token) {
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.exp ? decoded.exp * 1000 : null;
  } catch { return null; }
}

const WARN_BEFORE_MS = 5 * 60 * 1000; // 5 minutes
const CHECK_INTERVAL = 30 * 1000; // check every 30s

export default function SessionWatcher({ onExpired }) {
  const [showWarn, setShowWarn] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => {
    const check = () => {
      if (!hasToken()) { setShowWarn(false); return; }
      const token = localStorage.getItem("asys_token");
      const expMs = decodeExp(token);
      if (!expMs) return;
      const remaining = expMs - Date.now();
      if (remaining <= 0) {
        localStorage.removeItem("asys_token");
        setShowWarn(false);
        onExpired?.();
        return;
      }
      if (remaining <= WARN_BEFORE_MS && !showWarn) {
        setShowWarn(true);
      }
      setSecondsLeft(Math.max(0, Math.floor(remaining / 1000)));
    };
    check();
    timerRef.current = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [showWarn, onExpired]);

  useEffect(() => {
    if (!showWarn) return;
    tickRef.current = setInterval(() => {
      const token = localStorage.getItem("asys_token");
      const expMs = decodeExp(token);
      if (!expMs) return;
      setSecondsLeft(Math.max(0, Math.floor((expMs - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [showWarn]);

  const extend = async () => {
    try {
      const { data } = await api.post("/auth/refresh");
      if (data.access_token) localStorage.setItem("asys_token", data.access_token);
      toast.success("Oturum uzatıldı");
      setShowWarn(false);
    } catch {
      toast.error("Oturum uzatılamadı");
    }
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <Dialog open={showWarn} onOpenChange={setShowWarn}>
      <DialogContent className="bg-white max-w-sm" data-testid="session-warning-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />Oturum Süresi Doluyor
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Oturumunuz <span className="font-mono font-bold text-amber-600">{mins}:{secs.toString().padStart(2, "0")}</span> içinde sona erecek. Devam etmek ister misiniz?
          </p>
          <p className="text-xs text-slate-500">
            Uzatmazsanız işlemleriniz kayıp yaşayabilir; kaydedilmemiş formlar veri kaybedebilir.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowWarn(false)} data-testid="session-dismiss-btn">Şimdilik Yok Say</Button>
          <Button onClick={extend} className="bg-slate-900 hover:bg-slate-800" data-testid="session-extend-btn">Oturumu Uzat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
