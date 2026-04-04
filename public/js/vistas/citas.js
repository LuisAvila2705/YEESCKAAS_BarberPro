// public/js/vistas/citas.js
import {
  validarTelefonoMX,
  limpiarTexto,
  hoyISO,
} from "../utilidades/validaciones.js";

import { getServiceById } from "../repos/servicesRepo.js";
import {
  listenAvailabilityDay,
  listenAppointmentsByDate,
  bookAppointment,
  ensureAvailabilityForDate,
} from "../repos/agendaRepo.js";

import { db } from "../firebase/firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import { getBusinessInfo } from "../repos/businessRepo.js";
import { buildBarberWhatsAppLink } from "../utils/whatsapp.js";


const MAX_DIAS_A_FUTURO = 45;
const MAIN_SERVICE_CANDIDATES = ["corte_con_cita", "corte_navaja"];
const EXTRA_SERVICE_IDS = ["barba", "ceja", "mascarilla"];
const BUFFER_MIN = 10;
const STEP_MIN = 15;

export async function vistaCitas() {
  const app = document.getElementById("app");

  let businessInfo = null;

try {
  businessInfo = await getBusinessInfo();
} catch (e) {
  console.error("No se pudo cargar info del negocio:", e);
}

  app.innerHTML = `
    <section class="citas-wrap">
      <div class="citas-shell">

        <div class="citas-hero">
          <div class="citas-head">
            <span class="citas-tag">Agenda en línea</span>
            <h1>Reserva tu espacio</h1>
            <p class="subtexto">
              Selecciona el servicio, la fecha y el horario disponible. Tu cita queda
              registrada y el barbero podrá verla en tiempo real.
            </p>

            <div class="citas-head-badges">
              <span>Confirmación por WhatsApp</span>
              <span>Disponibilidad en tiempo real</span>
              <span>Atención por cita</span>
            </div>
          </div>

          <aside class="citas-aside">
            <h3>Antes de confirmar</h3>

            <div class="citas-point">
              <strong>Servicio principal</strong>
              <span>La cita base se agenda con corte con cita, que incluye navaja y desvanecido.</span>
            </div>

            <div class="citas-point">
              <strong>Extras opcionales</strong>
              <span>Puedes agregar barba, ceja o mascarilla en la misma reserva.</span>
            </div>

            <div class="citas-point">
              <strong>Tiempo real</strong>
              <span>Solo se muestran horarios disponibles de acuerdo con la agenda activa.</span>
            </div>
          </aside>
        </div>

        <form id="formCita" class="tarjeta tarjeta-lg" novalidate>
          <div class="form-bloque">
            <h3 class="form-bloque-titulo">Datos del cliente</h3>

            <div class="grid">
              <div class="campo">
                <label for="nombre">Nombre y Apellido (EVITA CONFUSIONES)*</label>
                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  placeholder="Ej. Luis Ángel"
                  maxlength="60"
                  autocomplete="name"
                />
                <small class="error" data-error="nombre"></small>
              </div>

              <div class="campo">
                <label for="telefono">WhatsApp (IMPORTANTE COMO IDENTIFICADOR)*</label>
                <input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  placeholder="10 dígitos"
                  maxlength="10"
                  inputmode="numeric"
                  autocomplete="tel"
                />
                <small class="error" data-error="telefono"></small>
              </div>
            </div>
          </div>

          <div class="form-bloque">
            <h3 class="form-bloque-titulo">Servicio y agenda</h3>

            <div class="grid">
              <div class="campo">
                <label for="servicio">Servicio principal*</label>
                <select id="servicio" name="servicio">
                  <option value="">Cargando...</option>
                </select>
                <small class="hint">Incluye navaja y desvanecido.</small>
                <small class="error" data-error="servicio"></small>
              </div>

              <div id="bloqueFecha" class="campo">
                <label for="fecha">Fecha*</label>
                <input id="fecha" name="fecha" type="date" />
                <small class="hint">Puedes agendar hasta ${MAX_DIAS_A_FUTURO} días en adelante.</small>
                <small class="error" data-error="fecha"></small>
              </div>

              <div id="bloqueExtras" class="campo campo-full">
                <label>Extras opcionales</label>
                <div id="extrasGrid" class="extras-grid"></div>
              </div>

              <div id="bloqueHora" class="campo campo-full">
                <label>Hora*</label>

                <div class="horas-legend">
                  <span class="legend-item">
                    <i class="legend-dot is-free"></i>
                    Disponible
                  </span>
                  <span class="legend-item">
                    <i class="legend-dot is-busy"></i>
                    Ocupado
                  </span>
                  <span class="legend-item">
                    <i class="legend-dot is-preview"></i>
                    Tiempo que ocupará
                  </span>
                  <span class="legend-item">
                    <i class="legend-dot is-limit"></i>
                    Ya no alcanza
                  </span>
                </div>

                <div id="horasChips" class="horas-chips horas-empty">
                  <span class="horas-placeholder">Selecciona primero el servicio</span>
                </div>

                <input id="hora" name="hora" type="hidden" />
                <small class="error" data-error="hora"></small>
                <small id="horaEstado" class="hint"></small>
              </div>

              <div class="campo">
                <label for="nota">Nota (opcional)</label>
                <input
                  id="nota"
                  name="nota"
                  type="text"
                  placeholder="Ej. Pagare con tarjeta NU"
                  maxlength="120"
                  autocomplete="off"
                />
              </div>
            </div>
          </div>

          <div id="bloqueResumen" class="form-bloque">
            <h3 class="form-bloque-titulo">Resumen de la cita</h3>

            <div class="citas-summary">
  <div class="citas-summary-item">
    <span>Servicio</span>
    <strong id="summaryServicio">Sin seleccionar</strong>
  </div>

  <div class="citas-summary-item">
    <span>Extras</span>
    <strong id="summaryExtras">Ninguno</strong>
  </div>

  <div class="citas-summary-item">
    <span>Duración total</span>
    <strong id="summaryDuracion">—</strong>
  </div>

  <div class="citas-summary-item">
    <span>Hora estimada</span>
    <strong id="summaryHorario">—</strong>
  </div>

  <div class="citas-summary-item">
    <span>Total estimado</span>
    <strong id="summaryPrecio">—</strong>
  </div>
</div>
          </div>

          <div class="acciones-form">
            <button id="btnSubmit" class="boton" type="submit" disabled>Confirmar cita</button>
            <a class="boton boton-outline" href="#/">Volver</a>
          </div>

          <p id="mensajeOk" class="mensaje-ok" hidden>✅ Cita registrada. En breve te contactamos si aplica confirmación.</p>
          <p id="mensajeErr" class="mensaje-err" hidden>❌ Ocurrió un error al registrar la cita.</p>
        </form>

        <div class="citas-footer-band">
          <div>
            <strong>YEESCKAAS BARBER SHOP</strong>
            <span>Agenda tu cita y síguenos para ver más trabajos recientes.</span>
          </div>

          <div class="citas-footer-actions">
            <a href="https://www.instagram.com/yeesckaasbarbershop/" target="_blank" rel="noopener">Instagram</a>
            <a href="https://www.facebook.com/yeesckaasbarbershop" target="_blank" rel="noopener">Facebook</a>
            <a href="https://wa.me/528110063378" target="_blank" rel="noopener">WhatsApp</a>
          </div>
        </div>

      </div>
    </section>
  `;

  const inputNombre = document.getElementById("nombre");
  const inputTelefono = document.getElementById("telefono");
  const inputFecha = document.getElementById("fecha");
  const selServicio = document.getElementById("servicio");
  const extrasGrid = document.getElementById("extrasGrid");
  const horasChips = document.getElementById("horasChips");
  const inputHora = document.getElementById("hora");
  const inputNota = document.getElementById("nota");
  const form = document.getElementById("formCita");
  const btnSubmit = document.getElementById("btnSubmit");
  const ok = document.getElementById("mensajeOk");
  const err = document.getElementById("mensajeErr");
  const horaEstado = document.getElementById("horaEstado");

  const bloqueExtras = document.getElementById("bloqueExtras");
  const bloqueFecha = document.getElementById("bloqueFecha");
  const bloqueHora = document.getElementById("bloqueHora");
  const bloqueResumen = document.getElementById("bloqueResumen");

const summaryServicio = document.getElementById("summaryServicio");
const summaryExtras = document.getElementById("summaryExtras");
const summaryDuracion = document.getElementById("summaryDuracion");
const summaryHorario = document.getElementById("summaryHorario");
const summaryPrecio = document.getElementById("summaryPrecio");

  inputFecha.min = hoyISO();
  inputFecha.max = addDaysISO(hoyISO(), MAX_DIAS_A_FUTURO);

  const state = {
    mainService: null,
    extrasCatalog: [],
    agendaSettings: null,
    unsubscribeSlots: null,
    unsubscribeAppointments: null,
    selectedTime: "",
    daySlots: [],
    dayAppointments: [],
    occupancyMap: {},      // { "12:45": ["Corte con cita", "Barba"] }
    selectionConflict: null, // { type, message }
  };

  try {
    state.mainService = await getMainService();
    state.extrasCatalog = await getExtraServices();
    state.agendaSettings = await getAgendaSettings();

    selServicio.innerHTML = `
      <option value="">Selecciona...</option>
      <option value="${state.mainService.id}">
        ${state.mainService.nombre} ($${state.mainService.precio})
      </option>
    `;

    extrasGrid.innerHTML = state.extrasCatalog
      .map(
        (s) => `
          <label class="extra-chip">
            <input type="checkbox" name="extras" value="${s.id}" />
            <span>${s.nombre} (+$${s.precio})</span>
          </label>
        `
      )
      .join("");
  } catch (e) {
    console.error("Error cargando catálogo de servicios:", e);
    selServicio.innerHTML = `<option value="">Error cargando servicio</option>`;
    extrasGrid.innerHTML = `<span class="hint">No se pudieron cargar los extras.</span>`;
  }

  inputNombre.addEventListener("input", () => {
    inputNombre.value = inputNombre.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, "");
    ocultarMensajes();
    updateSubmitState();
  });

  inputTelefono.addEventListener("input", () => {
    inputTelefono.value = inputTelefono.value.replace(/\D/g, "").slice(0, 10);
    ocultarMensajes();
    updateSubmitState();
  });

  inputNota.addEventListener("input", ocultarMensajes);

  selServicio.addEventListener("change", () => {
    ocultarMensajes();
    resetSelectionVisualState();

    if (!selServicio.value) {
      inputFecha.value = "";
      stopDayListeners();
      renderHorasPlaceholder("Selecciona primero el servicio");
    } else if (!inputFecha.value) {
      renderHorasPlaceholder("Selecciona una fecha para ver horarios");
    } else {
      rerenderCurrentDay();
    }

    updateSummary();
    updateProgressiveFlow();
    updateSubmitState();
  });

  extrasGrid.addEventListener("change", () => {
    ocultarMensajes();
    updateSummary();

    if (inputFecha.value && state.daySlots.length) {
      rerenderCurrentDay();
    }

    updateProgressiveFlow();
    updateSubmitState();
  });

  inputFecha.addEventListener("change", async () => {
    ocultarMensajes();
    limpiarErrores();
    resetSelectionVisualState();
    updateProgressiveFlow();

    const dateKey = inputFecha.value;

    if (!dateKey) {
      stopDayListeners();
      renderHorasPlaceholder("Selecciona una fecha para ver horarios");
      updateSubmitState();
      return;
    }

    if (!selServicio.value) {
      renderHorasPlaceholder("Selecciona primero el servicio");
      updateSubmitState();
      return;
    }

    stopDayListeners();
    renderHorasPlaceholder("Cargando horarios...");

    try {
      await ensureAvailabilityForDate(dateKey);

      state.unsubscribeSlots = listenAvailabilityDay(dateKey, ({ open, slots }) => {
        state.daySlots = slots || [];
        rerenderCurrentDay(open);
      });

      state.unsubscribeAppointments = listenAppointmentsByDate(dateKey, (appointments) => {
        state.dayAppointments = appointments || [];
        state.occupancyMap = buildOccupancyMap(state.dayAppointments);
        rerenderCurrentDay();
      });
    } catch (e) {
      console.error("Error preparando disponibilidad:", e);
      renderHorasPlaceholder("No se pudo cargar disponibilidad");
    }

    updateSubmitState();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    ocultarMensajes();
    limpiarErrores();

    const nombre = limpiarTexto(inputNombre.value);
    const telefono = inputTelefono.value.trim();
    const servicioId = selServicio.value;
    const dateKey = inputFecha.value;
    const startTime = inputHora.value;
    const notaUsuario = limpiarTexto(inputNota.value);
    const extrasIds = getCheckedExtras();

    const errores = [];

    if (nombre.length < 2) {
      errores.push({ campo: "nombre", msg: "Escribe tu nombre completo (mínimo 2 letras)." });
    }

    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(nombre)) {
      errores.push({ campo: "nombre", msg: "El nombre solo debe contener letras y espacios." });
    }

    if (!validarTelefonoMX(telefono)) {
      errores.push({ campo: "telefono", msg: "Teléfono inválido (10 dígitos)." });
    }

    if (!servicioId) {
      errores.push({ campo: "servicio", msg: "Selecciona el servicio principal." });
    }

    if (!dateKey) {
      errores.push({ campo: "fecha", msg: "Selecciona una fecha." });
    }

    if (dateKey && dateKey < hoyISO()) {
      errores.push({ campo: "fecha", msg: "No puedes agendar en una fecha pasada." });
    }

    if (!startTime) {
      errores.push({ campo: "hora", msg: "Selecciona una hora disponible." });
    }

    if (state.selectionConflict) {
      errores.push({ campo: "hora", msg: state.selectionConflict.message });
    }

    if (errores.length) {
      mostrarErrores(errores);
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.textContent = "Guardando...";

    try {
      const main = state.mainService;
      const extrasSelected = state.extrasCatalog.filter((x) => extrasIds.includes(x.id));

      const totalDuration =
        Number(main?.duracion || 0) +
        extrasSelected.reduce((acc, x) => acc + Number(x.duracion || 0), 0);

      const totalPrice =
        Number(main?.precio || 0) +
        extrasSelected.reduce((acc, x) => acc + Number(x.precio || 0), 0);

      const serviceNameFinal = [
        main?.nombre || "Corte con cita",
        ...extrasSelected.map((x) => x.nombre),
      ].join(" + ");

      const notaFinal = [
        notaUsuario,
        extrasSelected.length ? `Extras: ${extrasSelected.map((x) => x.nombre).join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      await bookAppointment({
        dateKey,
        startTime,
        service: {
          id: main.id,
          nombre: serviceNameFinal,
          duracion: totalDuration,
          precio: totalPrice,
        },
        client: { name: nombre, phone: telefono },
        note: notaFinal,
        status: "confirmed",
      });

const horaFin = calcularHoraFin(startTime, totalDuration);
const fechaLegible = formatFechaMX(dateKey);


const confirmedAppointment = {
  clientName: nombre,
  clientPhone: telefono,
  date: dateKey,
  startTime,
  endTime: horaFin,
  serviceName: serviceNameFinal,
  notes: notaFinal,
};

const barberPhone = businessInfo?.whatsapp || "528110063378";

const whatsappLink = buildBarberWhatsAppLink(
  barberPhone,
  confirmedAppointment
);


ok.innerHTML = `
  <div class="cita-ok-box">
    <strong>✅ Cita confirmada. Toma evidencia de este mensaje para mayor respaldo.</strong><br>
    Servicio: ${serviceNameFinal}<br>
    Fecha: ${fechaLegible}<br>
    Horario: ${startTime} – ${horaFin}<br>
    Total: $${totalPrice}<br><br>

    <span style="font-weight:600;">
      Si necesitas cambiar tu cita, comunícate por WhatsApp.
    </span>

    <div class="cita-ok-actions" style="margin-top:12px;">
      <a
  href="${whatsappLink}"
  target="_blank"
  rel="noopener noreferrer"
  class="boton boton-outline"
>
  Contactar a la barbería por WhatsApp
</a>
    </div>
  </div>
`;
ok.hidden = false;


      form.reset();
      inputFecha.min = hoyISO();
      inputFecha.max = addDaysISO(hoyISO(), MAX_DIAS_A_FUTURO);

      stopDayListeners();
      state.daySlots = [];
      state.dayAppointments = [];
      state.occupancyMap = {};

      resetSelectionVisualState();
      renderHorasPlaceholder("Selecciona primero el servicio");
      updateSummary();
      updateProgressiveFlow();
      updateSubmitState();
    } catch (e2) {
      console.error("Error creando cita:", e2);
      err.hidden = false;

      if (String(e2?.message || "").includes("no está disponible")) {
        err.textContent = "❌ Ese horario ya fue tomado. Elige otro disponible.";
      } else {
        err.textContent = "❌ No se pudo registrar la cita. Intenta nuevamente.";
      }
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Confirmar cita";
      updateSubmitState();
    }
  });

  updateSummary();
  updateProgressiveFlow();
  updateSubmitState();

  function stopDayListeners() {
    if (state.unsubscribeSlots) {
      state.unsubscribeSlots();
      state.unsubscribeSlots = null;
    }
    if (state.unsubscribeAppointments) {
      state.unsubscribeAppointments();
      state.unsubscribeAppointments = null;
    }
  }

  function renderHorasPlaceholder(text) {
    horasChips.className = "horas-chips horas-empty";
    horasChips.innerHTML = `<span class="horas-placeholder">${text}</span>`;
    horaEstado.textContent = "";
    state.selectionConflict = null;
  }

  function clearSelectedTime() {
    state.selectedTime = "";
    inputHora.value = "";
  }

  function resetSelectionVisualState() {
    clearSelectedTime();
    state.selectionConflict = null;
    horaEstado.textContent = "";
  }

  function rerenderCurrentDay(forcedOpen = null) {
    const open = forcedOpen ?? inferOpenFromSlotsOrSettings();
    renderHorasChips(state.daySlots, open);
    refreshPreviewChips();
    updateSubmitState();
  }

  function inferOpenFromSlotsOrSettings() {
    if (state.daySlots.length > 0) return true;
    const close = getDayClosingTime(inputFecha.value);
    return !!close;
  }

  function renderHorasChips(slots, open) {
    state.daySlots = slots || [];

    if (!open) {
      renderHorasPlaceholder("Día cerrado");
      return;
    }

    const allSlots = slots || [];
    if (!allSlots.length) {
      renderHorasPlaceholder("Sin horarios configurados para este día");
      return;
    }

    const totalDuration = getCurrentTotalDuration();
    const dateKey = inputFecha.value;

    horasChips.className = "horas-chips";
    horasChips.innerHTML = allSlots
      .map((s) => {
        const isFree = s.available === true;
        const occupiedBy = state.occupancyMap[s.time] || [];
        const occupiedReason = occupiedBy.length
          ? `Ocupado: ${occupiedBy.join(" / ")}`
          : "Horario ocupado";

        const fits = isFree && totalDuration > 0
          ? slotFitsBeforeClose(s.time, totalDuration, dateKey, BUFFER_MIN)
          : false;

        let chipClass = "is-busy";
        let chipLabel = `Horario ocupado ${s.time}`;
        let title = occupiedReason;
        let disabledAttr = 'disabled';

        if (isFree && fits) {
          chipClass = "is-free";
          chipLabel = `Seleccionar horario ${s.time}`;
          title = "Disponible";
          disabledAttr = "";
        } else if (isFree && !fits) {
          chipClass = "is-limit";
          chipLabel = `Horario fuera de rango ${s.time}`;
          title = "Este horario ya no alcanza antes del cierre";
          disabledAttr = 'disabled';
        }

        return `
          <button
            type="button"
            class="hora-chip ${chipClass}"
            data-time="${s.time}"
            aria-label="${chipLabel}"
            title="${escapeHtml(title)}"
            ${disabledAttr}
          >
            ${s.time}
          </button>
        `;
      })
      .join("");

    horasChips.querySelectorAll(".hora-chip.is-free, .hora-chip.is-limit").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sameSelected = state.selectedTime === btn.dataset.time;

    // si vuelve a dar click al mismo, deselecciona
    if (sameSelected) {
      horasChips.querySelectorAll(".hora-chip").forEach((b) => {
        b.classList.remove("is-selected", "is-preview", "is-conflict");
      });

      state.selectedTime = "";
      inputHora.value = "";
      state.selectionConflict = null;
      horaEstado.textContent = "";

      ocultarMensajes();
      limpiarErrores();
      refreshPreviewChips();
      updateSummary();
      updateSubmitState();
      return;
    }

    horasChips.querySelectorAll(".hora-chip").forEach((b) => {
      b.classList.remove("is-selected", "is-preview", "is-conflict");
    });

    btn.classList.add("is-selected");

    state.selectedTime = btn.dataset.time;
    inputHora.value = btn.dataset.time;

    ocultarMensajes();
    limpiarErrores();
    refreshPreviewChips();
    updateSummary();
    updateSubmitState();
  });
});
  }

  function getCurrentTotalDuration() {
    const hasMain = !!selServicio.value && !!state.mainService;
    if (!hasMain) return 0;

    const extrasIds = getCheckedExtras();
    const extrasSelected = (state.extrasCatalog || []).filter((x) => extrasIds.includes(x.id));

    return (
      Number(state.mainService?.duracion || 0) +
      extrasSelected.reduce((acc, x) => acc + Number(x.duracion || 0), 0)
    );
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

  function calcularHoraFin(startTime, durationMin) {
  if (!startTime || !durationMin) return "—";

  const startMin = minutesFromHHmm(startTime);
  const endMin = startMin + Number(durationMin || 0);

  return hhmmFromMinutes(endMin);
}

  function getPreviewTimes(startTime, totalDuration, stepMin = STEP_MIN) {
    if (!startTime || !totalDuration) return [];
    const startMin = minutesFromHHmm(startTime);
    const slotsNeeded = Math.ceil(totalDuration / stepMin);

    const times = [];
    for (let i = 0; i < slotsNeeded; i++) {
      times.push(hhmmFromMinutes(startMin + i * stepMin));
    }
    return times;
  }

  function getWeekdayKeyFromDateInput(dateKey) {
    if (!dateKey) return null;
    const [y, m, d] = dateKey.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const day = dt.getDay();
    return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][day];
  }

  function getDayClosingTime(dateKey) {
    const weekdayKey = getWeekdayKeyFromDateInput(dateKey);
    const hours = state.agendaSettings?.hours || {};
    const rule = hours[weekdayKey];
    if (!rule || !rule.end) return null;
    return rule.end;
  }

  function slotFitsBeforeClose(startTime, totalDuration, dateKey, bufferMin = BUFFER_MIN) {
    const closeTime = getDayClosingTime(dateKey);
    if (!closeTime) return false;

    const startMin = minutesFromHHmm(startTime);
    const closeMin = minutesFromHHmm(closeTime);

    return startMin + totalDuration + bufferMin <= closeMin;
  }

  function buildOccupancyMap(appointments) {
    const map = {};

    for (const appt of appointments || []) {
      const startTime = appt.startTime;
      const duration = Number(appt.durationMin || 0);
      const serviceName = appt.serviceName || "Cita ocupando agenda";

      if (!startTime || !duration) continue;

      const times = getPreviewTimes(startTime, duration, STEP_MIN);

      for (const time of times) {
        if (!map[time]) map[time] = [];
        map[time].push(serviceName);
      }
    }

    return map;
  }

function refreshPreviewChips() {
  horasChips.querySelectorAll(".hora-chip").forEach((chip) => {
    chip.classList.remove("is-preview", "is-conflict");
  });

  state.selectionConflict = null;
  horaEstado.textContent = "";

  const selectedTime = inputHora.value;
  const totalDuration = getCurrentTotalDuration();
  const dateKey = inputFecha.value;

  if (!selectedTime || !totalDuration) return;

  const previewTimes = getPreviewTimes(selectedTime, totalDuration, STEP_MIN);

  let hasOccupiedConflict = false;

  for (const [idx, time] of previewTimes.entries()) {
    const chip = horasChips.querySelector(`.hora-chip[data-time="${time}"]`);

    if (!chip) {
      state.selectionConflict = {
        type: "close",
        message: "Ese horario no alcanza a terminar antes del cierre.",
      };
      horaEstado.textContent = state.selectionConflict.message;
      return;
    }

    if (idx === 0) {
      chip.classList.add("is-selected");
    } else {
      chip.classList.add("is-preview");
    }

    // solo rojo = conflicto real
    if (chip.classList.contains("is-busy")) {
      hasOccupiedConflict = true;
      chip.classList.add("is-conflict");
    }
  }

  // validar cierre SOLO con hora inicial
  const startFits = slotFitsBeforeClose(selectedTime, totalDuration, dateKey, BUFFER_MIN);

  if (hasOccupiedConflict) {
    state.selectionConflict = {
      type: "occupied",
      message: "Ese horario no permite completar el servicio porque se empalma con otra cita.",
    };
    horaEstado.textContent = state.selectionConflict.message;
    return;
  }

  if (!startFits) {
    state.selectionConflict = {
      type: "close",
      message: "Ese horario no alcanza a terminar antes del cierre.",
    };
    horaEstado.textContent = state.selectionConflict.message;
    return;
  }

  // si todo está bien, mostrar feedback positivo
  const closeTime = getDayClosingTime(dateKey);
  state.selectionConflict = null;
  horaEstado.textContent = `Horario válido. Tu servicio terminaría dentro del horario de atención${closeTime ? ` (cierre ${closeTime})` : ""}.`;
}

function updateSubmitState() {
  const nombreOk =
    inputNombre.value.trim().length >= 2 &&
    /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/.test(inputNombre.value.trim());

  const telOk = validarTelefonoMX(inputTelefono.value.trim());
  const servicioOk = !!selServicio.value;
  const fechaOk = !!inputFecha.value;
  const horaOk = !!inputHora.value;
  const noConflict = !state.selectionConflict;

  const enabled = nombreOk && telOk && servicioOk && fechaOk && horaOk && noConflict;

  btnSubmit.disabled = !enabled;

  if (enabled) {
    btnSubmit.title = "Todo listo para confirmar la cita";
    return;
  }

  if (!nombreOk) {
    btnSubmit.title = "Completa correctamente el nombre";
    return;
  }

  if (!telOk) {
    btnSubmit.title = "Completa correctamente el teléfono";
    return;
  }

  if (!servicioOk) {
    btnSubmit.title = "Selecciona el servicio principal";
    return;
  }

  if (!fechaOk) {
    btnSubmit.title = "Selecciona una fecha";
    return;
  }

  if (!horaOk) {
    btnSubmit.title = "Selecciona una hora";
    return;
  }

  if (!noConflict) {
    btnSubmit.title = state.selectionConflict.message;
    return;
  }
}

function updateSummary() {
  const hasMain = !!selServicio.value && !!state.mainService;
  const extrasIds = getCheckedExtras();
  const extrasSelected = (state.extrasCatalog || []).filter((x) => extrasIds.includes(x.id));

  if (!hasMain) {
    summaryServicio.textContent = "Sin seleccionar";
    summaryExtras.textContent = extrasSelected.length
      ? extrasSelected.map((x) => x.nombre).join(", ")
      : "Ninguno";
    summaryDuracion.textContent = "—";
    summaryHorario.textContent = "—";
    summaryPrecio.textContent = "—";
    return;
  }

  const totalDuration =
    Number(state.mainService?.duracion || 0) +
    extrasSelected.reduce((acc, x) => acc + Number(x.duracion || 0), 0);

  const totalPrice =
    Number(state.mainService?.precio || 0) +
    extrasSelected.reduce((acc, x) => acc + Number(x.precio || 0), 0);

  const horaInicio = inputHora.value || "";
  const horaFin = horaInicio ? calcularHoraFin(horaInicio, totalDuration) : "";

  summaryServicio.textContent = state.mainService.nombre;
  summaryExtras.textContent = extrasSelected.length
    ? extrasSelected.map((x) => x.nombre).join(", ")
    : "Ninguno";
  summaryDuracion.textContent = `${totalDuration} min`;
  summaryHorario.textContent = horaInicio ? `${horaInicio} – ${horaFin}` : "Pendiente";
  summaryPrecio.textContent = `$${totalPrice}`;
}

  function updateProgressiveFlow() {
    const servicioOk = !!selServicio.value;
    const fechaOk = !!inputFecha.value;
    const hasResumen = servicioOk || getCheckedExtras().length > 0;

    toggleBlock(bloqueExtras, servicioOk);
    toggleBlock(bloqueFecha, servicioOk);
    toggleBlock(bloqueHora, servicioOk && fechaOk);
    toggleBlock(bloqueResumen, hasResumen);

    if (!servicioOk) {
      renderHorasPlaceholder("Selecciona primero el servicio");
    }

    bloqueFecha?.classList.toggle("campo-next-step", servicioOk && !fechaOk);
    bloqueHora?.classList.toggle("campo-next-step", servicioOk && fechaOk && !inputHora.value);
  }

  function toggleBlock(el, show) {
    if (!el) return;
    el.classList.toggle("is-hidden-flow", !show);
  }

  function ocultarMensajes() {
    ok.hidden = true;
    err.hidden = true;
  }
}

async function getMainService() {
  for (const id of MAIN_SERVICE_CANDIDATES) {
    try {
      const s = await getServiceById(id);
      if (s && s.activo !== false) return s;
    } catch {}
  }
  throw new Error("No se encontró el servicio principal de corte con cita.");
}

async function getExtraServices() {
  const result = [];
  for (const id of EXTRA_SERVICE_IDS) {
    try {
      const s = await getServiceById(id);
      if (s && s.activo !== false) result.push(s);
    } catch {}
  }
  return result;
}

async function getAgendaSettings() {
  const snap = await getDoc(doc(db, "settings", "agenda"));
  if (!snap.exists()) throw new Error("No existe settings/agenda");
  return snap.data();
}

function getCheckedExtras() {
  return [...document.querySelectorAll('input[name="extras"]:checked')].map((el) => el.value);
}

function limpiarErrores() {
  document.querySelectorAll(".error").forEach((e) => {
    e.textContent = "";
  });
}

function mostrarErrores(errores) {
  for (const er of errores) {
    const el = document.querySelector(`[data-error="${er.campo}"]`);
    if (el) el.textContent = er.msg;
  }
}

function addDaysISO(baseISO, daysToAdd) {
  const [y, m, d] = baseISO.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + daysToAdd);

  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");

  return `${yy}-${mm}-${dd}`;
}

function formatFechaMX(dateKey) {
  if (!dateKey) return "";

  const [y, m, d] = dateKey.split("-");
  return `${d}/${m}/${y}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}