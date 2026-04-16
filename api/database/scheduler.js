/**
 * Scheduler untuk auto-sync gempa data ke Firebase
 * Run dengan: node api/database/scheduler.js
 */

const fs = require("fs");
const path = require("path");

// Simple interval-based scheduler
function schedule(name, interval, fn) {
  console.log(
    `[${new Date().toISOString()}] Scheduling ${name} every ${interval}ms`
  );

  // Run immediately on startup
  fn().catch((error) => {
    console.error(`[${name}] Error on startup:`, error.message);
  });

  // Then run at intervals
  setInterval(async () => {
    try {
      const result = await fn();
      console.log(
        `[${new Date().toISOString()}] [${name}] ${JSON.stringify(result, null, 2)}`
      );
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] [${name}] Error:`,
        error.message || String(error)
      );
    }
  }, interval);
}

async function syncLatestGempaDirasakan() {
  const script = require("./sync-latest-gempa-dirasakan-history.js");
  // The script exports an async run() function that should be invoked
  // For now, we'll spawn it as a subprocess
  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process");
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
    const { spawn } = require("child_process");
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
console.log("[Scheduler] Starting auto-sync services...\n");

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

console.log(
  "\n[Scheduler] Services running. Press Ctrl+C to stop.\n"
);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Scheduler] Shutting down...");
  process.exit(0);
});
