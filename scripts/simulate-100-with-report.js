import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { initializeAdmin } from "./firebase-admin-config.js";

function readEnvFile(envPath) {
  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    env[key] = value;
  }
  return env;
}

async function simulate100NotificationsWithReport() {
  try {
    console.log("[simulate-report] Initializing Firebase Admin...");
    await initializeAdmin();

    const envPath = path.resolve(process.cwd(), ".env");
    const envVars = readEnvFile(envPath);

    const db = admin.database();
    
    console.log("[simulate-report] Fetching test device group tokens...");
    const tokensSnapshot = await db.ref("user_fcm_tokens").get();
    const tokens = [];

    if (tokensSnapshot.exists()) {
      const tokenData = tokensSnapshot.val();
      for (const userId in tokenData) {
        const entry = tokenData[userId];
        const tokenValue =
          typeof entry === "string"
            ? entry
            : typeof entry?.token === "string"
              ? entry.token
              : null;
        if (tokenValue) {
          tokens.push(tokenValue);
        }
      }
    }

    const uniqueTokens = Array.from(new Set(tokens));
    if (uniqueTokens.length === 0) {
      console.log("[simulate-report] Error: No tokens found in user_fcm_tokens database.");
      process.exit(1);
    }
    
    console.log(`[simulate-report] Found ${uniqueTokens.length} unique test device tokens.`);
    
    // Prepare 100 messages distributed to the tokens mapping
    const TOTAL_NOTIFICATIONS = 100;
    const messages = [];
    
    for (let i = 0; i < TOTAL_NOTIFICATIONS; i++) {
        const token = uniqueTokens[i % uniqueTokens.length];
        messages.push({
            android: {
                priority: "high",
            },
            data: {
                type: "gempa_dirasakan",
                headline: `Test Simulasi Gempa #${i + 1}`,
                magnitude: "5.5",
                location: "Selatan Jawa",
                depth: "10 km",
                timestamp: new Date().toISOString(),
                title: "Peringatan Gempa Bumi ! (Simulasi)",
                body: `(Simulasi ${i + 1}/${TOTAL_NOTIFICATIONS}) Gempa Magnitudo 5.5`,
                send_timestamp: String(Date.now()),
            },
            token: token,
        });
    }

    console.log(`[simulate-report] Sending ${messages.length} notifications...`);
    
    // Record Start Time
    const startTime = Date.now();
    const startDate = new Date().toLocaleString("id-ID");
    
    // Send using sendEach API
    const response = await admin.messaging().sendEach(messages);

    // Record End Time
    const endTime = Date.now();
    const endDate = new Date().toLocaleString("id-ID");
    const duration = endTime - startTime;

    let successCount = 0;
    let failureCount = 0;
    let tableRows = "";

    response.responses.forEach((resp, index) => {
        const status = resp.success ? "✅ SUCCESS" : "❌ FAILED";
        const errorMsg = resp.success ? "-" : resp.error?.code || resp.error?.message;
        const tokenSnippet = messages[index].token.substring(0, 15) + "...";
        tableRows += `| ${index + 1} | ${tokenSnippet} | ${status} | ${errorMsg} |\n`;
        
        if (resp.success) {
            successCount++;
        } else {
            failureCount++;
        }
    });

    const successRate = (successCount / TOTAL_NOTIFICATIONS) * 100;

    // Build Markdown Report
    const mdContent = `
# Laporan Simulasi 100 Push Notification FCM
**Waktu Eksekusi**: ${startDate}

## Ringkasan Hasil
- **Total Dikirim**: ${TOTAL_NOTIFICATIONS}
- **Berhasil**: ${successCount}
- **Gagal**: ${failureCount}
- **Tingkat Keberhasilan**: ${successRate.toFixed(2)}%

## Metrik Waktu Pengiriman
- **Waktu Mulai Eksekusi batch**: ${startDate}
- **Waktu Selesai Eksekusi batch**: ${endDate}
- **Total Durasi Eksekusi (ms)**: ${duration} ms (${(duration / 1000).toFixed(2)} detik)
- **Rata-rata Waktu Eksekusi per Pesan**: ${(duration / TOTAL_NOTIFICATIONS).toFixed(2)} ms

> *Metode pengiriman menggunakan \`admin.messaging().sendEach\` yang akan diproses secara batch. Waktu di atas adalah waktu total yang dibutuhkan server untuk merespon dan me-resolve seluruh pesannya.*

## Detail Pengiriman

| No | Token Perangkat (Awal) | Status Penyampaian FCM | Keterangan / Kode Error |
|----|------------------------|-------------------------|--------------------------|
${tableRows}
`;

    // Save Markdown file to /markdown folder
    const mdDir = path.resolve(process.cwd(), "markdown");
    if (!fs.existsSync(mdDir)) {
        fs.mkdirSync(mdDir, { recursive: true });
    }
    
    const reportPath = path.join(mdDir, "SIMULASI_100_NOTIFIKASI.md");
    fs.writeFileSync(reportPath, mdContent.trim());

    console.log(`[simulate-report] Simulasi Selesai.`);
    console.log(`[simulate-report] Total Waktu: ${duration} ms`);
    console.log(`[simulate-report] Hasil telah ditulis ke file laporan di: ${reportPath}`);
    
    process.exit(0);
  } catch (error) {
    console.error("[simulate-report] Fatal error:", error);
    process.exit(1);
  }
}

simulate100NotificationsWithReport();
