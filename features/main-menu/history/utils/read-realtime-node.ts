import { get, ref } from "@react-native-firebase/database";

const READ_TIMEOUT_MS = 8000;

type RealtimeDatabase = Parameters<typeof ref>[0];

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function buildRestUrl(databaseUrl: string, path: string): string {
  const baseUrl = databaseUrl.replace(/\/+$/, "");
  const encodedPath = path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${baseUrl}/${encodedPath}.json`;
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`${label} timeout after ${READ_TIMEOUT_MS}ms`)),
      READ_TIMEOUT_MS,
    );

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeout));
  });
}

async function readViaRest(databaseUrl: string, path: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), READ_TIMEOUT_MS);

  try {
    const response = await fetch(buildRestUrl(databaseUrl, path), {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`REST ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function readRealtimeNode(
  db: RealtimeDatabase,
  databaseUrl: string | undefined,
  path: string,
): Promise<unknown | null> {
  let firebaseError: unknown = null;

  try {
    const snapshot = await withTimeout(get(ref(db, path)), `Firebase ${path}`);
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    firebaseError = error;
    console.warn(`[RealtimeDB] Firebase read failed for /${path}:`, error);
  }

  if (!databaseUrl) {
    throw firebaseError;
  }

  try {
    return await readViaRest(databaseUrl, path);
  } catch (restError) {
    throw new Error(
      `Firebase read failed: ${errorMessage(firebaseError)}; REST fallback failed: ${errorMessage(restError)}`,
    );
  }
}

export function describeRealtimeReadError(error: unknown, label: string): string {
  const message = errorMessage(error);

  if (/permission|denied/i.test(message)) {
    return `Akses Firebase untuk ${label} ditolak. Periksa rules read /tsunamiEvents.`;
  }

  if (/timeout|abort/i.test(message)) {
    return `Koneksi Firebase untuk ${label} terlalu lama. Coba lagi nanti.`;
  }

  return `Gagal memuat ${label}.`;
}
