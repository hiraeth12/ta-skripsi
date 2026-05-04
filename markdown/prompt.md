Berikut adalah draf *prompt* dalam format Markdown (`.md`) yang bisa Anda berikan kepada Agentic AI (seperti GitHub Copilot, v0, Devin, atau Cursor) untuk membangun sistem *alert* gempa tersebut di ekosistem **React Native (Expo)**.

Anda bisa menyalin teks di bawah ini dan menyimpannya sebagai file `prompt-alert-gempa.md` atau langsung di-paste ke chat AI.

```markdown
# React Native Expo Agent Prompt: Earthquake Alert Notification System

## Role
Kamu adalah seorang _Expert Mobile App Developer_ yang sangat mahir menggunakan **React Native** dan **Expo**.

## Task
Tugas kamu adalah membuat sebuah sistem In-App Notification / Popup Alert (untuk menggantikan modal bawaan) yang merespons event gempa bumi baru. Komponen ini harus mereplikasi logika orkestrasi audio dan visual dari aplikasi web React sebelumnya ke ekosistem React Native.

Referensi logika pemutaran audio di web sebelumnya:
```javascript
setAlertGempaBumis([...alertGempaBumis, tg]);
var bgNotif = new Audio("/sounds/eq_eva.wav");
bgNotif.volume = 0.3;
bgNotif.loop = true;
playAudioSafely(bgNotif, "background earthquake notification");
// id='danger' dimainkan di detik ke-2
setTimeout(() => {
    playDangerSound() 
    setTimeout(() => {
        var voice = new Audio("/voice/gempabumi.wav"); // Dimainkan di detik ke-4
        playAudioSafely(voice, "earthquake voice");
    }, 2000);
    setTimeout(() => {
        fadeOutAudio(bgNotif, 2000); // Fade out dari detik ke-8 sampai ke-10
    }, 6000);
}, 2000);
```

## Requirements & Implementation Details

### 1. Audio Handling (Wajib pakai `expo-av`)
Web `Audio` API tidak tersedia di React Native. Kamu BUKAN menggunakan HTMLAudioElement, melainkan wajib mengimplementasikan `expo-av`.
- Buat fungsi utilitas `playAudioSafely` menggunakan `Audio.Sound.createAsync()` dari `expo-av`.
- Terapkan urutan (*sequence*) pemutaran menggunakan `setTimeout` persis seperti web:
  - **T=0s**: Mainkan latar belakang (`eq_eva.wav`), loop `true`, volume `0.3`.
  - **T=2s**: Mainkan efek suara bahaya (`danger.wav`).
  - **T=4s**: Mainkan suara instruksi vokal (`gempabumi.wav`).
  - **T=8s**: Mulai proses *fade-out* volume `eq_eva.wav` dari 0.3 ke 0 perlahan selama 2 detik sebelum akhirnya di-`stopAsync()`. Untuk fade out kamu mungkin perlu interval pengurang volume dengan `setStatusAsync()`.

### 2. State & UI Component (Menggantikan Modal)
- Buat komponen bernama `GempaBumiAlert` yang menerima _props_ `magnitudo`, `kedalaman`, dan `show`.
- UI harus muncul menumpuk (_absolute overlay_) di tengah layar, **bukan** memakai komponen `<Modal>` standar React Native agar tidak saling memblok. Gunakan `position: 'absolute'`, `zIndex: 50`.
- Karena CSS background-image via class (`.basic-hex`, `.long-hex`) di app.css tidak bisa direplikasi langsung di RN, gunakan komponen `<Image>` atau `<ImageBackground>` dari React Native atau `react-native-svg`.

### 3. Aset yang Diperlukan (Harus di-map/di-import)
Pastikan kamu meng-import atau memberi _placeholder_ `require` untuk aset-aset berikut ini di dalam komponen:

**Audio Assets:**
- `require('../assets/sounds/eq_eva.wav')` *-> Background loop*
- `require('../assets/voice/gempabumi.wav')` *-> Voice over peringatan*

**Visual Assets (Image/SVG untuk _shape_ hexagon):**
- `require('../assets/images/hex_shape.png/svg')` *-> Untuk layer `.basic-hex`*
- `require('../assets/images/earthquake_detected.png/svg')` *-> Untuk container `.long-hex`*
- (Sertakan elemen UI Teks untuk menampilkan Magnitudo dan Kedalaman di atas gambar hexagon tersebut dengan *font glow* layaknya Cyberpunk/Sci-Fi).

### 4. Animations
Gunakan `react-native-reanimated` atau `Animated` bawaan React Native untuk mereplikasi animasi CSS:
- Pop-Up membesar (_scale-up_) dan _fade-in_ (`opacity` 0 ke 1) yang di-delay untuk masing-masing container `.basic-hex`, `.warning-black-hex`, dan teks informasi.
- Bikin komponen bisa _unmount_ atau perlahan hilang (animasi `close-pop-up`) setelah jeda waktu tertentu (misal: setelah _fade out_ audio selesai).

Tuliskan implementasi kodemu (file `GempaBumiAlert.tsx` dan utilitas pemutar audio) dengan _clean code_.
```

### Penjelasan Mengapa Format Ini Efektif
1. **Mengarahkan Ekosistem yang Tepat**: AI langsung tahu web Audio dan CSS tak berlaku. Ia disuruh menggunakan module handal React Native, yakni `expo-av` dan native `Animated`.
2. **Memetakan Ulang Time Sequence**: Logika bersarang yang lumayan rumit dari web diterjemahkan menjadi **T=0s**, **T=2s**, dll agar AI dapat membangunnya ulang dengan urutan yang pasti tanpa mengubah arsitektur aslinya.
3. **List Aset Transparan**: AI akan melihat aset (`hex_shape`, `earthquake_detected`, dan berkas-berkas `.wav`) sehingga dia bisa menyiapkan sintaks `require(...)` yang menjadi standar aset lokal di Expo.### Penjelasan Mengapa Format Ini Efektif
1. **Mengarahkan Ekosistem yang Tepat**: AI langsung tahu web Audio dan CSS tak berlaku. Ia disuruh menggunakan module handal React Native, yakni `expo-av` dan native `Animated`.
2. **Memetakan Ulang Time Sequence**: Logika bersarang yang lumayan rumit dari web diterjemahkan menjadi **T=0s**, **T=2s**, dll agar AI dapat membangunnya ulang dengan urutan yang pasti tanpa mengubah arsitektur aslinya.
3. **List Aset Transparan**: AI akan melihat aset (`hex_shape`, `earthquake_detected`, dan berkas-berkas `.wav`) sehingga dia bisa menyiapkan sintaks `require(...)` yang menjadi standar aset lokal di Expo.