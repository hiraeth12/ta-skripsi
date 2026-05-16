# Password Reset API

Backend HTTP kecil untuk flow forgot password OTP email.

## Runtime

```bash
npm run password-reset:api
```

Saat dijalankan dari root project, backend otomatis membaca file `.env`.

## Environment

```text
PORT=8080
FIREBASE_SERVICE_ACCOUNT_PATH=firebase-service-account.json
FIREBASE_DATABASE_URL=https://PROJECT_ID-default-rtdb.asia-southeast1.firebasedatabase.app
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@gmail.com
SMTP_PASSWORD=gmail-app-password
SMTP_FROM=SeismoTrack <email@gmail.com>
OTP_HASH_SECRET=minimum-32-character-random-secret
CORS_ORIGIN=*
```

Untuk Gmail SMTP dengan App Password gunakan `smtp.gmail.com` port `587`
untuk TLS/STARTTLS, sesuai konfigurasi Gmail SMTP.
