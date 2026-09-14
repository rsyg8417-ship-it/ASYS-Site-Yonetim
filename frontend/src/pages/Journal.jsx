import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useSite } from "@/context/SiteContext";
import { formatTL, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Journal() {
  const { siteId } = useSite();
  const [entries, setEntries] = useState([]);
  useEffect(() => {
    if (!siteId) return;
    api.get("/journal", { params: { site_id: siteId, limit: 300 } }).then(r => setEntries(r.data));
  }, [siteId]);

  return (
    <div className="space-y-6" data-testid="journal-page">
      <div><h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>Yevmiye Defteri</h1>
        <p className="text-sm text-slate-500 mt-1">Değiştirilemez (immutable) yevmiye fişleri — Borç = Alacak dengesi</p></div>
      <Card className="bg-white" data-testid="yevmiye-defteri-table"><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>Fiş</TableHead><TableHead>Hesap</TableHead><TableHead className="text-right">Borç</TableHead><TableHead className="text-right">Alacak</TableHead></TableRow></TableHeader>
          <TableBody>
            {entries.map(e => (
              <React.Fragment key={e.id}>
                <TableRow className="bg-slate-50" data-testid={`journal-entry-${e.id}`}>
                  <TableCell className="font-medium">{formatDate(e.date)}</TableCell>
                  <TableCell colSpan={3} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{e.description}</span>
                      <Badge variant="outline" className="text-[10px]">Immutable</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatTL(e.total_kurus)}</TableCell>
                </TableRow>
                {e.lines.map((l, idx) => (
                  <TableRow key={`${e.id}-${idx}`} className="text-sm">
                    <TableCell></TableCell>
                    <TableCell className="text-slate-500 font-mono">{l.account_code}</TableCell>
                    <TableCell>{l.account_name}</TableCell>
                    <TableCell className="text-right font-mono">{l.debit_kurus > 0 ? formatTL(l.debit_kurus) : ""}</TableCell>
                    <TableCell className="text-right font-mono">{l.credit_kurus > 0 ? formatTL(l.credit_kurus) : ""}</TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
            {entries.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-6">Fiş yok</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
