type DirasakanRawPayload = {
  coordStr: string;
  magnitude: string;
  kedalaman: string;
  wilayah: string;
  tanggal: string;
  jam: string;
  felt: string;
  description: string;
  shakemap: string;
};

/**
 * Sanitasi dan ekstrak field dari satu item info gempa dirasakan (JSON/XML).
 * Mengembalikan null jika data tidak valid.
 */
export function parseDirasakanPayload(
  latest: unknown,
): DirasakanRawPayload | null {
  if (!latest || typeof latest !== "object") return null;
  const l = latest as Record<string, unknown>;

  const coordStr = String(
    (l?.point as Record<string, unknown>)?.coordinates ?? "",
  );
  if (!coordStr) return null;

  return {
    coordStr,
    magnitude: String(l.magnitude ?? "-"),
    kedalaman: String(l.depth ?? "-"),
    wilayah: String(l.area ?? "-"),
    tanggal: String(l.date ?? ""),
    jam: String(l.time ?? ""),
    felt: String(l.felt ?? ""),
    description: String(l.description ?? ""),
    shakemap: String(l.shakemap ?? ""),
  };
}