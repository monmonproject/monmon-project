# TESTING.md — TDD, Coverage & End-to-End

> Aturan pokok: **test ditulis sebelum kode.** PR yang test-nya ditulis belakangan
> dianggap belum selesai, walaupun hijau.

---

## 1. Siklus yang Diulang Terus

```
RED      → tulis test dari aturan bisnis di SPEC.md, jalankan, pastikan GAGAL
GREEN    → tulis kode seminimal mungkin sampai lulus
REFACTOR → rapikan, test tetap hijau
COMMIT   → commit test dulu, baru commit implementasi
```

Bukti di PR: dua commit terpisah, `test:` mendahului `feat:`. Kalau di riwayat
commit test dan implementasi masuk barengan, owner berhak menolak PR-nya.

**Kenapa seketat ini:** ini aplikasi uang dengan tier berbayar. Bug di
`entitlementService` artinya user gratisan pakai fitur berbayar (rugi), atau
member bayar tidak dapat fitur (komplain). Dua-duanya mahal.

## 2. Tiga Level Test

| Level | Folder | Database | AI | Telegram |
|---|---|---|---|---|
| Unit | `__tests__/unit/` | mock | mock | mock |
| Integration | `__tests__/integration/` | **Postgres test asli** | mock | mock |
| E2E | `__tests__/e2e/` | **Postgres test asli** | mock | mock, payload diperiksa |

Perbandingan jumlah kira-kira: unit 65%, integration 25%, e2e 10%.

**API AI dan Telegram SELALU di-mock.** Tidak ada panggilan jaringan sungguhan di
CI. Kalau mau tes AI beneran, itu manual sebelum rilis, bukan di pipeline.

## 3. Target Coverage (CI gagal kalau di bawah ini)

### Global
| Metrik | Minimum |
|---|---|
| Statements | **85%** |
| Branches | **80%** |
| Functions | **85%** |
| Lines | **85%** |

### Per file (lebih ketat untuk yang menyentuh uang & hak akses)

| File | Statements | Branches | Kenapa seketat ini |
|---|---|---|---|
| `services/entitlementService.js` | **100%** | **100%** | Menentukan siapa bayar dan dapat apa |
| `helpers/money.js` | **100%** | **100%** | Fungsi murni, tidak ada alasan meleset |
| `services/transactionService.js` | 95% | 90% | Append-only, menyentuh uang |
| `services/metricsService.js` | 95% | 90% | Angka yang dilihat user |
| `ai/ruleParser.js` | 95% | 90% | Satu-satunya jalur tier free |
| `ai/parseMessage.js` | 90% | 85% | Bagian normalisasi & validasinya (bukan modelnya) |
| `middlewares/` | 90% | 85% | Auth & tier |
| `controllers/` | 85% | 80% | |
| `telegram/` | 85% | 80% | |
| `models/`, `migrations/`, `seeders/`, `config/`, `bin/` | — | — | **dikecualikan** |

### Konfigurasi
```js
// server/jest.config.js
module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageReporters: ['text-summary', 'lcov', 'json-summary'],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!models/**', '!migrations/**', '!seeders/**', '!config/**', '!bin/**',
    '!jest.config.js',
  ],
  coverageThreshold: {
    global:                             { statements: 85, branches: 80, functions: 85, lines: 85 },
    './services/entitlementService.js': { statements: 100, branches: 100, functions: 100, lines: 100 },
    './helpers/money.js':               { statements: 100, branches: 100, functions: 100, lines: 100 },
    './services/transactionService.js': { statements: 95, branches: 90, functions: 95, lines: 95 },
    './services/metricsService.js':     { statements: 95, branches: 90, functions: 95, lines: 95 },
    './ai/ruleParser.js':               { statements: 95, branches: 90, functions: 95, lines: 95 },
    './middlewares/':                   { statements: 90, branches: 85, functions: 90, lines: 90 },
    './controllers/':                   { statements: 85, branches: 80, functions: 85, lines: 85 },
  },
  setupFilesAfterEach: undefined,
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  testTimeout: 15000,
  maxWorkers: 1,
};
```

### Cara membaca persentasenya
Output `npm run test:coverage`:
```
=============================== Coverage summary ===============================
Statements   : 88.24% ( 615/697 )
Branches     : 84.11% ( 281/334 )
Functions    : 90.00% ( 108/120 )
Lines        : 88.41% ( 602/681 )
================================================================================
```
Angka ini **wajib ditempel di deskripsi PR**. Coverage yang turun lebih dari 0,5
poin dibanding `main` ditolak, walaupun masih di atas ambang.

## 4. Struktur Folder Test

```
server/__tests__/
├── setup.js                 (koneksi DB test, truncate antar test)
├── factories/               (bikin data cepat)
│   ├── userFactory.js       createUser({ tier: 'member' })
│   └── transactionFactory.js
├── fixtures/
│   ├── telegram/            (update object: text, voice, photo, callback)
│   ├── parsing/             (pasangan input → expected, minimal 50)
│   └── metrics/             (dataset transaksi + angka harapan)
├── mocks/
│   ├── aiClient.js          (bisa diatur per test, punya counter panggilan)
│   └── telegramClient.js    (menangkap payload sendMessage)
├── unit/
├── integration/
└── e2e/
```

**Mock AI wajib punya counter.** Banyak test tier `free` yang bunyinya
"pastikan AI tidak dipanggil sama sekali" — itu butuh `expect(aiClient.callCount).toBe(0)`.

## 5. Skenario End-to-End Backend (wajib ada semua)

Setiap skenario memeriksa tiga hal: **(a)** status & body response, **(b)** isi
database setelahnya, **(c)** payload yang dikirim ke Telegram.

### Onboarding & tier
| # | Skenario | Yang diperiksa |
|---|---|---|
| E1 | `/start` user baru | User + Wallet + 12 kategori dibuat, `trialEndsAt` = +5 hari |
| E2 | `/start` dua kali | Tidak ada duplikat, trial tidak diperpanjang |
| E3 | `/status` tier trial | Sisa hari benar |
| E4 | Cron expiry: member lewat `expiresAt` | Status jadi `expired`, request berikutnya ditolak sebagai free |
| E5 | Cron expiry: trial habis | Tier turun ke free, data transaksi utuh |

### Pencatatan
| # | Skenario | Yang diperiksa |
|---|---|---|
| E6 | Teks "makan siang 35rb" (trial) | 1 baris Transactions benar, balasan berisi konfirmasi **dan** insight |
| E7 | Teks sama (free) | `parseMode: 'rule'`, balasan **tanpa** insight + CTA upgrade, **aiClient.callCount === 0** |
| E8 | Teks 2 transaksi sekaligus | 2 baris tersimpan |
| E9 | Teks tanpa angka | 0 baris, balasan berisi panduan format |
| E10 | Confidence rendah | 0 baris, state tersimpan, balasan punya inline keyboard |
| E11 | Callback `Ya` setelah E10 | 1 baris tersimpan, state terhapus |
| E12 | Callback setelah TTL lewat | 0 baris, balasan "sesi habis", tidak 500 |
| E13 | Voice (member) | STT dipanggil 1×, `source: 'voice'` |
| E14 | Voice (free) | `getFile` **tidak** dipanggil, STT **tidak** dipanggil, balasan upsell |
| E15 | Foto struk 3 item (member) | Draft ditampilkan, 0 baris sebelum konfirmasi, 3 baris sesudah |
| E16 | Foto (free) | Tidak diunduh, balasan upsell |

### Keamanan webhook
| # | Skenario | Yang diperiksa |
|---|---|---|
| E17 | Webhook tanpa secret token | 401, tidak ada efek samping apa pun |
| E18 | Webhook secret token salah | 401 |
| E19 | `update_id` dikirim dua kali | Hanya 1 transaksi tersimpan |

### Analisis
| # | Skenario | Yang diperiksa |
|---|---|---|
| E20 | `/analisis bulan` (member) | Metrics benar, insight ada, baris `Analyses` tersimpan |
| E21 | `/analisis` 2× tanpa transaksi baru | **aiClient dipanggil 1×** (cache hit) |
| E22 | `/analisis` (free) | Balasan upsell, **aiClient.callCount === 0** |
| E23 | AI timeout saat pencatatan | Transaksi **tetap tersimpan**, balasan tanpa insight |

### REST API
| # | Skenario | Yang diperiksa |
|---|---|---|
| E24 | request-otp → verify-otp → `GET /api/me` | Token valid, `tier` benar |
| E25 | OTP salah 3× | 429 |
| E26 | `GET /api/transactions` tanpa token | 401 |
| E27 | `GET /api/transactions` tier free | 403 + `requiredTier` |
| E28 | `GET /api/transactions` filter + pagination | `meta` sesuai format standar |
| E29 | `POST /api/transactions` amount 0 | 400 |
| E30 | `PUT /api/transactions/:id` | Baris asli utuh, ada baris `correction` baru, saldo berubah benar |
| E31 | Koreksi atas transaksi yang sudah dikoreksi | 400 |
| E32 | Budget terlampaui | Balasan bot memuat peringatan |
| E33 | Checkout → webhook bayar | Subscription `active`, `expiresAt` +30 hari |
| E34 | Webhook bayar dikirim dua kali | Tetap 1 subscription (idempoten) |
| E35 | Webhook bayar signature salah | 401, tidak ada perubahan data |

**E7, E14, E16, E22, E27 adalah test paling penting di repo ini.** Kelimanya
menjaga pagar antara user gratis dan biaya AI. Dilarang di-`skip` dengan alasan
apa pun.

## 6. Aturan Menulis Test

- Nama test menyebut aturan bisnis yang diuji:
  ```js
  describe('entitlementService', () => {
    it('mengembalikan free kalau trial sudah lewat dan tidak ada subscription aktif', ...);
    it('mengembalikan member walaupun trial sudah lewat, kalau subscription aktif', ...);
  });
  ```
- **Waktu wajib di-freeze.** Test trial 5 hari dan expiry 30 hari mustahil stabil
  kalau bergantung jam nyata:
  ```js
  jest.spyOn(dateHelper, 'now').mockReturnValue(new Date('2026-08-26T10:00:00Z'));
  ```
- Pakai factory, bukan fixture panjang: `await createUser({ tier: 'member' })`.
- Test harus lulus kalau file-nya dijalankan sendirian, bukan cuma sebagai satu
  suite besar.
- Test yang cuma `expect(response.status).toBe(200)` tanpa memeriksa isi
  dianggap tidak menguji apa-apa.

## 7. Yang Memblokir Merge

1. `npm run lint` — 0 error
2. `npm run test:unit` — hijau
3. `npm run test:integration` — hijau
4. `npm run test:e2e` — hijau, tidak ada yang di-skip
5. Ambang coverage global + per file terpenuhi
6. Coverage tidak turun > 0,5 poin dari `main`
7. Migration bisa `up` lalu `down` bersih
8. Build frontend sukses

## 8. Script npm

```json
{
  "scripts": {
    "test":             "jest",
    "test:watch":       "jest --watch",
    "test:unit":        "jest __tests__/unit",
    "test:integration": "jest __tests__/integration --runInBand",
    "test:e2e":         "jest __tests__/e2e --runInBand",
    "test:coverage":    "jest --coverage",
    "db:migrate:test":  "NODE_ENV=test sequelize db:migrate"
  }
}
```

## 9. Test Frontend (OWNER: Cline)

- Vitest + React Testing Library.
- Coverage minimum: **75%** untuk `src/components` dan `src/pages`, **90%** untuk
  `src/services/api.js`.
- Setiap halaman wajib punya test untuk 4 keadaan: loading, kosong, error, sukses.
- Wajib ada test untuk **403 + `requiredTier` → tampil halaman upsell**, bukan
  pesan error merah.
- Mock API pakai contoh response dari `ARCHITECTURE.md §3`. Kalau kontraknya
  berubah, mock ikut berubah di PR yang sama.
