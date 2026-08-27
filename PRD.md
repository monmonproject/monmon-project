# PRD.md — Kenapa Project Ini Dibangun

> `SPEC.md` menjawab **apa** yang dibangun. File ini menjawab **kenapa**.
> Agent tidak wajib baca file ini untuk koding, tapi wajib baca kalau harus
> memutuskan sesuatu yang tidak tertulis di `SPEC.md`.

---

## 1. Masalah

Orang yang mau melek keuangan pribadi berhenti di dua tembok:

1. **Mencatat itu capek.** Aplikasi keuangan minta buka app, pilih kategori, isi
   form. Setelah 4–5 hari orang berhenti, dan datanya tidak pernah cukup untuk
   berguna.
2. **Kalaupun tercatat, tidak ada yang menjelaskan.** Aplikasi menampilkan
   diagram lingkaran lalu diam. User lihat "Makanan 38%" dan tidak tahu itu bagus
   atau buruk, apalagi apa yang harus diubah.

Kompetitor menyelesaikan tembok pertama. **Nilai jual kita ada di tembok kedua.**

## 2. Kenapa Telegram, bukan WhatsApp atau aplikasi sendiri

| Alasan | Penjelasan |
|---|---|
| Gratis | Bot API resmi, tanpa biaya per pesan/percakapan (WA Cloud API charge per percakapan) |
| Aman dari banned | Tidak pakai library tidak resmi seperti Baileys |
| Voice & foto native | Cukup pakai `file_id`, tidak perlu provider media pihak ketiga |
| Tidak perlu install | Telegram sudah ada di HP user. Aplikasi baru = friksi baru |
| Inline keyboard | Konfirmasi "Ya/Tidak" tanpa user mengetik |

## 3. Siapa Penggunanya

| Persona | Profil | Yang dia butuh |
|---|---|---|
| **Rina, 26, karyawan** | Gaji Rp 6–9 jt, uang habis tiap tanggal 25 | Tahu bocornya di mana, tanpa ribet mencatat |
| **Dimas, 31, freelancer** | Pemasukan tidak tetap, butuh lihat tren | Analisis multi-bulan |
| **Sari, 29, ibu muda** | Belanja harian banyak & kecil-kecil | Foto struk, beres |

Bukan target v1.0: akuntansi bisnis, investor, multi-currency.

## 4. Model Bisnis

| Tier | Durasi | Harga | Isi |
|---|---|---|---|
| Free Trial | 5 hari, sekali seumur akun | Rp 0 | Semua fitur v1.0 |
| Member | 30 hari | **Rp 29.000** *(asumsi — konfirmasi sebelum rilis)* | Semua fitur v1.0 |
| Free | selamanya | Rp 0 | Catat teks saja, tanpa AI & dashboard |

**Kenapa tier free tetap ada dan tetap berguna:** supaya user tidak menghapus
bot. User free adalah pipeline konversi bulan depan. Tapi mereka **tidak boleh**
menghabiskan biaya AI sepeser pun — makanya pakai parser regex, bukan model.

**Kenapa trial 5 hari, bukan 14 hari:** analisis butuh data. 5 hari cukup untuk
mengumpulkan 15–25 transaksi (cukup untuk insight pertama yang terasa), tapi
tidak cukup lama untuk membuat user lupa bahwa ini berbayar.

**Titik upsell yang direncanakan:**
1. Hari ke-4 trial: "besok trial habis, ini yang kami temukan dari catatanmu"
2. Saat user free kirim voice note atau foto
3. Akhir bulan: tampilkan 1 insight, sisanya terkunci

## 5. Ukuran Keberhasilan

| Yang diukur | Target 90 hari pertama |
|---|---|
| User yang mencatat ≥3 transaksi di 24 jam pertama | ≥ 55% |
| User trial yang buka dashboard minimal 1× | ≥ 40% |
| Konversi trial → member | ≥ 12% |
| Member yang perpanjang di bulan ke-2 | ≥ 60% |
| Akurasi parsing (amount + kategori, cek manual mingguan) | ≥ 92% |
| Biaya AI per member aktif per bulan | ≤ 15% dari harga jual |
| p95 waktu balas bot untuk pesan teks | ≤ 3 detik |

Kalau konversi < 8% setelah 200 user trial, yang dievaluasi duluan adalah
**kualitas insight**, bukan harga.

## 6. Prinsip Produk (dipakai untuk memutuskan hal yang tidak tertulis)

1. **Jangan sampai user kehilangan data.** Kalau AI down, tetap simpan
   transaksinya. Pencatatan lebih penting daripada analisis.
2. **Angka harus benar, narasi boleh luwes.** Makanya AI tidak menghitung.
3. **Ramah, tidak menghakimi.** Ini soal uang — orang sudah cukup merasa bersalah
   tanpa dibantu bot.
4. **Kalau ragu, pilih yang lebih murah biayanya.** Biaya AI adalah risiko
   terbesar model bisnis ini.
5. **Sederhana dulu.** Fitur yang tidak dipakai tetap harus dirawat.

## 7. Roadmap

| Versi | Isi | Selesai kalau |
|---|---|---|
| **v1.0** | Scope di `SPEC.md §2` | Konversi trial→member bisa diukur |
| v1.1 | Export CSV & Spreadsheet | Member bisa tarik data sendiri |
| v1.2 | Ringkasan terjadwal otomatis | Retensi bulan ke-2 naik |
| v1.3 | Dompet bersama + add-on anggota | Pasangan bisa satu dompet |
| v2.0 | Prediksi & rekomendasi budget | — |

## 8. Risiko

| Risiko | Mitigasi |
|---|---|
| Biaya AI membengkak karena spam | Kuota parsing per user, free tier tanpa AI, cache analisis |
| Akurasi OCR struk Indonesia jelek | Hasil OCR **selalu** dikonfirmasi user sebelum disimpan |
| User tidak merasa perlu bayar setelah 5 hari | Upsell pakai data user sendiri, bukan copy generik |
| Telegram mengubah kebijakan Bot API | Semua panggilan Bot API lewat `telegram/client.js` saja |
| AI kasih saran keuangan yang keliru | Prompt melarang saran investasi/pajak spesifik; angka dihitung JS |

## 9. Yang Masih Perlu Diputuskan Owner

- [ ] Payment gateway: Midtrans / Xendit / transfer manual + verifikasi admin?
- [ ] Provider AI, STT, dan OCR — satu vendor multimodal atau spesialis terpisah?
- [ ] Harga final member (asumsi sekarang Rp 29.000 / 30 hari)
- [ ] Berapa lama data user `free` disimpan sebelum diarsipkan?
