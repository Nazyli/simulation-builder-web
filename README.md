# Simulation Builder Web

Frontend untuk menyusun workflow di Studio, menjalankan simulasi peserta di
Runner, serta memantau timer dan riwayat eksekusi.

Proyek ini menggunakan React, TypeScript, Vite, Tailwind CSS, dan React Flow.

## Daftar isi

- [Menjalankan aplikasi](#menjalankan-aplikasi)
- [Konfigurasi](#konfigurasi)
- [Halaman utama](#halaman-utama)
- [Pengujian](#pengujian)
- [Build](#build)
- [Panduan pengembangan](#panduan-pengembangan)

## Menjalankan aplikasi

Siapkan Node.js **22.12 atau lebih baru** dan npm, serta backend Simulation Builder untuk fitur yang mengakses API.

### 1. Pasang dependensi

```powershell
npm ci
```

### 2. Siapkan konfigurasi lokal

```powershell
Copy-Item .env.example .env
```

Sesuaikan URL API pada `.env`, lalu jalankan server pengembangan:

```powershell
npm run dev
```

Aplikasi tersedia di `http://localhost:5173`. Jika port tersebut digunakan,
ikuti alamat yang ditampilkan Vite di terminal.

## Konfigurasi

| Variabel               | Nilai default                  | Kegunaan                                                                        |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`    | `http://127.0.0.1:8000/api/v1` | Alamat backend, termasuk prefix `/api/v1`.                                      |
| `VITE_SEND_CHAT_TIMER` | `8`                            | Waktu tunggu dalam detik sebelum pesan chat peserta dikirim sebagai satu batch. |

Jalankan ulang server pengembangan setelah mengubah `.env`.

Pada chat Runner, **Enter** menyelesaikan satu bubble pesan dan **Shift+Enter**
menambahkan baris baru. Bubble yang sudah selesai tampil sebagai antrean sampai
pengiriman berhasil. Pergantian actor atau simulasi, keluar dari halaman chat,
atau menyembunyikan halaman akan mengirim antrean yang sudah selesai.

## Halaman utama

| Halaman                      | Kegunaan                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `/studio`                    | Daftar simulasi dan pengelolaan versinya.                                         |
| `/studio/:simulationId`      | Editor graph, konfigurasi node, validasi, publikasi, serta ekspor/impor workflow. |
| `/simulation`                | Memulai atau melanjutkan simulasi peserta.                                        |
| `/simulation/:participantId` | Workspace peserta untuk chat, email, dokumen, dan panggilan suara.                |
| `/history`                   | Riwayat eksekusi peserta dan detailnya.                                           |
| `/timers`                    | Pemantauan dan pengelolaan timer.                                                 |
| `/master-data/actors`        | Pengelolaan master actor.                                                         |
| `/ai-token-usage`            | Pemantauan penggunaan token AI.                                                   |
| `/documentation`             | Panduan node dan konfigurasi workflow.                                            |
| `/settings`                  | Pengaturan aplikasi.                                                              |

## Pengujian

Jalankan pemeriksaan berikut sebelum menyerahkan perubahan frontend:

```powershell
npm test
npm run lint
npm run build
```

`npm test` menjalankan test TypeScript dengan mock API. `npm run lint`
menjalankan Oxlint dan memeriksa format melalui Prettier.

### Pengujian browser

Pengujian E2E memakai Playwright. Untuk menjalankan proyek Chromium:

```powershell
npx playwright install chromium
npm run test:e2e -- --project=chromium
```

Playwright menyiapkan server pengujian di `http://127.0.0.1:4173`. Mode
interaktif tersedia melalui `npm run test:e2e:ui`; gunakan
`npm run test:e2e:headed` untuk menampilkan browser saat test berjalan.

## Build

```powershell
npm run build
npm run preview
```

Hasil build berada di folder `dist`. Perintah `preview` digunakan untuk
memeriksa hasil build secara lokal. Nilai konfigurasi `VITE_*` digunakan saat
proses build, sehingga perubahan konfigurasi memerlukan build ulang.

## Panduan pengembangan

- Aturan tampilan, spacing, warna, dan radius tersedia di [DESIGN.md](DESIGN.md).
- Panduan fitur dan node tersedia melalui halaman `/documentation`, dengan
  sumber Markdown di [public/documentation](public/documentation).
- Konfigurasi node mengikuti katalog backend; graph editor menyimpan data
  yang kompatibel dengan JSON.
- Ekspor/impor workflow menggunakan penanda `simulation-builder.workflow`
  dengan `format_version: 1`.
