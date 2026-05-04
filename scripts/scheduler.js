/**
 * Scheduler untuk auto-sync gempa data ke Firebase
 * Run dengan: node api/database/scheduler.js
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple interval-based scheduler
function schedule(name, interval, fn) {
  // Run immediately on startup
  fn().catch((error) => {
  });

  // Then run at intervals
  setInterval(async () => {
    try {
      const result = await fn();
    } catch (error) {
    }
  }, interval);
}

async function syncLatestGempaDirasakan() {
  // Spawn as subprocess to use dynamic import
  return new Promise((resolve, reject) => {
    const child = spawn("node", [
      path.join(__dirname, "sync-latest-gempa-dirasakan-history.js"),
    ]);

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
      } else {
        try {
          resolve(JSON.parse(output));
        } catch {
          resolve({ ok: true, raw: output });
        }
      }
    });
  });
}

async function syncGempaTerdeteksi() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [
      path.join(__dirname, "db-gempa-terdeteksi-history.js"),
    ]);

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}: ${errorOutput}`));
      } else {
        try {
          resolve(JSON.parse(output));
        } catch {
          resolve({ ok: true, raw: output });
        }
      }
    });
  });
}

// Start schedulers
// Sync gempa dirasakan latest every 5 minutes (300000 ms)
schedule(
  "sync:gempa-dirasakan:latest",
  300000,
  syncLatestGempaDirasakan
);

// Sync gempa terdeteksi every 15 minutes (900000 ms)
schedule(
  "sync:gempa-terdeteksi:history",
  900000,
  syncGempaTerdeteksi
);

// Graceful shutdown
process.on("SIGINT", () => {
  process.exit(0);
});
