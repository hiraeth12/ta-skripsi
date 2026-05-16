import fs from "fs";
import path from "path";

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex < 0) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  if (!key) {
    return null;
  }

  return { key, value };
}

export function loadEnvFile(envPath = path.resolve(process.cwd(), ".env")) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed || process.env[parsed.key] !== undefined) {
      continue;
    }

    process.env[parsed.key] = parsed.value;
  }
}

loadEnvFile();
