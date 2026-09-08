// Nomor order KK-YYYYMMDD-XXXX — tanggal WITA (bukan UTC!) + retry anti-tabrakan.
export function nextOrderNumber(): string {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Makassar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replace(/-/g, "");
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `KK-${dateStr}-${suffix}`;
}
