// public/js/firebase/seed.js
import { db } from "./firebase.js";

import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const SERVICES = [
  { id: "corte",          name: "Corte",          price: 140, durationMin: 40 },
  { id: "corte_cn",       name: "Corte c/n",      price: 160, durationMin: 50 },
  { id: "corte_con_cita", name: "Corte con cita", price: 200, durationMin: 50 },
  { id: "ceja",           name: "Ceja",           price: 50,  durationMin: 15 },
  { id: "barba",          name: "Barba",          price: 100, durationMin: 30 },
  { id: "mascarilla",     name: "Mascarilla",     price: 80,  durationMin: 30 },
];

export async function seedCore() {
  // settings/agenda
  await setDoc(
    doc(db, "settings", "agenda"),
    {
      stepMin: 15,
      tz: "America/Monterrey",
      hours: {
        mon: { start: "11:00", end: "20:00" },
        tue: { start: "11:00", end: "20:00" },
        wed: { start: "11:00", end: "20:00" },
        thu: { start: "11:00", end: "20:00" },
        fri: { start: "11:00", end: "20:00" },
        sat: { start: "10:00", end: "18:00" },
        sun: null, // domingo cerrado
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // services/{id}
  for (const s of SERVICES) {
    await setDoc(
      doc(db, "services", s.id),
      {
        name: s.name,
        price: s.price,
        durationMin: s.durationMin,
        active: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  console.log("✅ SeedCore: settings + services listo");
}