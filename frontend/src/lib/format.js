// Turkish TL / kuruş formatting utilities
export function fromKurus(k) {
  return (k || 0) / 100;
}

export function toKurus(tl) {
  const n = typeof tl === "string" ? parseFloat(tl.replace(",", ".")) : tl;
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function formatTL(kurus) {
  const v = (kurus || 0) / 100;
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(v);
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("tr-TR");
}

export function formatDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("tr-TR");
}

export function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export const ROLE_LABEL = {
  admin: "Yönetici",
  muhasebe: "Muhasebe",
  denetci: "Denetçi",
};

export const STATUS_LABEL = {
  open: "Açık",
  partial: "Kısmi",
  paid: "Ödendi",
  reversed: "İptal",
};
