import { db } from "./firebase.js";
import {
  doc, setDoc, collection, writeBatch, serverTimestamp, getDoc
} from "firebase/firestore";

function pad2(n) { return String(n).padStart(2, "0"); }
function hhmm(h, m) { return `${pad2(h)}:${pad2(m)}`; }
function idHHmm(h, m) { return `${pad2(h)}${pad2(m)}`; }

function parseTimeToMinutes(t) {
  const [hh, mm] = t.split(":").map(Number);
  return hh * 60 + mm;
}

function minutesToTime(min) {
  const hh = Math.floor(min / 60);
  const mm = min % 60;
  return hhmm(hh, mm);
}

// YYYY-MM-DD (local)
function toISODate(d) {
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${mm}-${dd}`;
}

function weekdayKey(dateObj) {
  // 0=Sun ... 6=Sat
  const map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[dateObj.getDay()];
}

export async function seedAvailabilityNextDays(days = 14) {
  const agendaRef = doc(db, "settings", "agenda");
  const agendaSnap = await getDoc(agendaRef);
  if (!agendaSnap.exists()) {
    throw new Error("No existe settings/agenda. Corre seedCore() primero.");
  }
  const agenda = agendaSnap.data();
  const stepMin = agenda.stepMin ?? 15;
  const hours = agenda.hours ?? {};

  const today = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const dateStr = toISODate(d);
    const wkey = weekdayKey(d);
    const dayHours = hours[wkey] || null;

    // doc availability/YYYY-MM-DD
    const dayRef = doc(db, "availability", dateStr);

    // Si está cerrado (domingo o lo que sea)
    if (!dayHours) {
      await setDoc(
        dayRef,
        {
          date: dateStr,
          stepMin,
          open: false,
          hours: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      continue;
    }

    await setDoc(
      dayRef,
      {
        date: dateStr,
        stepMin,
        open: true,
        hours: { start: dayHours.start, end: dayHours.end },
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // slots subcollection
    const startM = parseTimeToMinutes(dayHours.start);
    const endM = parseTimeToMinutes(dayHours.end);

    const slotsCol = collection(db, "availability", dateStr, "slots");
    const batch = writeBatch(db);

    for (let t = startM; t < endM; t += stepMin) {
      const time = minutesToTime(t);
      const [hh, mm] = time.split(":").map(Number);
      const slotId = idHHmm(hh, mm);

      batch.set(
        doc(slotsCol, slotId),
        {
          t: time,
          free: true,
          apptId: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    console.log(`✅ Slots generados: ${dateStr}`);
  }

  console.log("✅ SeedAvailability listo");
}