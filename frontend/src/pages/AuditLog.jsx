import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSite } from "@/context/SiteContext";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AuditLog() {
  const { siteId } = useSite();
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    api.get("/audit", { params: siteId ? { site_id: siteId, limit: 500 } : { limit: 500 } }).then(r => setLogs(r.data));
  }, [siteId]);

  return (
    <div className="space-y-6" data-testid="audit-page">
      <div><h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Audit Log</h1>
        <p className="text-sm text-slate-500 mt-1">Tüm kritik işlemlerin değiştirilemez kaydı</p></div>
      <Card className="bg-white"><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Zaman</TableHead><TableHead>Kullanıcı</TableHead><TableHead>İşlem</TableHead><TableHead>Varlık</TableHead><TableHead>Detay</TableHead></TableRow></TableHeader>
          <TableBody>
            {logs.map(l => (
              <TableRow key={l.id} data-testid={`audit-row-${l.id}`}>
                <TableCell className="text-sm font-mono">{formatDateTime(l.ts)}</TableCell>
                <TableCell className="text-sm">{l.user_email} <Badge variant="outline" className="ml-1 text-[10px]">{l.user_role}</Badge></TableCell>
                <TableCell><Badge variant="secondary" className="font-mono text-xs">{l.action}</Badge></TableCell>
                <TableCell className="text-sm">{l.entity} {l.entity_id && <span className="text-slate-400 font-mono text-xs">({l.entity_id.slice(0,8)})</span>}</TableCell>
                <TableCell className="text-xs text-slate-500 font-mono">{JSON.stringify(l.meta || {})}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-6">Kayıt yok</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
