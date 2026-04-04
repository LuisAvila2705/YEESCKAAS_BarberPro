import { parseHHmmToDate, toHHmm } from "./format.js";

/**
 * Genera slots (HH:mm) desde horaInicio -> horaFin (no incluye horaFin)
 * stepMin: 10/15/20/30 etc.
 */
export function buildSlotsForDay(dateBase, horaInicio, horaFin, stepMin = 30) {
  const start = parseHHmmToDate(dateBase, horaInicio);
  const end = parseHHmmToDate(dateBase, horaFin);

  const out = [];
  let cur = new Date(start);

  while (cur < end) {
    out.push(toHHmm(cur));
    cur = new Date(cur.getTime() + stepMin * 60 * 1000);
  }

  return out;
}