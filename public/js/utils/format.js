export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function toDateKey(date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

export function toHHmm(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function parseHHmmToDate(dateBase, hhmm) {
  const [hh, mm] = hhmm.split(":").map(Number);
  const d = new Date(dateBase);
  d.setHours(hh, mm, 0, 0);
  return d;
}