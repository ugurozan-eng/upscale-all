# UpscaleAll — SaaS Tasarım Dokümanı

**Tarih:** 2026-02-25
**Proje:** upscale-all
**Durum:** Onaylandı ✅

---

## 1. Proje Özeti

Multi-provider AI image upscaler SaaS uygulaması. Kullanıcılar fotoğraflarını yükler, upscale türünü seçer; uygulama arka planda en uygun AI provider'ı otomatik seçer. Hem aylık abonelik hem de tek seferlik kredi satışı.

---

## 2. Tech Stack

| Katman | Teknoloji |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | shadcn/ui (New York style) + Tailwind v4 |
| Auth | NextAuth.js v5 (Google Provider) |
| Database | PostgreSQL (DigitalOcean Managed) + Prisma ORM |
| File Storage | DigitalOcean Spaces (S3-uyumlu) |
| Payments | Lemon Squeezy |
| AI Providers | fal.ai, Claid.ai, Runware.ai |
| Deploy | DigitalOcean App Platform |

---

## 3. Mimari

### Dizin Yapısı

```
upscale-all/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── page.tsx              → Ana upscale sayfası
│   │   ├── history/page.tsx      → İşlem geçmişi
│   │   └── billing/page.tsx      → Abonelik & kredi satın alma
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── upscale/route.ts      → POST: upscale isteği başlat
│   │   ├── upscale/[jobId]/route.ts → GET: job durumu polling
│   │   ├── upload/route.ts       → POST: DO Spaces'e yükle
│   │   └── webhooks/
│   │       └── lemon-squeezy/route.ts
│   └── page.tsx                  → Landing page
├── lib/
│   ├── providers/
│   │   ├── claid.ts
│   │   ├── fal.ts
│   │   └── runware.ts
│   ├── router.ts                 → Kategori → Provider routing
│   ├── storage.ts                → DO Spaces client
│   ├── credits.ts                → Kredi yönetim fonksiyonları
│   └── db/
│       └── prisma.ts
├── components/
│   ├── ui/                       → shadcn bileşenler
│   ├── upscale/
│   │   ├── upload-zone.tsx
│   │   ├── category-selector.tsx
│   │   ├── comparison-slider.tsx
│   │   └── processing-state.tsx
│   └── billing/
│       ├── credit-badge.tsx
│       └── pricing-table.tsx
└── prisma/
    └── schema.prisma
```

### Veri Akışı

```
Kullanıcı fotoğraf yükler
  → /api/upload → DO Spaces (input/userId/filename)
  → inputUrl döner

Kullanıcı kategori seçer ve "Upscale Yap"a basar
  → /api/upscale POST { inputUrl, category, scale }
  → Kredi kontrol (yeterli mi?)
  → Kredi rezerve et (optimistic lock)
  → router.ts ile provider seç
  → UpscaleJob DB kaydı (status: pending)
  → Provider API'ye async istek
  → jobId döner

Frontend polling (3sn aralıkla)
  → /api/upscale/[jobId] GET
  → status: pending | processing | done | failed

İşlem tamamlandığında
  → Sonuç DO Spaces'e kaydet (output/userId/filename)
  → UpscaleJob güncelle (status: done, outputUrl)
  → CreditTransaction kaydet (type: usage, amount: -4)
  → Frontend'e sonuç göster

Hata durumunda
  → Kredi iade et
  → Fallback provider dene (varsa)
  → UpscaleJob status: failed
```

---

## 4. Veritabanı Şeması

```prisma
model User {
  id            String              @id @default(cuid())
  email         String              @unique
  name          String?
  image         String?
  credits       Int                 @default(10)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  accounts      Account[]
  sessions      Session[]
  subscription  Subscription?
  jobs          UpscaleJob[]
  transactions  CreditTransaction[]
}

model Subscription {
  id               String   @id @default(cuid())
  userId           String   @unique
  user             User     @relation(fields: [userId], references: [id])
  plan             String   // "basic" | "pro"
  status           String   // "active" | "cancelled" | "past_due"
  lsSubscriptionId String   @unique
  currentPeriodEnd DateTime
  monthlyCredits   Int      // 200 (basic) | 600 (pro)
  renewedAt        DateTime?
  createdAt        DateTime @default(now())
}

model UpscaleJob {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  category    String    // "portrait" | "clarity" | "product" | "anime" | "restoration"
  provider    String    // "claid" | "fal" | "runware"
  status      String    // "pending" | "processing" | "done" | "failed"
  inputUrl    String
  outputUrl   String?
  creditsUsed Int       @default(4)
  scale       Int       @default(4)
  errorMsg    String?
  createdAt   DateTime  @default(now())
  completedAt DateTime?

  @@index([userId, createdAt])
}

model CreditTransaction {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  amount    Int      // pozitif = ekle, negatif = düş
  type      String   // "purchase" | "subscription_renewal" | "usage" | "bonus" | "refund"
  lsOrderId String?
  jobId     String?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}

// NextAuth standart modeller
model Account { ... }
model Session { ... }
model VerificationToken { ... }
```

---

## 5. Provider Routing

```typescript
// lib/router.ts

export type UpscaleCategory =
  | "portrait"
  | "clarity"
  | "product"
  | "anime"
  | "restoration";

export type ProviderName = "claid" | "fal" | "runware";

const ROUTING_TABLE: Record<
  UpscaleCategory,
  { primary: ProviderName; fallback: ProviderName }
> = {
  portrait:    { primary: "claid",   fallback: "fal"     },
  clarity:     { primary: "fal",     fallback: "runware" },
  product:     { primary: "claid",   fallback: "fal"     },
  anime:       { primary: "fal",     fallback: "runware" },
  restoration: { primary: "fal",     fallback: "runware" },
};
```

### Provider → Model Eşleştirmesi

| Provider | Endpoint/Model | Kullanım |
|---|---|---|
| Claid.ai | `POST /upscale/portrait` | Portre, yüz detayları |
| Claid.ai | `POST /upscale/smart` | Ürün/e-ticaret fotoğrafı |
| fal.ai | `fal-ai/aura-sr` | Genel clarity upscale |
| fal.ai | `fal-ai/esrgan` | Anime/illüstrasyon |
| fal.ai | `fal-ai/image-restoration` | Eski fotoğraf restoration |
| Runware.ai | `upscale` | Fallback (tüm kategoriler) |

> **Not:** Replicate entegrasyonu — geçmiş deneyimlerdeki zorluklar nedeniyle bu projede kullanılmayacak.

---

## 6. Fiyatlandırma

### Kredi Sistemi
- 1 Upscale işlemi = **4 Kredi**
- Yeni üyelere **10 kredi** hediye (2 ücretsiz işlem)

### Tek Seferlik Kredi Paketleri (Lemon Squeezy)
| Paket | Kredi | Fiyat | Upscale |
|---|---|---|---|
| Starter | 40 | $4.99 | 10 |
| Popular | 120 | $11.99 | 30 |
| Pro Pack | 400 | $29.99 | 100 |

### Aylık Abonelik (Lemon Squeezy)
| Plan | Fiyat | Aylık Kredi | Upscale/Ay |
|---|---|---|---|
| Basic | $9.99/ay | 200 | 50 |
| Pro | $24.99/ay | 600 | 150 |

---

## 7. UI/UX Sayfaları

### Landing Page (`/`)
- Hero section: "AI ile Fotoğrafınızı 4x Büyütün"
- Önce/Sonra karşılaştırma slider'ları (demo)
- 5 kategori tanıtımı
- Fiyatlandırma tablosu
- "Ücretsiz Başla" → Google Login

### Auth (`/login`)
- Google OAuth ile tek tıkla giriş

### Dashboard (`/dashboard`)
- Üstte: Kredi bakiyesi + abonelik durumu
- Drag & Drop upload alanı (max 10MB, JPG/PNG/WEBP)
- Kategori seçimi (5 kart/buton)
- Ölçek seçimi: 2x | 4x
- "Upscale Yap (4 Kredi)" butonu
- İşlem durumu: Progress bar + animasyon
- Sonuç: Önce/Sonra slider karşılaştırması
- İndir butonu

### Geçmiş (`/dashboard/history`)
- Tüm işlemler (sayfalandırılmış)
- Filtreler: Kategori, tarih, durum
- Her işlem için tekrar indirme

### Faturalama (`/dashboard/billing`)
- Mevcut plan & kredi bakiyesi
- Kredi geçmişi
- Abonelik planları
- Kredi paketleri
- Lemon Squeezy checkout sayfasına yönlendirme

---

## 8. Kritik Edge Cases

1. **Yetersiz Kredi:** İşlem başlamadan blokla, net hata mesajı
2. **Provider Hatası:** Fallback provider dene, ikisi de başarısız olursa kredi iade et
3. **Uzun İşlem Süresi:** Polling timeout (5 dakika) sonrası kullanıcıya bildir, kredi iade et
4. **DO Spaces Upload Hatası:** İşlem başlamadan önce hata yakala
5. **Lemon Squeezy Webhook Duplicate:** Idempotency key ile tekrar işlemeyi önle
6. **Abonelik İptal:** `past_due` durumunda işlem yap ama yenileme yapma
7. **Büyük Dosya:** Frontend'de boyut kontrolü (10MB limit) + backend doğrulama

---

## 9. Build Fazları

### Phase 1 — Foundation
- Prisma schema + PostgreSQL bağlantısı
- NextAuth.js v5 + Google OAuth
- DO Spaces entegrasyonu (upload/download)
- fal.ai tek provider ile clarity upscale
- Temel dashboard UI

### Phase 2 — Multi-Provider
- Claid.ai entegrasyonu
- Runware.ai entegrasyonu
- Akıllı router + fallback sistemi
- Tüm 5 kategori
- Karşılaştırma slider'ı
- İşlem geçmişi

### Phase 3 — Payments
- Lemon Squeezy kurulumu
- Kredi paketi satışı
- Abonelik (Basic/Pro)
- Webhook handler
- Aylık kredi yenileme

### Phase 4 — Polish & Deploy
- Landing page
- Hata yönetimi & kredi iade
- DO App Platform deploy
- Production env variables
- Performans optimizasyonu

---

## 10. Environment Variables

```env
# Database
DATABASE_URL=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# DigitalOcean Spaces
DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_ENDPOINT=
DO_SPACES_BUCKET=
DO_SPACES_REGION=

# AI Providers
FAL_KEY=
CLAID_API_KEY=
RUNWARE_API_KEY=

# Lemon Squeezy
LEMONSQUEEZY_API_KEY=
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_STORE_ID=
```
