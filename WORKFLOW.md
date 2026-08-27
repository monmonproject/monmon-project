# WORKFLOW.md — Panduan End-to-End

Cara menjalankan project Chatbot AI Money Analysis dengan 3 AI agent
(Claude Code, Cline, Antigravity) tanpa mereka halu dan tabrakan.

---

## FASE 0 — Persiapan (kamu sendiri, TANPA agent) — ±3 jam

Ini fase paling penting. Jangan lewati. Kalau fase ini asal-asalan, semua fase
setelahnya berantakan.

```bash
mkdir money-analysis-bot && cd money-analysis-bot
git init
mkdir -p server client docs .github/workflows
```

1. Tulis/sesuaikan `SPEC.md`, `PRD.md`, `ARCHITECTURE.md`, `ERD.md`, `STYLE.md`,
   `TESTING.md`, `AGENTS.md`. Terutama `ARCHITECTURE.md` — schema DB dan daftar
   endpoint harus **final** sebelum agent mulai.
2. Bikin `.gitignore` (`node_modules`, `.env`, `dist`, `coverage`).
3. Bikin `.env.example`:
   ```
   NODE_ENV=
   PORT=
   DATABASE_URL=
   JWT_SECRET=
   TELEGRAM_BOT_TOKEN=
   TELEGRAM_WEBHOOK_SECRET=
   TELEGRAM_WEBHOOK_URL=
   AI_PROVIDER_API_KEY=
   AI_MODEL_PARSE=
   AI_MODEL_ANALYSIS=
   PAYMENT_WEBHOOK_SECRET=
   ```
4. **Bikin 3 bot Telegram lewat @BotFather:** dev, staging, production.
   Satu token tidak boleh dipakai dua environment — `setWebhook` akan saling
   menimpa dan pesanmu masuk ke server yang salah.
5. Salin aturan agent:
   ```bash
   cp AGENTS.md CLAUDE.md
   mkdir -p .clinerules && cp AGENTS.md .clinerules/00-rules.md
   ```
6. Commit & push ke GitHub:
   ```bash
   git add -A
   git commit -m "docs: spesifikasi awal project"
   git remote add origin git@github.com:USERNAME/money-analysis-bot.git
   git push -u origin main
   ```

---

## FASE 1 — Setup GitHub — ±30 menit

1. **Branch protection** — Settings → Branches → Add rule untuk `main`:
   - Require a pull request before merging
   - Require status checks to pass
   - (jangan centang "Allow force pushes")
2. **Labels**: `backend`, `frontend`, `infra`, `bug`, `blocked`
3. **Milestone**: `v1.0 MVP`
4. **Project board** (Projects → Board): kolom `Todo / In Progress / Review / Done`
5. **Issue template** `.github/ISSUE_TEMPLATE/task.md`:

```md
## Tujuan
(satu kalimat)

## Agent
(Claude Code / Cline / Antigravity)

## File yang boleh disentuh
- server/ai/parseMessage.js

## Test yang harus ditulis DULUAN
- [ ] "makan siang 35rb" → amount 35000, type expense
- [ ] "gaji masuk 8jt" → amount 8000000, type income
- [ ] input tanpa angka → tidak insert, minta klarifikasi

## Acceptance Criteria
- [ ] Bentuk output sesuai ARCHITECTURE.md §4 (contoh output parser)
- [ ] Coverage file ini >= 90%
- [ ] npm test hijau

## Referensi
- SPEC.md §5 aturan bisnis, §8 format input
- ARCHITECTURE.md §4 kontrak output parser
```

---

## FASE 2 — Fondasi (KERJAKAN SENDIRI, jangan diserahkan ke agent) — ±4 jam

Agent bekerja jauh lebih baik kalau sudah ada pola untuk ditiru. Jadi kamu yang
menulis **satu contoh lengkap** dulu:

- `server/app.js`, koneksi DB, `config/config.js`, `config/constants.js`
- Model `User` + migration
- `middlewares/errorHandler.js`
- `services/entitlementService.js` + `__tests__/unit/entitlementService.test.js`
- `routes/webhook.js` + `middlewares/telegramAuth.js` yang membalas 200
- `__tests__/e2e/webhook.start.test.js` (E1 di `TESTING.md`)

**Kenapa `entitlementService` yang kamu tulis sendiri:** itu file paling penting
di repo. Coverage-nya dipatok 100%, dan semua agent akan meniru polanya. Kalau
polanya salah dari awal, semua fitur berbayar ikut salah.

Setelah ini jadi, tambahkan ke `AGENTS.md`:

> Sebelum menulis service baru, baca `server/services/entitlementService.js` dan
> `server/__tests__/unit/entitlementService.test.js`, lalu tiru strukturnya persis.

Sekarang agent punya patokan nyata, bukan cuma deskripsi.

---

## FASE 3 — Bagi Task ke Issue — ±1 jam

Urutkan berdasarkan ketergantungan. Backend jalan duluan, frontend menyusul.

**Gelombang 1 (paralel, tidak saling tergantung)**
| # | Issue | Agent |
|---|---|---|
| 1 | Model + migration: Wallet, Category, Transaction | Claude Code |
| 2 | Setup Vite + routing + halaman Login (OTP) | Cline |
| 3 | GitHub Actions CI (install, lint, test, coverage gate) | Antigravity |

**Gelombang 2**
| # | Issue | Agent |
|---|---|---|
| 4 | `helpers/money.js` + `ai/ruleParser.js` (jalur tier free) | Claude Code |
| 5 | Auth context + simpan token + protected route | Cline |
| 6 | Setup ESLint + Prettier sesuai STYLE.md | Antigravity |

**Gelombang 3**
| # | Issue | Agent |
|---|---|---|
| 7 | `/start` handler: registrasi + trial 5 hari + seed kategori | Claude Code |
| 8 | `ai/aiClient.js` + `ai/parseMessage.js` (teks) | Claude Code |
| 9 | Halaman daftar transaksi + filter | Cline |

**Gelombang 4**
| # | Issue | Agent |
|---|---|---|
| 10 | Alur konfirmasi: stateStore + inline keyboard + callback | Claude Code |
| 11 | `metricsService` (hitung angka, tanpa AI) | Claude Code |
| 12 | Halaman Overview + grafik | Cline |

**Gelombang 5**
| # | Issue | Agent |
|---|---|---|
| 13 | `analysisService` + cache `Analyses` + `/analisis` | Claude Code |
| 14 | Halaman Analysis + komponen upsell untuk 403 | Cline |
| 15 | `parseVoice.js` + `parseReceipt.js` | Claude Code |

**Gelombang 6**
| # | Issue | Agent |
|---|---|---|
| 16 | Checkout + webhook payment + cron expiry | Claude Code |
| 17 | Halaman Budget | Cline |
| 18 | README + docs/DEPLOYMENT.md | Antigravity |

**Aturan:** jangan jalankan dua issue yang menyentuh file sama secara bersamaan.

**Urutan ini disengaja:** tier free (`ruleParser`) dibangun **sebelum** jalur AI.
Kalau AI dibangun duluan, agent cenderung menjadikannya jalur default dan tier
free ikut memanggil AI — pelanggaran `SPEC.md §5` no. 3 yang paling mahal.

---

## FASE 4 — Siapkan Worktree (biar 3 agent tidak timpa-menimpa)

```bash
git worktree add ../money-claude -b feat/4-rule-parser
git worktree add ../money-cline  -b feat/5-auth-context
git worktree add ../money-anti   -b feat/6-eslint
```

Sekarang ada 3 folder terpisah, satu repo yang sama:
- Buka `../money-claude` di VS Code → jalankan Claude Code di sini
- Buka `../money-cline` di VS Code window lain → Cline di sini
- Buka `../money-anti` di Antigravity

Kalau tanpa worktree, tiga agent mengedit folder yang sama, saling menimpa file
setengah jadi, dan `git status` jadi campur aduk — sulit ditelusuri siapa yang
merusak apa.

---

## FASE 5 — Menjalankan Satu Task (siklus yang diulang terus)

### Prompt pembuka ke agent
```
Baca SPEC.md, ARCHITECTURE.md, ERD.md, STYLE.md, TESTING.md, AGENTS.md dulu.
Lalu kerjakan issue #8.

Batasan:
- Hanya boleh mengubah file yang disebut di issue #8
- Tiru struktur server/services/entitlementService.js
- Jangan menambah dependency apa pun (stack dikunci di SPEC.md §9)
- TULIS TEST DULU, jalankan, tunjukkan output MERAH-nya, baru tulis kodenya
- Kalau ada yang tidak jelas di ARCHITECTURE.md, BERHENTI dan tanya saya

Sebelum menulis kode, tunjukkan dulu rencanamu:
file apa yang dibuat/diubah, fungsi apa saja di dalamnya, dan daftar test yang
akan kamu tulis.
```

### Alur
1. Agent kirim rencana + daftar test → **kamu baca dan approve/koreksi**
2. Agent menulis test, jalankan, tunjukkan output **MERAH**
3. Agent menulis kode sampai **HIJAU**
4. Agent jalankan `npm run test:coverage`, tunjukkan angkanya
5. `git commit` (test dulu, baru implementasi) + `git push`
6. Buka PR di GitHub
7. **Kamu review** (checklist di bawah)
8. Merge kalau lolos, atau minta revisi

### Checklist review (5–10 menit per PR)
- [ ] Diff-nya < 200 baris? Kalau tidak, tolak dan minta dipecah
- [ ] Ada file di luar scope yang tersentuh?
- [ ] `package.json` berubah tanpa izin?
- [ ] Test ditulis duluan? (lihat urutan commit)
- [ ] Angka coverage ditempel, dan tidak turun?
- [ ] Ada `console.log` sisa debugging?
- [ ] Ada secret ter-hardcode?
- [ ] Gaya kodenya sesuai `STYLE.md`?
- [ ] **Ada pengecekan tier di luar `entitlementService`?** → tolak
- [ ] **Ada `new Date()` di dalam service?** → tolak
- [ ] **Ada jalur di mana tier free bisa memanggil AI?** → tolak
- [ ] Test-nya benar-benar menguji sesuatu, atau cuma `expect(200)`?
- [ ] **Bisakah kamu jelaskan alur kode ini ke orang lain?** Kalau tidak, jangan merge.

---

## FASE 6 — Setelah Merge

```bash
git checkout main && git pull
git worktree remove ../money-claude
git worktree add ../money-claude -b feat/10-confirmation-flow
```

Selalu `git pull` sebelum memulai task berikutnya, dan **beri tahu agent** bahwa
`main` sudah berubah, supaya dia tidak bekerja di atas asumsi lama.

---

## FASE 7 — Menjalankan Bot Secara Lokal

Bot Telegram butuh URL publik untuk webhook. Di lokal pakai tunnel:

```bash
# terminal 1
cd server && npm run dev

# terminal 2
npx cloudflared tunnel --url http://localhost:3000
# salin URL https-nya

# terminal 3 — daftarkan webhook (pakai bot DEV, bukan production)
curl -F "url=https://xxx.trycloudflare.com/webhook/telegram" \
     -F "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
     "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook"
```

Cek webhook aktif: `curl https://api.telegram.org/bot$TOKEN/getWebhookInfo`

Kalau bot diam saja, urutan pengecekan: `getWebhookInfo` (ada error?) → log server
(request masuk?) → header secret token (cocok?) → tier user (mungkin memang
ditolak dan balasannya belum diimplementasi).

---

## FASE 8 — Deploy

- Backend → Railway/Render, DB → PostgreSQL managed
- Frontend → Vercel, `VITE_API_URL` dari env
- Jalankan migration lewat script, bukan `sequelize.sync({ force: true })`
- **Cron jalan sebagai proses terpisah** (`bin/cron.js`), bukan di dalam web
  server. Kalau web-nya di-scale jadi 2 instance, cron-nya ikut jalan dua kali
  dan user dapat pesan "trial habis" dua kali
- Setelah deploy: `setWebhook` ke URL production, lalu smoke test kirim `/status`
  dari akun uji. Harus dibalas < 5 detik
- Antigravity yang menulis dokumentasi deploy di `docs/DEPLOYMENT.md`

---

## Tanda Bahaya (agent mulai halu)

Hentikan dan reset sesi kalau melihat:

- Menyebut nama file atau fungsi yang tidak ada di repo
- Menambah library yang tidak diminta
- Bilang "sudah saya test" tanpa menunjukkan output
- Mengubah isi test supaya lulus
- PR tiba-tiba 800 baris padahal task-nya kecil
- Mengedit file di luar wilayahnya
- Menjawab "sudah sesuai spesifikasi" tanpa menyebut bagian mana

**Tanda bahaya khusus project ini:**

- Membuat kolom `plan` di tabel `Users` — tandanya dia tidak baca `SPEC.md §4`
- Menulis prompt AI yang berisi kata "hitung total" atau daftar transaksi mentah
- Jalur kode di mana tier `free` bisa sampai ke `aiClient.js`
- `new Date()` di dalam service
- Menurunkan angka di `coverageThreshold` supaya CI hijau
- Test yang isinya cuma `expect(response.status).toBe(200)`

Cara reset: mulai sesi baru, suruh baca ulang `SPEC.md` + `ARCHITECTURE.md` +
file yang relevan, dan kerjakan ulang dari `main` yang bersih.

---

## Prioritas Waktu Reviewmu

Tidak semua kode setara. Baca baris-per-baris untuk:

1. `services/entitlementService.js` dan `middlewares/entitlement.js` — ini yang
   menjaga pendapatan
2. `middlewares/telegramAuth.js` dan webhook payment — ini pintu masuk dari luar
3. `ai/aiClient.js` dan semua pemanggilnya — ini yang menghabiskan uang
4. `services/transactionService.js` — append-only, menyentuh data uang user
5. Apa pun yang menyentuh `.env` atau query database

Sisanya (form React, styling, formatter pesan) cukup dibaca cepat.
