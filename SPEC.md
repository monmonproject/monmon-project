# SPEC.md — Chatbot AI Money Analysis

> Sumber kebenaran tunggal untuk SEMUA agent (Claude Code, Cline, Antigravity).
> Kalau sesuatu tidak tertulis di sini → **berhenti dan tanya owner**, jangan mengarang.

---

## 1. Tujuan Project

Chatbot Telegram yang mencatat keuangan pribadi dari pesan biasa — teks, voice
note, atau foto struk — lalu **membalas dengan analisis AI langsung di Telegram**.
Ada dashboard web untuk lihat grafik dan analisis pengeluaran lebih dalam.

Bedanya dengan aplikasi keuangan lain: kompetitor berhenti di "kamu habis
Rp 4 juta bulan ini". Kita lanjut ke "naik 18% dari bulan lalu, penyebabnya jajan
siang naik dari 3× jadi 5× seminggu".

**Alur inti:** pesan Telegram → parsing → transaksi tersimpan → analisis → balas.
Semua fitur lain adalah turunan dari data transaksi ini.

## 2. Scope MVP (v1.0)

Yang **MASUK** v1.0:

- Registrasi otomatis lewat `/start` + free trial 5 hari
- Pencatatan dari teks bahasa natural ("makan siang 35rb")
- Pencatatan dari voice note (transkripsi → parsing)
- Pencatatan dari foto struk (OCR → bisa jadi >1 transaksi)
- Konfirmasi inline keyboard kalau AI ragu
- AI analysis via Telegram (otomatis tiap transaksi + `/analisis` on-demand)
- 3 tier: `trial` / `member` / `free` dengan pembatasan fitur
- Langganan member 30 hari + webhook pembayaran
- Dashboard web: login OTP via Telegram, overview, transaksi, analisis
- Budget bulanan per kategori + peringatan
- Riwayat transaksi append-only (audit trail)

Yang **TIDAK MASUK** v1.0 (jangan dikerjakan sampai diminta):

- Dompet bersama / multi-anggota
- Export CSV & Google Spreadsheet
- Ringkasan terjadwal otomatis (harian/mingguan/bulanan)
- Integrasi rekening bank / e-wallet
- Multi-currency
- Grup Telegram (v1.0 hanya chat privat)
- Split bill, utang-piutang, fitur investasi
- Mobile app native
- Dark mode

## 3. Definisi Istilah

| Istilah | Arti di project ini |
|---|---|
| Transaction | Satu baris pencatatan uang masuk/keluar. **Append-only** — tidak pernah di-update, koreksi lewat baris baru. |
| Saldo | Dihitung, bukan disimpan. `Σ income − Σ expense ± Σ correction`. |
| Tier | Hak akses user saat ini: `trial`, `member`, atau `free`. **Dihitung**, bukan disimpan. |
| Parsing | Mengubah pesan jadi angka + kategori. Menghasilkan transaksi. |
| Analysis | Narasi AI tentang pola pengeluaran. Fitur berbayar. Bukan parsing. |
| Confidence | Skor 0–1 dari AI parser. Di bawah `0.75` → minta konfirmasi user. |
| Metrics | Angka hasil agregasi yang dihitung JS (bukan AI), dipakai sebagai input analysis. |

## 4. Tiga Tier (ini inti bisnisnya, jangan sampai salah)

| | `trial` | `member` | `free` |
|---|:---:|:---:|:---:|
| Durasi | 5 hari sejak `/start` | 30 hari per pembelian | selamanya |
| Catat via teks | ✅ | ✅ | ✅ |
| Catat via voice | ✅ | ✅ | ❌ |
| Catat via foto struk | ✅ | ✅ | ❌ |
| Parser | AI | AI | regex (`ruleParser`) |
| AI analysis di Telegram | ✅ | ✅ | ❌ |
| Dashboard web | ✅ | ✅ | ❌ |
| Budget + peringatan | ✅ | ✅ | ❌ |

**Cara menentukan tier (deterministik, jangan dikarang):**

```
kalau ada Subscription status 'active' dan expiresAt > now  → 'member'
kalau tidak, tapi now < user.trialEndsAt                    → 'trial'
selain itu                                                  → 'free'
```

Trial habis atau member expired → turun ke `free` otomatis. **Data lama tidak
dihapus**, cuma tidak bisa diakses lewat analisis dan dashboard.

## 5. Aturan Bisnis (WAJIB — ini yang paling sering di-halu-kan agent)

1. **Tier tidak disimpan sebagai kolom.** Tidak ada kolom `plan` di tabel `Users`.
   Tier selalu dihitung ulang lewat `services/entitlementService.js`. Alasannya:
   trial 5 hari dan member 30 hari akan basi sendiri, kolom statis pasti salah.
2. **Semua pengecekan hak akses lewat `entitlementService`.** Dilarang menulis
   `if (user.plan === 'member')` di controller, route, atau handler mana pun.
3. **User `free` TIDAK PERNAH menyentuh API AI.** Voice dan foto dari user free
   tidak diunduh, tidak di-transkripsi, tidak di-OCR. Ini pagar biaya utama, bukan
   sekadar pembatasan fitur. Melanggar ini = margin produk habis.
4. **AI tidak pernah menghitung angka.** Semua total, selisih, persentase, dan
   sisa budget dihitung JavaScript. AI cuma dikasih `metrics` yang sudah jadi lalu
   disuruh menarasikannya. Alasannya: angka harus bisa di-unit-test.
5. **Transactions append-only.** Dilarang `UPDATE` kolom `amount`, `type`, atau
   `WalletId`. Koreksi = insert baris baru `type: 'correction'` dengan `correctsId`.
6. **Amount selalu integer rupiah penuh.** `35000`, bukan `35000.00`. Dilarang
   float untuk uang di mana pun.
7. **Kalau confidence < 0.75 → JANGAN insert dulu.** Simpan draft ke state
   sementara (TTL 5 menit), balas inline keyboard, tunggu konfirmasi user.
8. **Kalau AI gagal/timeout → transaksi tetap tersimpan** (kalau amount sudah
   pasti), balas tanpa analisis. Jangan sampai user kehilangan data karena AI down.
9. **Webhook Telegram wajib divalidasi** pakai header
   `X-Telegram-Bot-Api-Secret-Token`. Tidak cocok → 401, jangan proses apa pun.
10. **Webhook idempoten.** `update_id` yang sama tidak boleh menghasilkan dua
    transaksi. Telegram memang mengirim ulang kalau kita lambat balas.
11. **Balas 200 ke Telegram secepatnya**, proses berat (STT/OCR/AI) dilakukan
    setelah itu.
12. **Trial sekali seumur hidup per `telegramId`.** `/start` kedua kali tidak
    memperpanjang trial dan tidak membuat user baru.
13. **Password (kalau user pakai login email) tidak pernah masuk response API
    atau log.**

## 6. Perintah Telegram v1.0

| Command | Tier | Fungsi |
|---|---|---|
| `/start` | semua | Registrasi + mulai trial 5 hari + buat dompet & kategori default |
| `/bantuan` | semua | Contoh format pencatatan |
| `/status` | semua | Tier aktif, sisa hari, kuota parsing hari ini |
| `/catat <jumlah> <catatan>` | semua | Pencatatan eksplisit (jalur pasti untuk tier free) |
| `/saldo` | semua | Ringkasan bulan berjalan (angka saja, tanpa analisis) |
| `/analisis [minggu\|bulan]` | trial, member | Analisis AI on-demand |
| `/budget <kategori> <jumlah>` | trial, member | Set budget bulan berjalan |
| `/upgrade` | semua | Paket member + link pembayaran |
| `/batal` | semua | Batalkan konfirmasi yang menggantung |

Pesan tanpa command tetap diproses sebagai transaksi, sesuai tier pengirim.

## 7. Contoh Balasan Bot (tiru gaya ini)

Tier `trial` / `member`:
```
✓ Tercatat: Makan siang Rp 35.000 → Makanan

📊 Makanan minggu ini Rp 420.000, naik 18% dari minggu lalu.
Sisa budget Makanan Rp 380.000 untuk 12 hari (≈ Rp 31.600/hari).
💡 Frekuensi jajan siang naik dari 3× jadi 5× seminggu.
```

Tier `free`:
```
✓ Tercatat: Makan siang Rp 35.000

🔒 Analisis AI & dashboard tersedia untuk Member.
Ketik /upgrade untuk buka akses 30 hari.
```

Aturan gaya pesan: ramah, tidak menghakimi, maksimal 3 emoji, maksimal ~12 baris.
❌ "Kamu boros banget di Makanan" → ✅ "Makanan naik 18%, penyumbangnya jajan siang."

## 8. Format Input yang Wajib Dikenali Parser

| Input user | Hasil |
|---|---|
| `makan siang 35rb` | expense, 35000, Makanan |
| `35.000 makan siang` | expense, 35000, Makanan |
| `bensin 50k kemarin` | expense, 50000, Transportasi, occurredAt = kemarin |
| `gaji masuk 8jt` | income, 8000000, Gaji |
| `beli kopi 25rb sama parkir 5rb` | **2 transaksi** |

Normalisasi: `rb`/`ribu`/`k` → ×1.000, `jt`/`juta` → ×1.000.000, titik/koma
pemisah ribuan dibuang. Hasil akhir selalu integer.

## 9. Tech Stack (DIKUNCI — dilarang menambah/mengganti tanpa izin)

- Backend: Node.js 20, Express 4, Sequelize 6, PostgreSQL
- Telegram: `node-telegram-bot-api` (mode webhook, bukan polling)
- Auth: `jsonwebtoken`, `bcryptjs`
- AI / STT / OCR: panggil HTTP API provider pakai **`fetch` bawaan Node 20**.
  Dilarang menambah SDK apa pun.
- Cron: `node-cron`
- State konfirmasi: **`Map` in-memory** dengan TTL manual di
  `helpers/stateStore.js`. **Bukan** Redis di v1.0 — satu instance dulu.
- Test: Jest + Supertest
- Frontend: React 18 + Vite, React Router, Axios
- Grafik: `recharts` — hanya ini, dan hanya untuk grafik
- Styling: CSS biasa / CSS Modules — **bukan** Tailwind, **bukan** UI library
- State frontend: React state + Context. **Bukan** Redux/Zustand/React Query di v1

## 10. Definition of Done (satu task dianggap selesai kalau...)

- [ ] Kode jalan lokal tanpa error
- [ ] Test ditulis **sebelum** kode (lihat `TESTING.md`), dan `npm test` hijau
- [ ] Coverage memenuhi ambang di `TESTING.md §3`
- [ ] Tidak melanggar `STYLE.md`
- [ ] Tidak menambah dependency baru
- [ ] File yang disentuh hanya yang disebut di issue
- [ ] Ada bukti output terminal di deskripsi PR
