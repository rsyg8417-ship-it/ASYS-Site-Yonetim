# ASYS — Apartman ve Site Yönetim Sistemi V1

## Original Problem Statement
Tek yönetici için birden fazla siteyi tam çift taraflı muhasebe motoruyla yöneten, Türkçe, offline-first PWA. Modüller: Site & Yapı, Kişiler, Aidat & Tahakkuk, Gecikme Faizi, Tahsilat (FIFO + avans), Gider, Kasa & Banka, Muhasebe Motoru, Dönem Yönetimi, Kullanıcı & Rol, Audit Log, Yedek & Geri Yükleme, Raporlar. Para birimi integer kuruş, immutable yevmiye kayıtları, kapalı dönem yazım yasağı, unique bank reference, optimistic concurrency.

## Kullanıcı Seçimleri
- **Fazlar:** 1-3 (Temel + Muhasebe + Tahsilat)
- **Auth:** JWT tabanlı özel auth
- **Export:** Excel + PDF
- **Setup:** İlk kurulum form ile
- **PWA:** Tam offline (yazma kuyruğu + sync + çakışma UI)

## Personalar
- **Yönetici (Admin):** Tam yetki, dönem aç/kapa, kullanıcı yönetimi
- **Muhasebe:** Tahakkuk, tahsilat, gider, kasa-banka
- **Denetçi:** Salt okunur erişim

## Uygulanan Özellikler (14 Şubat 2026)

### Backend (FastAPI + MongoDB)
- ✅ İlk kurulum wizardı (`/api/setup/*`) — ilk admin oluşturma
- ✅ JWT auth (bcrypt, 12 saat token, httpOnly cookie + Bearer)
- ✅ Kullanıcı yönetimi (Admin/Muhasebe/Denetçi rolleri, phone alanı)
- ✅ Site/Blok/Bağımsız Bölüm CRUD (site_id izolasyonu)
- ✅ Kişi (Malik/Kiracı) ve ilişki kayıtları
- ✅ Kasa & Banka hesapları + açılış bakiyesi
- ✅ Toplu aidat tahakkuku (eşit / m² / arsa payı dağıtımı)
- ✅ Ek tahakkuk, tahakkuk ters kayıt ile iptal
- ✅ Tahsilat FIFO mahsup + fazla ödeme → otomatik avans hesabı + kullanıcı bildirimi
- ✅ Mükerrer banka referansı engeli (unique partial index)
- ✅ Optimistic concurrency (version field, Türkçe çakışma uyarısı)
- ✅ Gider (kategori, tedarikçi, fatura, banka ref.)
- ✅ Virman (iki hesap arası transfer)
- ✅ Çift taraflı yevmiye motoru (immutable, borç=alacak zorunlu)
- ✅ Dönem aç/kapa (Admin, gerekçe ≥5 karakter, audit'e düşer)
- ✅ Kapalı dönemde yazım engeli (backend'de zorlanır)
- ✅ Audit log (tüm kritik işlemler)
- ✅ Dashboard KPI'ları (borç, tahsilat, gider, bakiye, borçlu sayısı)
- ✅ Raporlar: Borçlu listesi, Gelir-Gider, Bağımsız bölüm ekstresi
- ✅ Excel + PDF export (openpyxl + reportlab)
- ✅ Offline sync batch endpoint (`/api/sync/batch`)

### Frontend (React + Tailwind + shadcn/ui)
- ✅ Setup wizard sayfası (phone alanı dahil)
- ✅ Login sayfası
- ✅ Layout: Sidebar (site seçici) + Topbar (online/offline + sync queue badge)
- ✅ Dashboard KPI kartları
- ✅ Tüm modüller için ayrı sayfa (12 sayfa)
- ✅ Yevmiye Defteri (immutable rozet, borç/alacak sütunları)
- ✅ Dönem Yönetimi (kapama + yeniden açma gerekçe zorunlu)
- ✅ Offline yazım kuyruğu (localStorage + otomatik sync)
- ✅ Türkçe arayüz (%100)
- ✅ Türkçe TL formatı (₺1.250,50)
- ✅ PWA manifest.json

## Test Sonucu
Backend %100 başarılı (33 test) — bkz. `/app/test_reports/iteration_1.json`

## Backlog (V2)
- P1: Gecikme faizi motoru (snapshot ile)
- P1: Yedek al / geri yükle (Mongo dump)
- P2: Sayaç, ısı payı, demirbaş, görev/bakım
- P2: SMS/E-posta bildirim (Twilio/Resend)
- P2: Hesap planı özelleştirme
- P2: Çoklu para birimi
- P2: SaaS onboarding

## Notlar
- Para: integer kuruş (100 = 1 TL), float yasak
- MongoDB replica set önerilir (transaction desteği için)
- Tüm sorgular site_id ile izole
- Kapalı dönem: Admin gerekçe ile yeniden açar, audit'e düşer
