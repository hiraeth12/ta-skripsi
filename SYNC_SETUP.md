# Auto-Sync Setup Guide

Panduan setup untuk automatic synchronization data gempa ke Firebase Realtime Database.

## Current Status ✅

Database sudah ter-populate dengan data terbaru:
- **gempa_dirasakan**: 30 items
- **gempa_terdeteksi**: 1710 items

## Sync Strategies

Ada 3 cara untuk menjalankan sync:

### 1. Manual Sync (One-time)

```bash
# Full sync gempa dirasakan (30 items)
npm run sync:gempa-dirasakan:full

# Latest sync gempa dirasakan (update lastEventId)
npm run sync:gempa-dirasakan:latest

# Full sync gempa terdeteksi
npm run sync:gempa-terdeteksi:history

# Verify database state
npm run sync:verify
```

### 2. Watch Mode (Continuous with interval)

Script akan berjalan terus-menerus dengan interval tertentu:

```bash
# Gempa dirasakan: sync setiap 1 menit
npm run sync:gempa-dirasakan:latest:watch

# Gempa terdeteksi: sync setiap 15 detik  
npm run sync:gempa-terdeteksi:history:watch
```

**Cara jalankan**: Buka terminal baru dan jalankan command di atas. Script akan berjalan sampai Ctrl+C.

### 3. Scheduler Service (Recommended)

Background service yang mengelola multiple sync jobs:

```bash
# Start scheduler service
npm run sync:scheduler
```

**Default intervals:**
- Gempa Dirasakan Latest: setiap 5 menit (300 detik)
- Gempa Terdeteksi: setiap 15 menit (900 detik)

**Cara jalankan**: 
```bash
# Terminal 1: Run app
npm start

# Terminal 2: Run scheduler
npm run sync:scheduler
```

## Recommended Setup untuk Production

### Option A: Scheduler Service (Development)
```bash
npm run sync:scheduler
```

### Option B: CI/CD Scheduled Jobs (Production)

Setup cron job atau GitHub Actions untuk run sync scripts secara periodik:

```yaml
# .github/workflows/sync-gempa.yml
name: Sync Gempa Data
on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
    - cron: '*/15 * * * *' # Every 15 minutes

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run sync:gempa-dirasakan:full
      - run: npm run sync:gempa-terdeteksi:history
```

### Option C: Cloud Function (Firebase)

Deploy sync scripts sebagai scheduled Cloud Functions:

```javascript
// functions/index.js
const functions = require("firebase-functions");

exports.syncGempaDirasakan = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async (context) => {
    // Run sync-latest-gempa-dirasakan-history.js
  });

exports.syncGempaTerdeteksi = functions.pubsub
  .schedule("every 15 minutes")
  .onRun(async (context) => {
    // Run db-gempa-terdeteksi-history.js
  });
```

## Script Usage

### Full Sync
```bash
npm run sync:gempa-dirasakan:full
```
**What it does:**
- Fetch semua 30 gempa dirasakan dari BMKG API
- Write FULL data (items array + metadata) ke `/gempa_dirasakan`
- Overwrite existing data

**When to use:** 
- Initial setup
- Data corruption / reset
- Bulk data update

### Latest Sync
```bash
npm run sync:gempa-dirasakan:latest
```
**What it does:**
- Fetch latest 30 gempa dirasakan
- Compare lastEventId dengan database
- Hanya update jika ada gempa baru
- Update: lastEventId, syncedAt, latestItem

**When to use:**
- Continuous polling untuk new events
- Efficient incremental updates

### Terdeteksi Sync
```bash
npm run sync:gempa-terdeteksi:history
```
**What it does:**
- Merge data dari 2 sources: histori + gempaQL
- Deduplicate berdasarkan eventid atau coordinates
- Filter events dari tahun 2023 ke atas
- Simpan 1710+ items ke `/gempa_terdeteksi`

**When to use:**
- Initial setup
- Periodic full refresh (reduce stale data)

## Monitoring

### Check Sync Status
```bash
npm run sync:verify
```

### Check Item Order (Ascending)
```bash
npm run sync:check-order
```

Verifies items are sorted correctly with oldest at index 0:
```
[0] 20260407104309 | 07-04-26 10:43:09 WIB | Mag: 4 | Area: ... 🔵 OLDEST
[1] 20260407134418 | 07-04-26 13:44:18 WIB | Mag: 4.3 | Area: ...
...
[29] 20260416112148 | 16-04-26 11:21:48 WIB | Mag: 3.3 | Area: ... 🔴 NEWEST
```
```
📍 Checking /gempa_dirasakan:
  ✅ Node exists
  - totalItems: 30
  - lastEventId: 20260416112148
  - syncedAt: 2026-04-16T05:13:20.767Z
  - Items in array: 30

📍 Checking /gempa_terdeteksi:
  ✅ Node exists
  - totalItems: 1710
  - lastEventId: 2026-04-16 04:16:21...
  - syncedAt: 2026-04-16T05:09:12.588Z
  - Items in object: 1710
```

### Check Database Console
1. Buka [Firebase Console](https://console.firebase.google.com)
2. Select project: **seismotrack-tugas-akhir**
3. Go to **Realtime Database**
4. Lihat node `/gempa_dirasakan` dan `/gempa_terdeteksi`

## Troubleshooting

### "No new event" di sync:gempa-dirasakan:latest
- Normal! Berarti API tidak ada event baru sejak last sync
- Atau lastEventId di database sudah sama dengan terbaru

### Items in array: 0 setelah sync
- Run full sync: `npm run sync:gempa-dirasakan:full`
- Verify dengan: `npm run sync:verify`

### "Too many requests" error
- API rate limit tercapai
- Tunggu beberapa menit sebelum retry
- Tingkatkan interval di scheduler

### Deprecated nodes masih ada
Nodes lama sudah tidak digunakan. Bisa dihapus dari Firebase Console:
- ❌ `/gempa_dirasakan_history` 
- ❌ `/gempa_dirasakan_latest`
- ❌ `/gempa_terdeteksi_history`

## Firebase Billing Notes

### Costs sebelum (3 nodes):
- Read: 3 nodes per check
- Write: 3 nodes per sync

### Costs sekarang (2 nodes):
- Read: 2 nodes per check
- Write: 2 nodes per sync

**Savings:** ~33% reduction dalam read/write operations ✅

## Environment Variables

Pastikan `.env` sudah set:

```env
EXPO_PUBLIC_GEMPA_DIRASAKAN_HISTORY = https://bmkg-content-inatews.storage.googleapis.com/last30feltevent.xml
EXPO_PUBLIC_GEMPA_TERDETEKSI_API_URL = https://bmkg-content-inatews.storage.googleapis.com/gempaQL.json?t=
EXPO_PUBLIC_GEMPA_TERDETEKSI_HISTORY = https://bmkg-content-inatews.storage.googleapis.com/histori.json?t=
EXPO_PUBLIC_FIREBASE_DATABASE_URL = https://seismotrack-tugas-akhir-default-rtdb.asia-southeast1.firebasedatabase.app
```

## Data Structure

### Gempa Dirasakan Item Order

Items disimpan dalam **ASCENDING order** (oldest first):

```
Index 0    → Gempa paling LAWAS      (eventid: 20260407104309)
Index 1-28 → Gempa lebih baru
Index 29+  → Gempa paling BARU       (eventid: 20260416112148)
```

**Behavior saat ada event baru:**
1. Event baru di-fetch dari API
2. Dibandingkan dengan `lastEventId` di database
3. Jika baru, diinsert di **akhir/last index** (append)
4. Existing items tetap di position yang sama
5. Total items bertambah 1 (30 → 31 → 32, dst)

**Contoh:**
```
Before sync (30 items):
[0] eventid: 20260407104309 (oldest)
[1] eventid: 20260407134418
...
[29] eventid: 20260416112148 (newest)

After new event synced (31 items):
[0] eventid: 20260407104309 (oldest - tetap [0])
[1] eventid: 20260407134418 (tetap [1])
...
[29] eventid: 20260416112148 (tetap [29])
[30] eventid: 20260416120000 (NEW - at last index)
```

### Keuntungan Structure Ini

✅ **Chronological order** - Natural timeline dari oldest → newest  
✅ **Easy iteration** - UI dapat loop dari history (oldest-first)  
✅ **Growing history** - Automatic accumulate events (no limit)  
✅ **No shifting** - New events append to end, existing indices stable  
✅ **Latest at end** - Grab `items[items.length-1]` untuk event terbaru
