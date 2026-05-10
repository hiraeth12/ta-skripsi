Berikut adalah *prompt* atau instruksi khusus untuk *Agentic AI* (seperti Copilot, Cursor, atau Devin) yang sudah disusun dalam format Markdown. Anda dapat menyimpan teks di bawah ini ke dalam file bernama `IMPLEMENTASI_WARNING_GEMPA_RN.md`, lalu memberikannya kepada AI agar ia langsung mengeksekusinya tanpa celah kesalahan.

```markdown
# PROMPT AGENTIC AI: SEISMOTRACK GEMPA ALERT (REACT NATIVE & EXPO)

## 📌 KONTEKS & TUJUAN
Kamu adalah Expert React Native Developer. Tugasmu adalah mengubah komponen UI web peringatan gempa (berbasis React JS & CSS Keyframes) menjadi komponen React Native / Expo yang identik secara visual dan audio (100% Pixel & Sound Perfect). Komponen awal berupa Modal *InAppNotificationModal* telah diberikan, rombak komponen tersebut agar setara dengan efek dari kode web.

Buat solusi ini seketika berfungsi tanpa error (*0 errors, works out of the box*) dengan mengikuti panduan operasional di bawah ini secara runtut.

---

## 📂 FASE 1: PERSIAPAN ASSET (Struktur Folder)
Sebelum menulis kode, pastikan hirarki file di dalam lokal proyek React Native sudah memiliki aset berikut. Kamu (AI) harus mengimpor file ini menggunakan `require()` pada kode komponen nantinya.

**A. Direktori Suara (`/assets/sounds/`)**
1. `eq_eva.wav` (Suara latar/peringatan gempa utama)

**B. Direktori Gambar/Shape (`/assets/images/`)**
*Mengingat React Native butuh setup khusus untuk SVG, asumsikan kita menggunakan aset gambar (.png) atau mengandalkan `react-native-svg`.*
1. `big_warning.png` (Pengganti `.long-hex` background)
2. `warning_shape_yellow.png` (Pengganti `.warning-black-hex`)
3. `warning_gempa_yellow.png` (Pengganti komponen radar `.warning-black`)
4. `earthquake_detected.png` (Pengganti teks darurat `.warning-yellow`)
5. `hex_shape.png` (Bentuk dasar heksagon untuk indikator M/Kedalaman)

---

## 📦 FASE 2: INSTALASI DEPENDENSI
Instruksikan eksekusi terminal berikut untuk mendukung pemutaran suara dari Expo dan support rendering SVG (jika perlu). 
Harap aplikasikan perintah ini:

```bash
npx expo install expo-av
```
*(Catatan: Kami akan menggunakan `Animated` API bawaan dari `react-native` untuk kebutuhan efek `scale`, `fade-in`, dan `blink` sehingga tidak perlu tambahan library animasi berat pihak ketiga).*

---

## 🛠 FASE 3: ATURAN TRANSLASI CSS KE REACT NATIVE STYLE
Translasi CSS web ke dalam bentuk React Native `StyleSheet` & `Animated.View`:
1. **`.overlay-bg`**: Gunakan `backgroundColor: "rgba(0,0,0,0.8)"` pada pembungkus luar dari `Modal`.
2. **`.show-pop-up`**: Ganti dengan interpolasi `Animated.Value`: dari `scale: 0.5` & `opacity: 0` menuju `scale: 1` & `opacity: 1` menggunakan `Animated.timing`.
3. **`.close-pop-up`**: Merupakan fungsi *reverse* dari di atas. Buat timing animasi menghilang sebelum memanggil `onClose()`.
4. **`.blink` (Berkedip)**: Gunakan `Animated.loop` dan `Animated.sequence` pada `opacity` dari nilai 0.4 ke 1.0 agar terus berkedip.
5. **Animasi Delay (`animation-delay`)**: Tambahkan delay via `Animated.timing` konfigurasi `delay: 1000` atau `2000` sesuai dengan CSS asli.
6. **Layout Heksagon (`flex-evenly/justify-between`, margin negatif `-mt-12`, `-ml`)**: Terjemahkan menggunakan *style absolute positioning* atau flex dengan nilai `marginTop`, `marginLeft`, `marginRight` sesuai persentase/pixel agar hexagon saling menempel.
7. **Teks Glow (`.text-glow`)**: Gunakan parameter *shadow* di React Native: `textShadowColor: "rgba(255, 102, 0, 0.5)"`, `textShadowOffset: {width: -1, height: 1}`, dan `textShadowRadius: 10`.

---

## 🚀 FASE 4: IMPLEMANTASI KODE (TUGAS UTAMA AI)
Buat satu *file* utama, misalnya `GempaBumiNotificationModal.tsx`.
Tulis kode React Native lengkap dengan spesifikasi berikut:

1. Komponen menerima *props* `visible`, `magnitudo`, `kedalaman`, dan `onClose`.
2. Tambahkan *hook* `useEffect` untuk `expo-av`. Ketika `visible == true`, putar `eq_eva.wav` (buat agar berulang/looping), dan pastikan sound otomatis terhenti (`stopAsync` / `unloadAsync`) sesaat sebelum atau ketika popup di-unmount/ditutup.
3. Tambahkan `useEffect` kedua untuk menangani penutupan otomatis (auto close) setelah 6 detik jika *props* `closeInSecond` merujuk ke angka 6. 
4. Di *auto close*, jangan langsung panggil `onClose()`. Mainkan dulu state interpolasi `.close-pop-up` (animasi keluar), beri jeda 300ms, baru panggil `onClose()`.
5. Bungkus setiap elemen visual yang *blink* dan *pop-up* ke dalam `<Animated.View>` atau `<Animated.Image>`. Map langsung gambar `.png` menggunakan `require('../../assets/images/nama_file.png')` pada element `ImageBackground` atau `Image`.
6. Pertahankan *Action Container* (tombol "Tutup" & "Lihat Info") di lapisan terbawah (z-index tinggi) sebagai akses manual jika pengguna mau menutup sebelum timer habis.

**Aturan Restriksi Output:**
- Hasilkan kode penuh (full file code) komponen di bawah blok ini tanpa memutus kode.
- Pastikan kode berjalan mulus dan kompatibel dengan standard versi Expo terbaru (Expo Router support).
- Hilangkan comment code snippet bawaan web, 100% Native.
```

---
*Silakan jalankan instruksi di atas dan hasilkan file kodenya secara utuh.*
```
