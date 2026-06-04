/**
 * Test script untuk mengirim notifikasi tsunami dari BMKG API.
 * Usage:
 *   node scripts/test-tsunami-notification.js --dry-run
 *   node scripts/test-tsunami-notification.js --dry-run --subject-pd PD-3.2
 *   node scripts/test-tsunami-notification.js --dry-run --event-id 20260402072613
 *   node scripts/test-tsunami-notification.js --send
 *   npm run test:tsunami-notification:send
 */

import fs from "fs";
import path from "path";
import {
  fetchTsunamiWarnings,
  sendTsunamiNotification,
} from "./fcm-notifications.js";
import { initializeAdmin } from "./firebase-admin-config.js";

function readEnvFileIfExists(envPath) {
  if (!fs.existsSync(envPath)) return {};

  const raw = fs.readFileSync(envPath, "utf8");
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
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

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  const envDevelopmentPath = path.resolve(process.cwd(), ".env.development");

  return {
    ...readEnvFileIfExists(envDevelopmentPath),
    ...readEnvFileIfExists(envPath),
    ...process.env,
  };
}

function parseArgs(argv) {
  const args = new Set(argv);
  const sendFromNpmConfig = process.env.npm_config_send === "true";
  const getFlagValue = (name) => {
    const inline = argv.find((arg) => arg.startsWith(`${name}=`));
    if (inline) return inline.slice(name.length + 1).trim();

    const index = argv.indexOf(name);
    if (index >= 0) return String(argv[index + 1] ?? "").trim();
    return "";
  };

  return {
    dryRun: !(args.has("--send") || sendFromNpmConfig),
    eventId: getFlagValue("--event-id"),
    subjectPd: normalizeSubjectPd(getFlagValue("--subject-pd")),
  };
}

function buildTestEventId(warning) {
  const baseEventId = warning.eventId || warning.warningId || "tsunami_warning";
  return `${baseEventId}_${warning.warningId}_test_${Date.now()}`;
}

function extractSubjectPd(subject) {
  const match = String(subject ?? "").match(/\bPD[-\s]*(\d+(?:\.\d+)?)\b/i);
  return match ? `PD-${match[1]}` : "";
}

function normalizeSubjectPd(value) {
  const match = String(value ?? "").trim().match(/^PD[-\s]*(\d+(?:\.\d+)?)$/i);
  return match ? `PD-${match[1]}` : "";
}

function isPdOneToThree(subjectPd) {
  const match = String(subjectPd ?? "").match(/^PD-(\d+)/i);
  if (!match) return false;

  const pdNumber = Number.parseInt(match[1], 10);
  return pdNumber >= 1 && pdNumber <= 3;
}

function normalizeSignaturePart(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getEventSignature(warning) {
  return [
    warning.date,
    warning.time,
    warning.pointCoordinates,
    warning.magnitude,
    warning.location,
  ].map(normalizeSignaturePart).join("|");
}

function buildWarningGroups(warnings) {
  const groupBySignature = new Map();

  for (const warning of warnings) {
    const signature = getEventSignature(warning);
    const existing = groupBySignature.get(signature);

    if (existing) {
      existing.warnings.push(warning);
      existing.maxTimesentMs = Math.max(existing.maxTimesentMs, warning.timesentMs);
      existing.maxRawIndex = Math.max(existing.maxRawIndex, warning.rawIndex);
      continue;
    }

    groupBySignature.set(signature, {
      signature,
      warnings: [warning],
      maxTimesentMs: warning.timesentMs,
      maxRawIndex: warning.rawIndex,
    });
  }

  return Array.from(groupBySignature.values()).sort((a, b) => {
    if (b.maxTimesentMs !== a.maxTimesentMs) {
      return b.maxTimesentMs - a.maxTimesentMs;
    }
    return b.maxRawIndex - a.maxRawIndex;
  });
}

function getCandidateWarnings(group, subjectPd) {
  return group.warnings
    .map((warning) => ({
      subjectPd: extractSubjectPd(warning.subject),
      warning,
    }))
    .filter((item) => isPdOneToThree(item.subjectPd))
    .filter((item) => !subjectPd || item.subjectPd === subjectPd)
    .filter((item) => item.warning.wzAreas?.length > 0)
    .sort((a, b) => {
      if (b.warning.timesentMs !== a.warning.timesentMs) {
        return b.warning.timesentMs - a.warning.timesentMs;
      }
      return b.warning.rawIndex - a.warning.rawIndex;
    });
}

function selectWarningGroup(groups, options) {
  if (options.eventId) {
    return groups.find((group) =>
      group.warnings.some((warning) => warning.eventId === options.eventId),
    ) ?? null;
  }

  return groups.find((group) => getCandidateWarnings(group, options.subjectPd).length > 0) ?? null;
}

function formatWzDistricts(wzAreas) {
  return wzAreas
    .map((area) => area.district)
    .filter((district) => district)
    .join(", ");
}

function buildNoEligibleRecipientMessage(result) {
  const totalTokenCount = result?.totalTokenCount ?? 0;
  const skipped = result?.skippedCounts ?? {};

  if (totalTokenCount === 0 || skipped.noToken > 0) {
    return "No recipient tokens found in user_fcm_tokens. Aktifkan notifikasi push di aplikasi lalu login ulang atau toggle OFF/ON agar token tersimpan.";
  }

  return [
    "No eligible tsunami recipient matched the selected WZArea.",
    `totalUserToken=${totalTokenCount}`,
    `skippedNoLocation=${skipped.noLocation ?? 0}`,
    `skippedAreaMismatch=${skipped.areaMismatch ?? 0}`,
    "Cek log per user untuk source, district, dan matched WZ district.",
  ].join(" ");
}

async function testTsunamiNotification() {
  try {
    const options = parseArgs(process.argv.slice(2));
    console.log("[test-tsunami-notification] Initializing Firebase Admin...");
    await initializeAdmin();

    const env = loadEnv();
    const apiUrl =
      env.EXPO_PUBLIC_PERINGATAN_TSUNAMI_API_URL ||
      env.PERINGATAN_TSUNAMI_API_URL;

    if (!apiUrl) {
      throw new Error(
        "EXPO_PUBLIC_PERINGATAN_TSUNAMI_API_URL not configured in .env or .env.development",
      );
    }

    const warnings = await fetchTsunamiWarnings(apiUrl);
    if (warnings.length === 0) {
      throw new Error("No tsunami warning data available from BMKG API");
    }

    console.log(
      `[test-tsunami-notification] ${options.dryRun ? "Running dry-run" : "Sending test push"}...`,
    );

    const groups = buildWarningGroups(warnings);
    const availableSubjects = warnings
      .map((warning) => extractSubjectPd(warning.subject))
      .filter((subjectPd) => subjectPd);
    console.log(
      `[test-tsunami-notification] API subjects: ${availableSubjects.join(", ")}`,
    );

    const selectedGroup = selectWarningGroup(groups, options);
    if (!selectedGroup) {
      throw new Error("No tsunami event group with PD 1-3 wzAreas available from BMKG API");
    }

    const candidates = getCandidateWarnings(selectedGroup, options.subjectPd);
    if (candidates.length === 0) {
      throw new Error(
        `No ${options.subjectPd || "PD 1-3"} warning with wzAreas available in selected tsunami event group`,
      );
    }

    console.log(
      `[test-tsunami-notification] Candidate subjects with wzAreas: ${candidates.map((item) => item.subjectPd).join(", ")}`,
    );
    console.log(
      `[test-tsunami-notification] Selected event signature: ${selectedGroup.signature}`,
    );

    const selected = candidates[0];
    const { subjectPd, warning } = selected;
    console.log(
      `[test-tsunami-notification] Selected ${subjectPd} from ${candidates.length} candidate(s)`,
    );
    console.log(
      `[test-tsunami-notification] Selected eventId: ${warning.eventId}`,
    );
    console.log(
      `[test-tsunami-notification] Testing ${subjectPd} (${warning.subject}) with ${warning.wzAreas.length} wzAreas`,
    );
    console.log(
      `[test-tsunami-notification] WZArea districts: ${formatWzDistricts(warning.wzAreas)}`,
    );

    const result = await sendTsunamiNotification(
      {
        eventId: buildTestEventId(warning),
        warningId: warning.warningId,
        subject: warning.subject,
        headline: warning.headline,
        description: warning.description,
        location: warning.location,
        magnitude: warning.magnitude,
        timestamp: warning.timestamp,
        wzAreas: warning.wzAreas,
      },
      { skipDedupe: true, dryRun: options.dryRun, debugRecipients: true },
    );

    if (!options.dryRun && result.eligibleCount === 0) {
      throw new Error(buildNoEligibleRecipientMessage(result));
    }

    console.log(
      `[test-tsunami-notification] ${subjectPd} done. success=${result.successCount}, failure=${result.failureCount}, eligible=${result.eligibleCount}`,
    );
    console.log(`[test-tsunami-notification] ${subjectPd} skipped:`, result.skippedCounts);

    process.exit(0);
  } catch (error) {
    console.error("[test-tsunami-notification] Failed:", error?.message || error);
    process.exit(1);
  }
}

testTsunamiNotification();
