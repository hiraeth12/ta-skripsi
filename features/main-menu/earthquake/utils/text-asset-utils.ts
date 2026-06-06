export async function checkTextAssetAvailable(
  url: string | null | undefined,
  signal?: AbortSignal,
): Promise<string | null> {
  const value = String(url ?? "").trim();
  if (!value) return null;

  try {
    const res = await fetch(value, { method: "HEAD", signal });
    return res.ok ? value : null;
  } catch {
    return null;
  }
}
