# 📬 Testing Push Notifications

## Prerequisites

✅ **Monitor sudah running:**
```bash
npm run monitor:notifications
```

✅ **User sudah login & menyimpan FCM token**

---

## Method 1: Test dengan Script (Recommended)

### Setup
1. **Jalankan monitor** (di terminal lain):
```bash
npm run monitor:notifications
```

2. **Buka aplikasi** → **Login** dengan user test account
   - Saat login, FCM token akan otomatis tersimpan di database
   - Lihat console log: `✅ FCM Token saved successfully: ...`

3. **Verify token sudah tersimpan**:
   - Buka [Firebase Console](https://console.firebase.google.com)
   - Database → `user_fcm_tokens` → harus ada user dengan token

### Test Notification
```bash
npm run test:notification
```

**Expected output:**
```
🔧 Initializing Firebase Admin...
📱 Sending test notification...
[Firebase Admin] Loaded service account from firebase-service-account.json
[Firebase Admin] Successfully initialized with Admin SDK
✅ Notification test completed!
Result: { successCount: 1, failureCount: 0 }
```

**Device harus menerima notification:**
- 🌟 Jika app buka (foreground) → Notification Alert
- 🔔 Jika app di background → Push notification di notification tray

---

## Method 2: Wait for Real Earthquake (Automatic)

Monitor akan otomatis mengirim notifikasi saat ada gempa baru dari BMKG:

```bash
npm run monitor:notifications
```

**Cara kerja:**
1. Monitor cek BMKG API setiap 10-120 detik
2. Saat ada gempa baru → kirim ke semua user
3. Device menerima notification

**Status terminal:**
```
[Firebase Admin] Loaded service account from firebase-service-account.json
[Firebase Admin] Successfully initialized with Admin SDK
Starting gempa dirasakan notification monitor...

✅ New earthquake detected! Sending notifications...
Notification sent: 1 success, 0 failed
```

---

## Method 3: Test dengan Firebase Console (Manual)

1. Buka [Firebase Console](https://console.firebase.google.com)
2. Cloud Messaging → Create your first campaign
3. Masukkan:
   - **Title**: `Gempa Dirasakan 🌍`
   - **Body**: `Gempa M5.2 di Bandung, Jawa Barat`
4. **Target** → Select app (Android/iOS)
5. **Send**

---

## 🔍 Debugging Tips

### Q: Test jalankan tapi notification tidak terima?

**A: Check beberapa hal:**

1. **FCM Token belum tersimpan?**
   ```
   - Login ulang ke app
   - Lihat console: "FCM Token saved successfully"
   - Check Firebase Console → Database → user_fcm_tokens
   ```

2. **Device tidak punya permission?**
   ```
   - Cek phone settings → Notification → App permission
   - Ensure notification permission enabled
   ```

3. **Monitor tidak running?**
   ```
   - Pastikan terminal monitor masih active
   - Check: "Starting gempa dirasakan notification monitor..."
   ```

4. **Firestore Rules blocking?**
   ```
   - Buka Firebase Console → Database → Rules
   - Pastikan rules allow user read/write access
   ```

### Q: Monitor warning "No user tokens found"?

**A: Masuk ke database dan manually add test token:**

```bash
npm run test:notification
```

Tapi sebelumnya, pastikan:
1. Ada minimal 1 user yang login
2. Token tersimpan di `user_fcm_tokens/{userId}`

---

## 📊 Monitoring Logs

**Terminal Monitor Output:**

| Message | Meaning |
|---------|---------|
| ✅ Successfully initialized with Admin SDK | Firebase ready |
| Starting gempa dirasakan notification monitor | Monitor running |
| No user tokens found for notification | Belum ada user login |
| New earthquake detected! | Gempa baru dari BMKG |
| Notification sent: X success, Y failed | Notif terkirim ke X user |
| Event already notified, skipping | Gempa sudah pernah di-notify |

---

## 📲 What Users Will See

### Foreground (App Buka):
- ⚠️ Alert dialog: "Gempa Dirasakan 🌍"
- 📝 Body: "Gempa M5.2 di Bandung, Jawa Barat"

### Background (App Tertutup):
- 🔔 Push Notification di notification tray
- Tap notification → Buka app dengan data gempa

---

## ✅ Checklist Before Production

- [ ] Monitor running 24/7 di backend
- [ ] Minimal 1 user login & menyimpan FCM token
- [ ] Test notification script works
- [ ] Received notification di device (foreground & background)
- [ ] Firebase admin SDK initialized
- [ ] Database rules allow token storage
- [ ] .env file configured dengan BMKG API URL
- [ ] Firebase service account key available
