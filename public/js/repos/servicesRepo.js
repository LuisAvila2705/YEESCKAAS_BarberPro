// public/js/repos/servicesRepo.js
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import { db } from "../firebase/firebase.js";

function mapServiceDoc(d) {
  const data = d.data();
  return {
    id: d.id,
    // preferimos displayName (para UI), fallback a name
    nombre: data.displayName || data.name,
    duracion: data.durationMin,
    precio: data.price,
    activo: data.active === true,
    agendable: data.bookable !== false, // default true si no existe
  };
}

export async function listServicesBookable() {
  // OJO: si todavía no tienes bookable en BD, igual funcionará (fallback true)
  const q = query(collection(db, "services"), where("active", "==", true));
  const qs = await getDocs(q);

  return qs.docs
    .map(mapServiceDoc)
    .filter((s) => s.agendable === true);
}

export async function getServiceById(id) {
  const snap = await getDoc(doc(db, "services", id));
  if (!snap.exists()) throw new Error("Servicio no encontrado");

  return mapServiceDoc(snap);
}