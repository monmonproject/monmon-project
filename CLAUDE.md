# AGENTS.md — Aturan Main untuk Semua AI Agent

> Berlaku untuk Claude Code, Cline, dan Antigravity.
> Salin file ini juga sebagai `CLAUDE.md` dan `.clinerules/00-rules.md`.

---

## 0. Baca dulu sebelum menulis kode apa pun

Urutan wajib di awal setiap sesi:
1. `SPEC.md` — apa yang dibangun & aturan bisnis
2. `ARCHITECTURE.md` — schema, endpoint, kepemilikan folder
3. `ERD.md` — relasi & aturan integritas data (kalau task-nya menyentuh DB)
4. `STYLE.md` — gaya penulisan kode
5. `TESTING.md` — cara membuktikan task-nya selesai
6. File yang akan diubah — **baca isinya, jangan menebak**

`PRD.md` dibaca kalau kamu harus memutuskan sesuatu yang tidak tertulis di `SPEC.md`.

## 1. Anti-Halusinasi (aturan paling penting)

- **Dilarang menebak isi file.** Selalu baca file dulu sebelum mengedit.
- **Dilarang mengarang nama fungsi, kolom DB, endpoint, atau field response.**
  Kalau tidak ada di `ARCHITECTURE.md` → berhenti dan tanya.
- **Dilarang menambah dependency baru.** Termasuk library "kecil" seperti
  `lodash`, `moment`, `dayjs`, `uuid`, `axios` di server, atau SDK AI. Stack sudah
  dikunci di `SPEC.md §9`. Kalau merasa butuh → tanya dulu.
- **Dilarang mengklaim "sudah jalan" tanpa bukti.** Sertakan output terminal
  (`npm test`, `curl`, log) di deskripsi PR.
- **Dilarang menulis kode untuk fitur yang ada di daftar "TIDAK MASUK v1.0"**
  di `SPEC.md`, meskipun kelihatan berguna.
- Kalau ada dua cara dan spesifikasi ambigu → **jangan pilih sendiri**, tanya.
- Kalau sebuah test gagal, **jangan mengubah test-nya supaya hijau.**
  Perbaiki kodenya, atau laporkan kalau memang spesifikasinya yang salah.

## 1b. Anti-Halusinasi Khusus Project Ini

Lima hal ini paling sering dilanggar agent. Hafalkan.

1. **Jangan bikin kolom `plan` di tabel `Users`.** Tier dihitung, tidak disimpan.
   Kalau kamu merasa butuh kolom itu, kamu salah baca `SPEC.md §4`.
2. **Jangan menyuruh AI menghitung.** Kalau prompt yang kamu tulis berisi daftar
   transaksi mentah dan kata "hitung", "jumlahkan", atau "berapa total" —
   berhenti. Angka dihitung `metricsService`.
3. **Jangan memanggil API AI untuk tier `free`.** Bahkan untuk "sekadar
   kategorisasi". Bahkan kalau kelihatannya murah.
4. **Jangan `UPDATE` amount/type di `Transactions`.** Append-only. Koreksi lewat
   baris baru.
5. **Jangan menaruh `new Date()` di dalam service.** Pakai `dateHelper.now()`,
   supaya test trial 5 hari & expiry 30 hari bisa ditulis.

Kalau kamu terlanjur menulis salah satu dari lima ini, **jangan diam-diam
diperbaiki** — sebutkan di deskripsi PR.

## 2. Batas Wilayah Kerja

| Agent | Boleh mengubah | Dilarang menyentuh |
|---|---|---|
| **Claude Code** | `server/**` | `client/**`, `.github/**` |
| **Cline** | `client/**` | `server/**`, `.github/**` |
| **Antigravity** | `.github/**`, `docs/**`, `README.md`, file konfigurasi root | `server/**`, `client/**` |

`SPEC.md`, `PRD.md`, `ARCHITECTURE.md`, `ERD.md`, `STYLE.md`, `TESTING.md`,
`AGENTS.md`, `WORKFLOW.md` hanya boleh diubah oleh manusia.

## 3. Ukuran Task

- Satu task = satu GitHub Issue = satu branch = satu PR.
- **Maksimal ~200 baris perubahan per PR** (di luar test dan lockfile). Kalau
  lebih besar, pecah dulu dan laporkan rencana pemecahannya.
- Untuk task non-trivial: kirim **rencana singkat dulu** (file apa yang diubah,
  fungsi apa yang dibuat), tunggu approval owner, baru menulis kode.

## 4. Alur Git

```bash
git checkout main && git pull
git checkout -b feat/12-parse-message
# ...kerja...
git add -A
git commit -m "feat(ai): parsing teks jadi transaksi refs #12"
git push -u origin feat/12-parse-message
```

- **Dilarang commit langsung ke `main`.**
- **Dilarang `git push --force`, `git rebase`, atau menghapus branch orang lain.**
- **Dilarang mengubah `package-lock.json`** kecuali memang task-nya soal dependency.
- Commit message: `type(scope): deskripsi refs #issue`
  (`type` = feat / fix / test / docs / chore / refactor)
- Scope yang dipakai: `bot`, `ai`, `api`, `db`, `client`, `ci`, `docs`

**Khusus project ini:** commit `test:` ditulis **sebelum** commit `feat:` yang
membuatnya lulus. Riwayat commit adalah bukti bahwa TDD-nya dijalankan.

## 5. Format Laporan Selesai

Setiap PR wajib berisi:

```md
## Apa yang dikerjakan
- ...

## File yang diubah
- server/ai/parseMessage.js (baru)
- server/__tests__/unit/parseMessage.test.js (baru)

## Bukti jalan
$ npm test
 PASS  __tests__/unit/parseMessage.test.js
 Tests: 14 passed

$ npm run test:coverage
 All files | 88.2 | 84.1 | 90.0 | 88.4

## Yang TIDAK saya kerjakan / ragu
- Belum menangani kalimat dengan 2 mata uang karena tidak ada di SPEC.md
```

Bagian terakhir wajib diisi jujur. Menulis "tidak ada" padahal ada keraguan
dianggap pelanggaran berat.

## 6. Testing

Detailnya di `TESTING.md`. Yang wajib diingat:

- **Test ditulis duluan.** Jalankan, pastikan MERAH, baru tulis kodenya.
- Setiap endpoint minimal punya: 1 test sukses, 1 test validasi gagal (400),
  1 test tanpa token (401), 1 test tier salah (403).
- Setiap handler bot minimal punya: 1 test tier `trial`/`member`, 1 test tier
  `free`. Test tier `free` wajib memverifikasi **AI tidak dipanggil sama sekali**.
- Test pakai database test terpisah, dibersihkan di `afterEach`.
- API AI dan Telegram **selalu di-mock** di test. Tidak boleh ada panggilan
  jaringan sungguhan di CI.
- Dilarang memakai `.skip`, `.only`, atau `--forceExit` untuk melewati test.

## 7. Keamanan

- Password selalu di-hash bcrypt (salt rounds 10) lewat hook Sequelize.
- Password dan hash tidak pernah masuk response API atau log.
- Semua secret (`JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
  `AI_PROVIDER_API_KEY`, kredensial DB) dari `.env`. **Dilarang hardcode.**
- `.env` tidak pernah di-commit. Update `.env.example` kalau ada variabel baru.
- Query selalu lewat Sequelize (parameterized). Dilarang string concat SQL.
- Webhook Telegram wajib cek `X-Telegram-Bot-Api-Secret-Token`; webhook payment
  wajib cek signature. Tanpa itu, endpoint bisa dipanggil siapa saja.
- **Isi pesan user (`rawMessage`) tidak boleh masuk log.** Boleh disimpan di DB
  untuk audit, tidak boleh di `console.log`.
- `file_id` foto struk tidak boleh dibagikan ke pihak ketiga selain provider OCR.

## 8. Kalau Kamu Ragu

Urutannya:
1. Cari jawabannya di `SPEC.md` → `ARCHITECTURE.md` → `ERD.md`.
2. Masih tidak ada? **Berhenti dan tanya owner.** Jangan pilih sendiri.
3. Kalau owner tidak ada dan kamu terpaksa memilih: pilih yang **paling murah
   biaya AI-nya** dan **paling mudah dites**, lalu tulis di deskripsi PR dengan
   awalan `ASUMSI:`.

Jangan pernah: menghapus test yang gagal, menurunkan ambang coverage, mengubah
bentuk response supaya test lulus, atau membuat "solusi sementara" yang tidak
dicatat di PR.
