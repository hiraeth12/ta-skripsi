// ─── Mapping bulan Indonesia → English ───────────────────────────────────────
const BULAN_ID_TO_EN: Record<string, string> = {
  Jan: "Jan",
  Feb: "Feb",
  Mar: "Mar",
  Apr: "Apr",
  Mei: "May",
  Jun: "Jun",
  Jul: "Jul",
  Agt: "Aug",
  Sep: "Sep",
  Okt: "Oct",
  Nov: "Nov",
  Des: "Dec",
};

/**
 * Menghitung selisih waktu dari tanggal & jam gempa ke waktu sekarang.
 * Mendukung format tanggal BMKG (DD-MM-YY, YYYY-MM-DD, dan nama bulan ID).
 * @returns string seperti "Baru saja", "5 Menit Lalu", "2 Jam Lalu", "Kemarin", "3 Hari Lalu"
 */
export function calculateTimeAgo(tanggal: string, jam: string): string {
  if (!tanggal || !jam) return "Memuat...";
  try {
    const cleanJam = jam.replace(/ WIB| WITA| WIT/gi, "").trim();
    let dateStr = tanggal;

    for (const [id, en] of Object.entries(BULAN_ID_TO_EN)) {
      if (dateStr.includes(id)) {
        dateStr = dateStr.replace(id, en);
        break;
      }
    }

    let quakeDate: Date;
    if (dateStr.includes("-") && dateStr.split("-").length === 3) {
      const parts = dateStr.split("-");
      if (parts[0].length === 4) {
        // Format: YYYY-MM-DD
        quakeDate = new Date(`${dateStr}T${cleanJam}+07:00`);
      } else {
        // Format: DD-MM-YY atau DD-MM-YYYY
        const year = parts[2].length === 2 ? "20" + parts[2] : parts[2];
        quakeDate = new Date(`${year}-${parts[1]}-${parts[0]}T${cleanJam}+07:00`);
      }
    } else {
      quakeDate = new Date(`${dateStr} ${cleanJam} GMT+0700`);
    }

    const quakeTime = quakeDate.getTime();
    if (isNaN(quakeTime)) return "-";

    const diffMs = Date.now() - quakeTime;
    if (diffMs < 0) return "Baru saja";

    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return diffDays === 1 ? "Kemarin" : `${diffDays} Hari Lalu`;
    if (diffHours > 0) return `${diffHours} Jam Lalu`;
    if (diffMins > 0) return `${diffMins} Menit Lalu`;
    return "Baru saja";
  } catch {
    return "-";
  }
}