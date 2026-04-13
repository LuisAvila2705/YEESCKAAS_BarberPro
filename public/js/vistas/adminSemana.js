import { listenAppointmentsByDate } from "../repos/agendaRepo.js";
import { toDateKey } from "../utils/format.js";

const HOURS = [
  "10:00", "10:30",
  "11:00", "11:30",
  "12:00", "12:30",
  "13:00", "13:30",
  "14:00", "14:30",
  "15:00", "15:30",
  "16:00", "16:30",
  "17:00", "17:30",
  "18:00", "18:30",
  "19:00", "19:30",
];

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function getMonday(baseDate = new Date()) {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addWeeks(date, weeks) {
  return addDays(date, weeks * 7);
}

function buildWeekDays(baseDate = new Date(), weekOffset = 0) {
  const monday = getMonday(addWeeks(baseDate, weekOffset));
  return Array.from({ length: 6 }, (_, i) => addDays(monday, i)).map(
    (date, index) => ({
      index,
      name: DAY_NAMES[index],
      date,
      dateKey: toDateKey(date),
    })
  );
}

function formatDateShort(date) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getWeekRangeLabel(weekDays) {
  if (!weekDays.length) return "";
  const first = weekDays[0].date;
  const last = weekDays[weekDays.length - 1].date;
  return `${formatDateShort(first)} al ${formatDateShort(last)}`;
}

function shortLabel(row) {
  if (row.type === "block") return "Bloqueo";
  return row.clientName || "Cita";
}

function getCellClass(row) {
  if (!row) return "is-free";
  if (row.type === "block") return "is-blocked";
  if (row.status === "completed") return "is-completed";
  if (row.status === "cancelled") return "is-cancelled";
  if (row.status === "pending") return "is-pending";
  if (row.status === "no_show") return "is-no-show";
  return "is-confirmed";
}

function buildWeekMap(weekRowsByDay) {
  const map = {};

  for (const [dateKey, rows] of Object.entries(weekRowsByDay)) {
    map[dateKey] = {};

    for (const row of rows) {
      const start = row.startTime;
      if (!start) continue;
      map[dateKey][start] = row;
    }
  }

  return map;
}

function renderWeeklyGrid(weekDays, weekRowsByDay) {
  const weekMap = buildWeekMap(weekRowsByDay);

  return `
    <div class="admin-week-grid-wrap">
      <table class="admin-week-grid">
        <thead>
          <tr>
            <th>Hora</th>
            ${weekDays
              .map(
                (day) => `
                  <th>
                    <div class="week-day-head">
                      <strong>${day.name}</strong>
                      <span>${day.dateKey}</span>
                    </div>
                  </th>
                `
              )
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${HOURS.map((hour) => {
            return `
              <tr>
                <td class="week-hour-cell">${hour}</td>
                ${weekDays
                  .map((day) => {
                    const row = weekMap[day.dateKey]?.[hour] || null;
                    return `
                      <td class="week-cell ${getCellClass(row)}">
                        ${
                          row
                            ? `
                              <div class="week-cell-content">
                                <strong>${shortLabel(row)}</strong>
                                <span>${row.serviceName || row.note || "—"}</span>
                              </div>
                            `
                            : `<span class="week-free">Libre</span>`
                        }
                      </td>
                    `;
                  })
                  .join("")}
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function clearWeekListeners() {
  if (window.__unsubAdminWeek && Array.isArray(window.__unsubAdminWeek)) {
    window.__unsubAdminWeek.forEach((fn) => fn && fn());
  }
  window.__unsubAdminWeek = [];
}

export function vistaAdminSemana() {
  const app = document.getElementById("app");
  let weekOffset = 0;

  clearWeekListeners();

  app.innerHTML = `
    <section class="contenedor seccion admin-page">
      <div class="seccion-head admin-head">
        <div>
          <h1>Agenda semanal</h1>
          <p class="muted">
            Vista general de la semana para identificar disponibilidad, citas y bloqueos.
          </p>
        </div>
      </div>

      <div class="panel admin-week-panel">
        <div class="admin-week-toolbar">
          <div class="admin-week-nav">
            <button id="btnPrevWeek" class="boton boton-outline" type="button">
              Semana anterior
            </button>
            <button id="btnCurrentWeek" class="boton boton-outline" type="button">
              Semana actual
            </button>
            <button id="btnNextWeek" class="boton boton-outline" type="button">
              Semana siguiente
            </button>
          </div>

          <div class="admin-week-range">
            <strong>Semana visible:</strong>
            <span id="adminWeekRangeLabel">—</span>
          </div>
        </div>

        <div class="admin-week-legend">
          <span><i class="legend-box is-free"></i> Libre</span>
          <span><i class="legend-box is-confirmed"></i> Confirmada</span>
          <span><i class="legend-box is-pending"></i> Pendiente</span>
          <span><i class="legend-box is-completed"></i> Completada</span>
          <span><i class="legend-box is-blocked"></i> Bloqueo</span>
        </div>

        <div id="adminWeekWrap">
          <p class="muted">Cargando agenda semanal...</p>
        </div>
      </div>
    </section>
  `;

  const wrap = document.getElementById("adminWeekWrap");
  const rangeLabel = document.getElementById("adminWeekRangeLabel");
  const btnPrevWeek = document.getElementById("btnPrevWeek");
  const btnCurrentWeek = document.getElementById("btnCurrentWeek");
  const btnNextWeek = document.getElementById("btnNextWeek");

  function loadWeek() {
    clearWeekListeners();

    const weekDays = buildWeekDays(new Date(), weekOffset);
    const weekRowsByDay = {};

    rangeLabel.textContent = getWeekRangeLabel(weekDays);
    wrap.innerHTML = `<p class="muted">Cargando agenda semanal...</p>`;

    function repaint() {
      wrap.innerHTML = renderWeeklyGrid(weekDays, weekRowsByDay);
    }

    window.__unsubAdminWeek = weekDays.map((day) =>
      listenAppointmentsByDate(day.dateKey, (rows) => {
        weekRowsByDay[day.dateKey] = rows || [];
        repaint();
      })
    );
  }

  btnPrevWeek.addEventListener("click", () => {
    weekOffset -= 1;
    loadWeek();
  });

  btnCurrentWeek.addEventListener("click", () => {
    weekOffset = 0;
    loadWeek();
  });

  btnNextWeek.addEventListener("click", () => {
    weekOffset += 1;
    loadWeek();
  });

  loadWeek();
}