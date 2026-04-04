// public/js/repos/agendaRepo.js
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteField,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  where,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import { db } from "../firebase/firebase.js";

// ---------- refs ----------
function settingsAgendaRef() {
  return doc(db, "settings", "agenda");
}

function dayDocRef(dateKey) {
  return doc(db, "availability", dateKey);
}

function slotsColRef(dateKey) {
  return collection(db, "availability", dateKey, "slots");
}

function slotDocRef(dateKey, slotId) {
  return doc(db, "availability", dateKey, "slots", slotId);
}

function appointmentsColRef() {
  return collection(db, "appointments");
}

// ---------- helpers ----------
function toSlotId(hhmm) {
  return String(hhmm).replace(":", "");
}

function minutesFromHHmm(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
}

function hhmmFromMinutes(total) {
  const h = String(Math.floor(total / 60)).padStart(2, "0");
  const m = String(total % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function weekdayKeyFromDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const jsDay = dt.getDay(); // 0=Sun

  const map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[jsDay];
}

function buildOccupiedTimes(startTime, durationMin, stepMin) {
  const startMin = minutesFromHHmm(startTime);
  const slotsNeeded = Math.ceil(durationMin / stepMin);

  const times = [];
  for (let i = 0; i < slotsNeeded; i++) {
    times.push(hhmmFromMinutes(startMin + i * stepMin));
  }

  return times;
}

// ---------- settings ----------
export async function getAgendaSettings() {
  const snap = await getDoc(settingsAgendaRef());
  if (!snap.exists()) {
    throw new Error("No existe settings/agenda en Firestore.");
  }
  return snap.data();
}

// ---------- availability ----------
export async function ensureDayDoc(dateKey, { openDefault = true } = {}) {
  const ref = dayDocRef(dateKey);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      open: openDefault,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return true;
}

export async function seedAvailabilityDay({
  dateKey,
  start = "11:00",
  end = "20:00",
  slotDuration = 15,
  closed = false,
}) {
  const dayRef = dayDocRef(dateKey);

  if (closed) {
    await setDoc(
      dayRef,
      { open: false, updatedAt: serverTimestamp() },
      { merge: true }
    );
    return { dateKey, created: 0, closed: true };
  }

  await setDoc(
    dayRef,
    { open: true, updatedAt: serverTimestamp() },
    { merge: true }
  );

  const existing = await getDocs(slotsColRef(dateKey));
  if (!existing.empty) {
    return { dateKey, created: 0, already: true, closed: false };
  }

  const startMin = minutesFromHHmm(start);
  const endMin = minutesFromHHmm(end);

  const writes = [];
  for (let t = startMin; t < endMin; t += slotDuration) {
    const time = hhmmFromMinutes(t);
    const slotId = toSlotId(time);

    writes.push(
      setDoc(slotDocRef(dateKey, slotId), {
        available: true,
        time,
        updatedAt: serverTimestamp(),
      })
    );
  }

  await Promise.all(writes);

  return { dateKey, created: writes.length, closed: false };
}

export async function ensureAvailabilityForDate(dateKey) {
  const daySnap = await getDoc(dayDocRef(dateKey));

  if (daySnap.exists()) {
    const slotsSnap = await getDocs(slotsColRef(dateKey));
    if (!slotsSnap.empty || typeof daySnap.data()?.open === "boolean") {
      return {
        dateKey,
        alreadyExists: true,
        open: !!daySnap.data()?.open,
      };
    }
  }

  const settings = await getAgendaSettings();
  const stepMin = Number(settings.stepMin || 15);
  const hours = settings.hours || {};

  const weekdayKey = weekdayKeyFromDateKey(dateKey);
  const rule = hours[weekdayKey];

  if (!rule) {
    return seedAvailabilityDay({
      dateKey,
      slotDuration: stepMin,
      closed: true,
    });
  }

  return seedAvailabilityDay({
    dateKey,
    start: rule.start,
    end: rule.end,
    slotDuration: stepMin,
    closed: false,
  });
}

export function listenAvailabilityDay(dateKey, callback) {
  let unsubSlots = null;

  const unsubDay = onSnapshot(dayDocRef(dateKey), (snap) => {
    const open = snap.exists() ? !!snap.data().open : false;

    if (unsubSlots) unsubSlots();

    const qSlots = query(slotsColRef(dateKey), orderBy("time", "asc"));
    unsubSlots = onSnapshot(qSlots, (qs) => {
      const slots = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback({ open, slots });
    });
  });

  return () => {
    unsubDay();
    if (unsubSlots) unsubSlots();
  };
}

// ---------- appointments ----------
export function listenAppointmentsByDate(dateKey, callback) {
  const q = query(
    appointmentsColRef(),
    where("date", "==", dateKey),
    orderBy("startTime", "asc")
  );

  return onSnapshot(q, (qs) => {
    const rows = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(rows);
  });
}

export async function bookAppointment({
  dateKey,
  startTime,
  service,
  client,
  note = "",
  status = "confirmed",
}) {
  const settings = await getAgendaSettings();
  const stepMin = Number(settings.stepMin || 15);

  const occupiedTimes = buildOccupiedTimes(
    startTime,
    Number(service.duracion || 0),
    stepMin
  );

  const occupiedSlotIds = occupiedTimes.map(toSlotId);

  const dayRef = dayDocRef(dateKey);
  const slotRefs = occupiedSlotIds.map((slotId) => slotDocRef(dateKey, slotId));

  return runTransaction(db, async (tx) => {
    const daySnap = await tx.get(dayRef);
    if (!daySnap.exists() || daySnap.data().open !== true) {
      throw new Error("El día está cerrado o no existe disponibilidad.");
    }

    // validar que todos los slots necesarios existan y estén libres
    for (const ref of slotRefs) {
      const slotSnap = await tx.get(ref);

      if (!slotSnap.exists()) {
        throw new Error("No hay suficiente espacio continuo para esta cita.");
      }

      const slot = slotSnap.data();
      if (slot.available !== true) {
        throw new Error("Ese horario ya no está disponible.");
      }
    }

    const apptRef = doc(appointmentsColRef());

    tx.set(apptRef, {
      clientName: client.name,
      clientPhone: client.phone,
      note: String(note || "").trim().slice(0, 160),
      createdAt: serverTimestamp(),
      date: dateKey,
      serviceId: service.id,
      serviceName: service.nombre,
      durationMin: service.duracion,
      price: service.precio,
      slotId: toSlotId(startTime),
      startTime,
      occupiedSlots: occupiedSlotIds,
      status,
    });

    // bloquear todos los slots ocupados
    for (const ref of slotRefs) {
      tx.update(ref, {
        available: false,
        appointmentId: apptRef.id,
        updatedAt: serverTimestamp(),
      });
    }

    return {
      appointmentId: apptRef.id,
      slotId: toSlotId(startTime),
      occupiedSlots: occupiedSlotIds,
    };
  });
}


// ---------- admin actions ----------

export async function updateAppointmentStatus(appointmentId, status) {
  if (!appointmentId) {
    throw new Error("appointmentId es requerido.");
  }

  await updateDoc(doc(db, "appointments", appointmentId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function cancelAppointment(appointmentId) {
  if (!appointmentId) {
    throw new Error("appointmentId es requerido.");
  }

  const apptRef = doc(db, "appointments", appointmentId);

  return runTransaction(db, async (tx) => {
    const apptSnap = await tx.get(apptRef);

    if (!apptSnap.exists()) {
      throw new Error("La cita no existe.");
    }

    const appt = apptSnap.data();
    const dateKey = appt.date;
    const occupiedSlots = Array.isArray(appt.occupiedSlots)
      ? appt.occupiedSlots
      : [];

    // 1. LEER todos los slots primero
    const slotRefs = occupiedSlots.map((slotId) => slotDocRef(dateKey, slotId));
    const slotSnaps = [];

    for (const ref of slotRefs) {
      const snap = await tx.get(ref);
      slotSnaps.push({ ref, snap });
    }

    // 2. ESCRIBIR después de terminar todas las lecturas
    for (const { ref, snap } of slotSnaps) {
      if (snap.exists()) {
        tx.update(ref, {
          available: true,
          appointmentId: deleteField(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    tx.update(apptRef, {
      status: "cancelled",
      updatedAt: serverTimestamp(),
    });

    return { success: true, appointmentId };
  });
}

export async function createManualBlock({
  dateKey,
  startTime,
  durationMin,
  reason = "Bloqueo manual",
}) {
  if (!dateKey) {
    throw new Error("La fecha del bloqueo es requerida.");
  }

  if (!startTime) {
    throw new Error("La hora de inicio es requerida.");
  }

  const safeDuration = Number(durationMin || 0);
  if (!safeDuration || safeDuration <= 0) {
    throw new Error("La duración del bloqueo debe ser mayor a 0.");
  }

  const settings = await getAgendaSettings();
  const stepMin = Number(settings.stepMin || 15);

  if (safeDuration % stepMin !== 0) {
    throw new Error(`La duración debe ser múltiplo de ${stepMin} minutos.`);
  }

  const occupiedTimes = buildOccupiedTimes(startTime, safeDuration, stepMin);
  const occupiedSlotIds = occupiedTimes.map(toSlotId);

  const dayRef = dayDocRef(dateKey);
  const slotRefs = occupiedSlotIds.map((slotId) => slotDocRef(dateKey, slotId));

  return runTransaction(db, async (tx) => {
    const daySnap = await tx.get(dayRef);

    if (!daySnap.exists() || daySnap.data().open !== true) {
      throw new Error("El día está cerrado.");
    }

    const slotSnaps = [];
    for (const ref of slotRefs) {
      const slotSnap = await tx.get(ref);
      slotSnaps.push({ ref, snap: slotSnap });
    }

    for (const { snap } of slotSnaps) {
      if (!snap.exists()) {
        throw new Error("El bloqueo rebasa el horario disponible del día.");
      }

      if (snap.data().available !== true) {
        throw new Error("Uno o más horarios ya están ocupados.");
      }
    }

    const blockRef = doc(appointmentsColRef());

    const startMin = minutesFromHHmm(startTime);
    const endTime = hhmmFromMinutes(startMin + safeDuration);

    tx.set(blockRef, {
      type: "block",
      clientName: "Bloqueo",
      clientPhone: "",
      note: String(reason || "Bloqueo manual").trim().slice(0, 120),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      date: dateKey,
      serviceId: null,
      serviceName: "Bloqueo manual",
      durationMin: safeDuration,
      price: 0,
      slotId: toSlotId(startTime),
      startTime,
      endTime,
      occupiedSlots: occupiedSlotIds,
      status: "blocked",
    });

    for (const { ref } of slotSnaps) {
      tx.update(ref, {
        available: false,
        appointmentId: blockRef.id,
        updatedAt: serverTimestamp(),
      });
    }

    return {
      blockId: blockRef.id,
      dateKey,
      startTime,
      endTime,
      occupiedSlots: occupiedSlotIds,
    };
  });
}

export async function removeManualBlock(blockId) {
  if (!blockId) {
    throw new Error("blockId es requerido.");
  }

  const blockRef = doc(appointmentsColRef(), blockId);

  return runTransaction(db, async (tx) => {
    const blockSnap = await tx.get(blockRef);

    if (!blockSnap.exists()) {
      throw new Error("El bloqueo no existe.");
    }

    const block = blockSnap.data();

    if (block.type !== "block") {
      throw new Error("El registro no es un bloqueo.");
    }

    const dateKey = block.date;
    const occupiedSlots = Array.isArray(block.occupiedSlots)
      ? block.occupiedSlots
      : [];

    const slotRefs = occupiedSlots.map((slotId) => slotDocRef(dateKey, slotId));

    // Leer primero
    const slotSnaps = [];
    for (const ref of slotRefs) {
      const snap = await tx.get(ref);
      slotSnaps.push({ ref, snap });
    }

    // Escribir después
    for (const { ref, snap } of slotSnaps) {
      if (snap.exists()) {
        tx.update(ref, {
          available: true,
          appointmentId: deleteField(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    tx.update(blockRef, {
      status: "cancelled",
      updatedAt: serverTimestamp(),
    });

    return { blockId };
  });
}


export async function rescheduleAppointment({
  appointmentId,
  newDateKey,
  newStartTime,
}) {
  if (!appointmentId) {
    throw new Error("appointmentId es requerido.");
  }

  if (!newDateKey) {
    throw new Error("La nueva fecha es requerida.");
  }

  if (!newStartTime) {
    throw new Error("La nueva hora es requerida.");
  }

  const apptRef = doc(db, "appointments", appointmentId);

  return runTransaction(db, async (tx) => {
    const apptSnap = await tx.get(apptRef);

    if (!apptSnap.exists()) {
      throw new Error("La cita no existe.");
    }

    const appt = apptSnap.data();

    if (appt.type === "block") {
      throw new Error("No se puede reprogramar un bloqueo manual.");
    }

    if (appt.status === "cancelled") {
      throw new Error("No se puede reprogramar una cita cancelada.");
    }

    if (appt.status === "completed") {
      throw new Error("No se puede reprogramar una cita completada.");
    }

    const oldDateKey = appt.date;
    const oldOccupiedSlots = Array.isArray(appt.occupiedSlots)
      ? appt.occupiedSlots
      : [];

    const durationMin = Number(appt.durationMin || 0);
    if (!durationMin || durationMin <= 0) {
      throw new Error("La cita no tiene una duración válida.");
    }

    const settings = await getAgendaSettings();
    const stepMin = Number(settings.stepMin || 15);

    const newOccupiedTimes = buildOccupiedTimes(
      newStartTime,
      durationMin,
      stepMin
    );
    const newOccupiedSlotIds = newOccupiedTimes.map(toSlotId);

    const oldDayRef = dayDocRef(oldDateKey);
    const newDayRef = dayDocRef(newDateKey);

    const oldSlotRefs = oldOccupiedSlots.map((slotId) =>
      slotDocRef(oldDateKey, slotId)
    );

    const newSlotRefs = newOccupiedSlotIds.map((slotId) =>
      slotDocRef(newDateKey, slotId)
    );

    // -------- LECTURAS --------
    const oldDaySnap = await tx.get(oldDayRef);
    const newDaySnap = await tx.get(newDayRef);

    if (!oldDaySnap.exists()) {
      throw new Error("No existe la disponibilidad del día original.");
    }

    if (!newDaySnap.exists() || newDaySnap.data().open !== true) {
      throw new Error("El nuevo día está cerrado o no tiene disponibilidad.");
    }

    const oldSlotSnaps = [];
    for (const ref of oldSlotRefs) {
      const snap = await tx.get(ref);
      oldSlotSnaps.push({ ref, snap });
    }

    const newSlotSnaps = [];
    for (const ref of newSlotRefs) {
      const snap = await tx.get(ref);
      newSlotSnaps.push({ ref, snap });
    }

    // -------- VALIDACIONES --------

    const isSameExactSchedule =
      oldDateKey === newDateKey &&
      JSON.stringify(oldOccupiedSlots) === JSON.stringify(newOccupiedSlotIds);

    if (isSameExactSchedule) {
      throw new Error("La cita ya está programada en ese mismo horario.");
    }

    const oldSlotSet = new Set(oldOccupiedSlots);

    for (const { ref, snap } of newSlotSnaps) {
      if (!snap.exists()) {
        throw new Error("La nueva cita rebasa el horario disponible del día.");
      }

      const slotId = ref.id;
      const isOwnOldSlot = oldDateKey === newDateKey && oldSlotSet.has(slotId);

      if (!isOwnOldSlot && snap.data().available !== true) {
        throw new Error("Uno o más horarios del nuevo espacio ya están ocupados.");
      }
    }

    // -------- ESCRITURAS --------

    // liberar slots viejos
    for (const { ref, snap } of oldSlotSnaps) {
      if (snap.exists()) {
        tx.update(ref, {
          available: true,
          appointmentId: deleteField(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    // ocupar slots nuevos
    for (const { ref } of newSlotSnaps) {
      tx.update(ref, {
        available: false,
        appointmentId: appointmentId,
        updatedAt: serverTimestamp(),
      });
    }

    const startMin = minutesFromHHmm(newStartTime);
    const newEndTime = hhmmFromMinutes(startMin + durationMin);

    tx.update(apptRef, {
      date: newDateKey,
      startTime: newStartTime,
      endTime: newEndTime,
      slotId: toSlotId(newStartTime),
      occupiedSlots: newOccupiedSlotIds,
      status: "confirmed",
      updatedAt: serverTimestamp(),
    });

    return {
      appointmentId,
      oldDateKey,
      newDateKey,
      newStartTime,
      newEndTime,
      newOccupiedSlotIds,
    };
  });
}


export async function updateAppointmentData({
  appointmentId,
  clientName,
  clientPhone,
  note,
}) {
  if (!appointmentId) {
    throw new Error("appointmentId es requerido.");
  }

  const apptRef = doc(db, "appointments", appointmentId);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(apptRef);

    if (!snap.exists()) {
      throw new Error("La cita no existe.");
    }

    const data = snap.data();

    if (data.type === "block") {
      throw new Error("No se puede editar un bloqueo manual.");
    }

    if (data.status === "cancelled") {
      throw new Error("No se puede editar una cita cancelada.");
    }

    tx.update(apptRef, {
      clientName: String(clientName || "").trim(),
      clientPhone: String(clientPhone || "").trim(),
      note: String(note || "").trim(),
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  });
}


export function listenAllAppointments(callback) {
  return onSnapshot(appointmentsColRef(), (qs) => {
    const rows = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(rows);
  });
}