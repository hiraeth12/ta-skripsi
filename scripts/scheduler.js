import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { syncTsunamiEvents } from "./sync-tsunami-events.js";
import { syncGempaTerdeteksi } from "./sync-gempa-terdeteksi.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const runningJobs = new Map();

function schedule(name, interval, fn) {
  async function run() {
    if (runningJobs.get(name)) {
      console.log(`[SKIP] ${name} masih berjalan`);
      return;
    }

    runningJobs.set(name, true);
    console.log(`[START] ${name}`);

    try {
      const result = await fn();
      console.log(`[DONE] ${name}`, result);
    } catch (error) {
      console.error(`[ERROR] ${name}`, error);
    } finally {
      runningJobs.set(name, false);
    }
  }

  run();

  setInterval(run, interval);
}

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [path.join(__dirname, scriptName)], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(`${scriptName} exited with code ${code}: ${errorOutput}`)
        );
        return;
      }

      try {
        resolve(JSON.parse(output));
      } catch {
        resolve({ ok: true, raw: output.trim() });
      }
    });
  });
}

async function syncLatestGempaDirasakan() {
  return runScript("sync-latest-gempa-dirasakan-history.js");
}


async function syncTsunamiWarning() {
  const result = await syncTsunamiEvents();
  if (!result.ok) {
    throw new Error(result.reason || "Failed to sync tsunami warning");
  }
  return result;
}

schedule(
  "sync:gempa-dirasakan:latest",
  300000,
  syncLatestGempaDirasakan
);

schedule(
  "sync:gempa-terdeteksi:history",
  900000,
  syncGempaTerdeteksi
);

schedule(
  "sync:tsunami-warning",
  300000,
  syncTsunamiWarning
);

process.on("SIGINT", () => {
  console.log("Scheduler stopped");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Scheduler stopped");
  process.exit(0);
});
