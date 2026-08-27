# ARCHITECTURE.md — Kontrak Teknis

> Ini kontrak antar-agent. Backend dan frontend dikerjakan agent berbeda, jadi
> **bentuk request/response di bawah ini adalah hukum**. Kalau butuh field baru,
> ubah file ini dulu lewat PR terpisah, baru koding.

---

## 1. Struktur Folder (kepemilikan per agent)

```
money-analysis-bot/
├── server/                 ← OWNER: Claude Code
│   ├── config/
│   │   ├── config.js
│   │   └── constants.js    (TRIAL_DAYS, MEMBER_DAYS, CONFIDENCE_THRESHOLD, dll)
│   ├── models/             (Sequelize models)
│   ├── migrations/
│   ├── seeders/
│   ├── telegram/
│   │   ├── client.js       (satu-satunya file yang memanggil Bot API)
│   │   ├── router.js       (route update: command / text / voice / photo / callback)
│   │   └── formatter.js    (menyusun teks balasan + inline keyboard)
│   ├── ai/
│   │   ├── aiClient.js     (satu-satunya file yang memanggil API AI)
│   │   ├── parseMessage.js (teks → transaksi)
│   │   ├── parseVoice.js   (file voice → transkrip → parseMessage)
│   │   ├── parseReceipt.js (file foto → OCR → 1..n transaksi)
│   │   ├── ruleParser.js   (regex, jalur tier free)
│   │   └── analyzer.js     (metrics → narasi)
│   ├── services/
│   │   ├── entitlementService.js   (satu-satunya penentu tier)
│   │   ├── transactionService.js
│   │   ├── budgetService.js
│   │   ├── metricsService.js       (hitung angka, TANPA AI)
│   │   └── analysisService.js      (metrics + cache + panggil analyzer)
│   ├── controllers/
│   ├── routes/
│   ├── middlewares/        (authentication, entitlement, telegramAuth, errorHandler)
│   ├── helpers/            (jwt.js, bcrypt.js, money.js, dateHelper.js, stateStore.js)
│   ├── __tests__/
│   ├── app.js
│   ├── bin/www.js
│   └── bin/cron.js         (proses terpisah, bukan di dalam web server)
│
├── client/                 ← OWNER: Cline
│   ├── src/
│   │   ├── components/
│   │   ├── pages/          (Login, Overview, Transactions, Analysis, Budget)
│   │   ├── services/api.js
│   │   ├── context/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── vite.config.js
│
├── .github/workflows/      ← OWNER: Antigravity
├── docs/                   ← OWNER: Antigravity
├── SPEC.md / PRD.md / ARCHITECTURE.md / ERD.md / STYLE.md / TESTING.md /
│   AGENTS.md / WORKFLOW.md      ← OWNER: kamu (manusia)
└── README.md               ← OWNER: Antigravity
```

**Aturan:** agent hanya boleh mengubah file di folder miliknya. Kalau butuh
perubahan di folder agent lain → buka issue, jangan edit sendiri.

## 2. Schema Database

Relasi antar tabel, constraint, dan index ada di `ERD.md`. Di sini kolomnya.

### Users
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| telegramId | bigint | unique, not null — identitas utama |
| username | string | nullable, `@username` Telegram |
| name | string | dari first_name + last_name profil Telegram |
| email | string | nullable, unique, dipakai kalau login dashboard pakai password |
| password | string | hashed bcrypt, nullable (bot tidak butuh password) |
| trialStartedAt | date | diisi sekali saat `/start` pertama |
| trialEndsAt | date | `trialStartedAt + 5 hari`, **tidak pernah diubah** |
| timezone | string | default `Asia/Jakarta` |

> **Tidak ada kolom `plan`.** Tier dihitung, lihat `SPEC.md §4`.

### Subscriptions
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| UserId | integer FK | not null |
| status | string | enum: `pending_payment` / `active` / `expired` / `cancelled` |
| price | integer | rupiah penuh, snapshot harga saat beli |
| paymentRef | string | nullable, referensi dari payment gateway, unique |
| startedAt | date | |
| expiresAt | date | `startedAt + 30 hari` |

### Wallets
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| name | string | not null, default `Dompet Utama` |
| UserId | integer FK | pemilik |

### Categories
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| WalletId | integer FK | not null |
| name | string | not null |
| type | string | enum: `income` / `expense` |
| isDefault | boolean | default true untuk kategori bawaan |

### Transactions (append-only, tidak pernah di-update)
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| WalletId | integer FK | not null |
| UserId | integer FK | siapa yang input |
| CategoryId | integer FK | nullable saat masuk |
| type | string | enum: `income` / `expense` / `correction` |
| amount | integer | > 0, satuan rupiah penuh (bukan desimal) |
| note | string | hasil ekstraksi, mis. "makan siang" |
| source | string | enum: `text` / `voice` / `photo` / `dashboard` |
| parseMode | string | enum: `ai` / `rule` / `manual` — untuk audit biaya & akurasi |
| rawMessage | text | pesan asli / transkrip / `file_id` — untuk audit & re-parse |
| aiConfidence | float | 0–1, null kalau `parseMode` bukan `ai` |
| correctsId | integer FK | nullable, wajib terisi kalau `type` = `correction` |
| occurredAt | date | kapan transaksi terjadi (bisa beda dari createdAt) |

### Budgets
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| WalletId | integer FK | not null |
| CategoryId | integer FK | not null |
| monthlyLimit | integer | >= 0 |
| periodMonth | string | format `YYYY-MM` |

### Analyses (cache hasil AI, biar tidak panggil model berulang)
| kolom | tipe | keterangan |
|---|---|---|
| id | integer PK | |
| WalletId | integer FK | not null |
| scope | string | enum: `on_transaction` / `weekly` / `monthly` |
| periodStart | date | |
| periodEnd | date | |
| inputHash | string | hash dari metrics — kunci cache |
| metrics | jsonb | angka mentah hasil `metricsService` |
| insight | text | narasi AI yang dikirim ke user |
| tokensUsed | integer | untuk kontrol biaya |

### State konfirmasi — BUKAN tabel
Disimpan di `Map` in-memory lewat `helpers/stateStore.js`, TTL 5 menit:
```js
stateStore.set(telegramId, { draft, messageId }, 300);
stateStore.get(telegramId);   // null kalau sudah lewat TTL
stateStore.del(telegramId);
```

## 3. Format Response Standar

Sukses:
```json
{ "message": "Transaction created", "data": { } }
```

List dengan pagination:
```json
{
  "data": [],
  "meta": { "page": 1, "limit": 10, "totalItems": 57, "totalPages": 6 }
}
```

Error (SEMUA error lewat `errorHandler` middleware):
```json
{ "message": "Fitur analisis hanya untuk Member" }
```

Error karena tier (khusus, ada field tambahan supaya frontend bisa tampilkan
halaman upsell):
```json
{ "message": "Fitur analisis hanya untuk Member", "requiredTier": "member" }
```

Kode status yang dipakai: `200`, `201`, `400` (validasi/business rule), `401`
(belum login / token invalid), `403` (tier tidak berwenang), `404`, `429` (kuota
AI habis), `500`.

## 4. Daftar Endpoint

### 4a. Webhook (dipanggil Telegram & payment gateway, bukan client)
| Method | Path | Keterangan |
|---|---|---|
| POST | `/webhook/telegram` | Inbound update. Divalidasi `X-Telegram-Bot-Api-Secret-Token` |
| POST | `/webhook/payment` | Notifikasi pembayaran. Divalidasi signature gateway |
| GET | `/health` | Untuk uptime monitor & smoke test deploy |

### 4b. REST API Dashboard
| Method | Path | Tier | Keterangan |
|---|---|---|---|
| POST | `/api/auth/request-otp` | publik | body: `telegramId` → kode 6 digit dikirim ke Telegram |
| POST | `/api/auth/verify-otp` | publik | return `{ access_token, user }` |
| POST | `/api/auth/login` | publik | alternatif email + password |
| GET | `/api/me` | semua | profil + `{ tier, expiresAt }` |
| GET | `/api/transactions` | trial, member | query: `type`, `CategoryId`, `dateFrom`, `dateTo`, `page`, `limit` |
| POST | `/api/transactions` | trial, member | input manual, `source` = `dashboard` |
| PUT | `/api/transactions/:id` | trial, member | koreksi → membuat baris `correction` baru |
| GET | `/api/categories` | trial, member | |
| POST | `/api/categories` | trial, member | |
| GET | `/api/budgets` | trial, member | query: `periodMonth` |
| POST | `/api/budgets` | trial, member | |
| GET | `/api/dashboard/summary` | trial, member | angka ringkasan + data grafik |
| GET | `/api/analysis` | trial, member | query: `period=weekly\|monthly` → insight + metrics |
| POST | `/api/subscriptions/checkout` | semua | buat `pending_payment` + link bayar |

Tier `free` yang memanggil endpoint mana pun selain `/api/auth/*` dan `/api/me`
→ **403** dengan `requiredTier`.

### Contoh payload webhook masuk (Telegram Update object)
```json
{
  "update_id": 100001,
  "message": {
    "message_id": 42,
    "from": { "id": 123456789, "first_name": "Budi", "username": "budi" },
    "chat": { "id": 123456789, "type": "private" },
    "date": 1755840000,
    "text": "makan siang 35rb"
  }
}
```
Voice: field `message.voice.file_id`. Foto struk: `message.photo[-1].file_id`
(ambil resolusi terbesar). File diunduh lewat `getFile` sebelum diproses.

### Contoh output parser (kontrak internal, wajib bentuk ini)
```json
{
  "transactions": [
    {
      "type": "expense",
      "amount": 35000,
      "categoryName": "Makanan",
      "note": "makan siang",
      "occurredAt": "2026-08-26"
    }
  ],
  "confidence": 0.93
}
```
Satu pesan bisa menghasilkan lebih dari satu transaksi. `ruleParser.js` wajib
mengembalikan bentuk yang sama, dengan `confidence: null`.

### Contoh input analyzer (metrics — dihitung `metricsService`, BUKAN AI)
```json
{
  "period": { "start": "2026-08-01", "end": "2026-08-26" },
  "totalIncome": 8000000,
  "totalExpense": 4380000,
  "byCategory": [
    { "name": "Makanan", "amount": 1650000, "share": 0.38, "txCount": 42 }
  ],
  "topChanges": [
    { "name": "Makanan", "deltaPct": 0.18, "deltaAmount": 250000 }
  ],
  "budgetStatus": [
    { "name": "Makanan", "limit": 2000000, "used": 1650000, "remaining": 350000, "daysLeft": 5 }
  ]
}
```
AI menerima objek ini dan **hanya** menyusun narasi. Dilarang mengirim daftar
transaksi mentah ke AI untuk dijumlahkan.

## 5. Header Autentikasi

```
Authorization: Bearer <access_token>
```
Payload JWT hanya berisi: `{ id, telegramId }`. **Tier tidak masuk token** — selalu
dihitung ulang dari DB, supaya langganan yang expired langsung berlaku tanpa
menunggu token kedaluwarsa.

Bot Telegram tidak pakai JWT. Identitas dari `message.from.id`, divalidasi lewat
tabel `Users`.

## 6. Alur Kritis: Pesan Masuk → Transaksi → Balasan

```
 1. Validasi header X-Telegram-Bot-Api-Secret-Token. Tidak cocok → 401, stop.
 2. Cek update_id sudah pernah diproses? Kalau ya → 200, stop (idempoten).
 3. res.status(200).send() SEKARANG. Sisanya diproses setelah ini.
 4. Cari User by telegramId. Belum ada → buat User + Wallet + kategori default,
    set trialStartedAt = now, trialEndsAt = now + 5 hari.
 5. tier = entitlementService.resolve(user)
 6. Route berdasarkan isi update:
    - command       → commandHandler
    - callback_query→ confirmationHandler (baca stateStore)
    - text          → tier free ? ruleParser : ai/parseMessage
    - voice         → tier free ? balas upsell & STOP : getFile → STT → parse
    - photo         → tier free ? balas upsell & STOP : getFile → OCR → parse
 7. confidence < 0.75 → simpan draft ke stateStore (TTL 300s), balas inline
    keyboard [Ya][Ubah][Batal], JANGAN insert. Stop di sini.
 8. Insert Transaction (parseMode diisi: ai / rule)
 9. Hitung ulang sisa budget kategori terkait bulan berjalan
10. tier punya akses analisis?
    - ya  → metricsService.build() → analysisService.get() (cek cache dulu)
    - tidak → siapkan pesan upsell
11. Kirim balasan lewat telegram/client.js
```

**Kalau langkah 6–10 gagal:** transaksi yang sudah masuk di langkah 8 **tetap
disimpan**. Balas apa adanya tanpa analisis. Jangan rollback data user.

## 7. Alur Kritis: POST /api/transactions (dan koreksi)

```
1. Buka transaksi DB
2. Validasi: amount > 0 integer, CategoryId milik Wallet yang sama
3. Insert Transaction
4. Kalau ini koreksi (PUT /:id):
   - baca transaksi lama, pastikan belum pernah dikoreksi
   - insert baris baru type 'correction' dengan correctsId = id lama
   - baris lama TIDAK disentuh sama sekali
5. Commit. Error di langkah mana pun → rollback penuh
```

## 8. Alur Kritis: Cron Expiry (bin/cron.js, jalan tiap hari 00:05)

```
1. Subscriptions status 'active' dengan expiresAt < now → set 'expired'
2. Users yang trialEndsAt-nya lewat dalam 24 jam terakhir dan tidak punya
   subscription aktif → kirim pesan "trial habis" + CTA /upgrade
3. Users yang trialEndsAt / expiresAt tinggal 1 hari → kirim pengingat
4. Tidak ada data transaksi yang diubah atau dihapus. Turun tier hanya
   mempengaruhi akses.
```
