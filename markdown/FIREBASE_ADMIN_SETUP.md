# Firebase Admin SDK Setup

Backend sync scripts sekarang menggunakan **Firebase Admin SDK** untuk write data ke Realtime Database. Ini membypass restrictive security rules yang hanya allow authenticated users.

## Persyaratan

Service account key dari Firebase Console diperlukan untuk authenticate Admin SDK.

### Step 1: Download Service Account Key

1. Buka [Firebase Console](https://console.firebase.google.com)
2. Pilih project Anda (`seismotrack-tugas-akhir`)
3. Klik ⚙️ **Project Settings** (top-left corner)
4. Masuk tab **Service Accounts**
5. Klik **Generate New Private Key**
6. File JSON akan terdownload otomatis

### Step 2: Setup Service Account di Project

**Option A: Environment Variable (Recommended for CI/CD)**

Set environment variable dengan path ke service account file:

```bash
# Windows (PowerShell)
$env:FIREBASE_SERVICE_ACCOUNT_PATH = "C:\path\to\serviceAccountKey.json"
npm run sync:scheduler

# Linux/Mac
export FIREBASE_SERVICE_ACCOUNT_PATH="/path/to/serviceAccountKey.json"
npm run sync:scheduler
```

Atau set sebagai JSON string:

```bash
# Windows (PowerShell)
$keyContent = Get-Content 'C:\path\to\serviceAccountKey.json' -Raw
$env:FIREBASE_SERVICE_ACCOUNT_KEY = $keyContent
npm run sync:scheduler
```

**Option B: Local File (Development)**

1. Simpan service account key ke project root dengan nama:
   ```
   firebase-service-account.json
   ```

2. File akan di-detect otomatis oleh scripts.

**Option C: Google Services File (Mobile Config)**

File `android/app/google-services.json` sudah ada, tapi itu bukan service account key. Untuk backend, perlu service account key terpisah dari Firebase Console.

### Step 3: Test Setup

```bash
# Test sync gempa dirasakan
npm run sync:gempa-dirasakan:latest

# Test sync gempa terdeteksi
npm run sync:gempa-terdeteksi:history

# Test sync locations
npm run sync:locations

# Test scheduler (auto-sync)
npm run sync:scheduler
```

### Step 4: Env Variables (Optional)

Tambahkan ke `.env` file untuk customize:

```env
# Firebase Admin SDK Config (optional, akan auto-detect dari service account)
FIREBASE_DATABASE_URL=https://seismotrack-tugas-akhir-default-rtdb.asia-southeast1.firebasedatabase.app

# Service account path (if not using default location)
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json
```

## Security Notes

- Service account key memiliki **full access** ke database
- **JANGAN** commit ke git - sudah di `.gitignore`
- Gunakan environment variables untuk production/CI
- Regularly rotate service account keys di Firebase Console
- Limit access ke production key hanya yang perlu

## Troubleshooting

### Error: "Service account not found"

```
Failed to write to Firebase Admin: Failed to create service account credentials
```

**Solution:** Ensure service account key sudah di-download dan path-nya correct.

### Error: "Permission denied" (masih error setelah Admin SDK setup)

Ini artinya service account key dari salah project atau expired. Download ulang dari Firebase Console.

### Database URL tidak terdeteksi

Jika app tidak bisa auto-detect database URL, set explicit di `.env`:

```env
FIREBASE_DATABASE_URL=https://seismotrack-tugas-akhir-default-rtdb.asia-southeast1.firebasedatabase.app
```

## Sync Scripts

Setelah setup, berikut script yang tersedia:

| Command | Function | Schedule |
|---------|----------|----------|
| `npm run sync:locations` | Sync Jawa Barat locations | Manual |
| `npm run sync:gempa-dirasakan:latest` | Latest earthquake felt (BMKG) | Manual |
| `npm run sync:gempa-terdeteksi:history` | Detected earthquakes (USGS+BMKG) | Manual |
| `npm run sync:scheduler` | Auto-run both gempa syncs | Background (5min & 15min intervals) |

## How It Works

1. **Before (REST API + Fetch):**
   - Scripts gunakan REST API dengan `.json` endpoints
   - Kena restrictive security rules (`.write: false`)
   - Result: 401 Permission Denied

2. **After (Firebase Admin SDK):**
   - Scripts authenticate dengan service account
   - Admin SDK bypass security rules (full access)
   - Atomic writes, transactions, better error handling

## References

- [Firebase Admin SDK Docs](https://firebase.google.com/docs/database/admin/start)
- [Service Account Setup](https://firebase.google.com/docs/admin/setup)
- [Database Security Rules](https://firebase.google.com/docs/database/security)
