// public/js/vistas/admin.js
import {
  listenAppointmentsByDate,
  listenAllAppointments,
  updateAppointmentStatus,
  cancelAppointment,
  createManualBlock,
  ensureAvailabilityForDate,
  removeManualBlock,
  rescheduleAppointment,
  updateAppointmentData,
} from "../repos/agendaRepo.js";

import { toDateKey } from "../utils/format.js";
import { buildWhatsAppLink } from "../utils/whatsapp.js";

const ESTADOS = [
  { value: "all", label: "Todas" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "completed", label: "Completadas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "pending", label: "Pendientes" },
  { value: "no_show", label: "No asistió" },
  { value: "blocked", label: "Bloqueos" },
];

function currency(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function getStatusLabel(status) {
  const map = {
    confirmed: "Confirmada",
    completed: "Completada",
    cancelled: "Cancelada",
    pending: "Pendiente",
    no_show: "No asistió",
    blocked: "Bloqueado",
  };
  return map[status] || status || "Sin estado";
}

function getStatusClass(status) {
  const map = {
    confirmed: "is-confirmed",
    completed: "is-completed",
    cancelled: "is-cancelled",
    pending: "is-pending",
    no_show: "is-no-show",
    blocked: "is-default",
  };
  return map[status] || "is-default";
}

function normalizeRows(rows) {
  return rows.map((row) => {
    const isBlock = row.type === "block";
    const extras = safeArray(row.extras || row.extraServices || []);
    const extrasNames = extras
      .map((e) => e?.name || e?.serviceName || e)
      .filter(Boolean);

    const serviceName =
      row.serviceName ||
      row.mainServiceName ||
      row.service?.name ||
      "Servicio";

    const clientName =
      row.clientName ||
      row.customerName ||
      row.name ||
      "Cliente";

    let clientPhone =
  row.clientPhone ||
  row.phone ||
  row.whatsapp ||
  "";

clientPhone = String(clientPhone).replace(/\D/g, ""); // solo números

if (clientPhone.length === 10) {
  clientPhone = clientPhone;
} else {
  clientPhone = "—";
}

    const totalPrice =
      Number(row.totalPrice ?? row.price ?? row.estimatedPrice ?? 0) || 0;

    return {
      ...row,
      isBlock,
      extrasNames,
      serviceName,
      clientName,
      clientPhone,
      totalPrice,
      startTime: row.startTime || "--:--",
      endTime: row.endTime || "—",
      durationMin: Number(row.durationMin ?? row.duration ?? 0) || 0,
      slotId: row.slotId || "—",
      status: row.status || (isBlock ? "blocked" : "pending"),
      notes: row.notes || row.note || "",
      date: row.date || "—",
    };
  });
}

function filterRows(rows, statusFilter) {
  if (!statusFilter || statusFilter === "all") return rows;
  return rows.filter((row) => row.status === statusFilter);
}

function buildSummary(rows) {
  const activeRows = rows.filter(
    (r) => r.status !== "cancelled" && !r.isBlock
  );

  const completedRows = rows.filter((r) => r.status === "completed");
  const cancelledRows = rows.filter((r) => r.status === "cancelled");
  const noShowRows = rows.filter((r) => r.status === "no_show");
  const blockedRows = rows.filter((r) => r.isBlock);

  const totalAppointments = rows.filter((r) => !r.isBlock).length;

  const totalMinutes = activeRows.reduce(
    (acc, row) => acc + (row.durationMin || 0),
    0
  );

  const estimatedIncome = activeRows.reduce(
    (acc, row) => acc + (row.totalPrice || 0),
    0
  );

  const WORK_MINUTES = 540;
  const freeMinutes = Math.max(WORK_MINUTES - totalMinutes, 0);
  const occupation =
    WORK_MINUTES > 0 ? Math.round((totalMinutes / WORK_MINUTES) * 100) : 0;

  return {
    totalAppointments,
    totalMinutes,
    freeMinutes,
    estimatedIncome,
    completedCount: completedRows.length,
    cancelledCount: cancelledRows.length,
    noShowCount: noShowRows.length,
    blockedCount: blockedRows.length,
    occupation,
  };
}

function renderSummary(rows) {
  const s = buildSummary(rows);

  return `
    <div class="admin-summary-grid">
      <article class="admin-summary-card">
        <span class="admin-summary-label">Citas</span>
        <strong class="admin-summary-value">${s.totalAppointments}</strong>
      </article>

      <article class="admin-summary-card">
        <span class="admin-summary-label">Tiempo ocupado</span>
        <strong class="admin-summary-value">${s.totalMinutes} min</strong>
      </article>

      <article class="admin-summary-card">
        <span class="admin-summary-label">Tiempo libre</span>
        <strong class="admin-summary-value">${s.freeMinutes} min</strong>
      </article>

      <article class="admin-summary-card">
        <span class="admin-summary-label">Ingreso estimado</span>
        <strong class="admin-summary-value">${currency(s.estimatedIncome)}</strong>
      </article>

      <article class="admin-summary-card">
        <span class="admin-summary-label">Completadas</span>
        <strong class="admin-summary-value">${s.completedCount}</strong>
      </article>

      <article class="admin-summary-card">
        <span class="admin-summary-label">Canceladas</span>
        <strong class="admin-summary-value">${s.cancelledCount}</strong>
      </article>

      <article class="admin-summary-card">
        <span class="admin-summary-label">No asistieron</span>
        <strong class="admin-summary-value">${s.noShowCount}</strong>
      </article>

      <article class="admin-summary-card">
        <span class="admin-summary-label">Bloqueos</span>
        <strong class="admin-summary-value">${s.blockedCount}</strong>
      </article>

      <article class="admin-summary-card">
        <span class="admin-summary-label">Ocupación</span>
        <strong class="admin-summary-value">${s.occupation}%</strong>
      </article>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="panel admin-empty">
      <p class="muted">No hay registros para los filtros seleccionados.</p>
    </div>
  `;
}

function renderAppointmentCard(a) {
  const extrasText = a.extrasNames.length
    ? a.extrasNames.join(", ")
    : "Sin extras";

  const title = a.isBlock ? "Bloqueo de horario" : a.clientName;
  const serviceTitle = a.isBlock ? "Horario bloqueado" : a.serviceName;
  const noteText = a.isBlock ? (a.notes || "Bloqueo manual") : null;

  return `
    <article class="panel admin-card" data-id="${a.id}">
      <div class="admin-card-time">
        <strong>${a.startTime}</strong>
        <span>${a.endTime !== "—" ? `a ${a.endTime}` : "Horario asignado"}</span>
      </div>

      <div class="admin-card-main">
        <div class="admin-card-top">
          <h3>${title}</h3>
          <span class="admin-badge ${getStatusClass(a.status)}">
            ${getStatusLabel(a.status)}
          </span>
        </div>

        <p class="admin-service-line">
          <strong>${serviceTitle}</strong>
          ${
            !a.isBlock && a.extrasNames.length
              ? `<span class="muted"> + ${extrasText}</span>`
              : ""
          }
        </p>

        ${
          a.isBlock
            ? `<p class="muted admin-block-reason">Motivo: ${noteText}</p>`
            : ""
        }

        <div class="admin-meta">
  ${
    a.isBlock
      ? `<span>Tipo: Bloqueo manual</span>`
      : `<span>Tel: ${a.clientPhone}</span>`
  }
  <span>Duración: ${a.durationMin || "—"} min</span>
  <span>Slot: ${a.slotId}</span>
  ${
    a.isBlock
      ? `<span>Total: No aplica</span>`
      : `<span>Total: ${currency(a.totalPrice)}</span>`
  }
</div>
      </div>

      <div class="admin-card-actions">
  <button
    type="button"
    class="boton boton-outline btn-admin-detail"
    data-action="detail"
    data-id="${a.id}"
  >
    Ver detalle
  </button>

  ${
    !a.isBlock
      ? `
        <a
          href="${buildWhatsAppLink(a.clientPhone, a, "reminder")}"
          target="_blank"
          rel="noopener noreferrer"
          class="boton boton-outline btn-admin-whatsapp"
        >
          WhatsApp
        </a>
      `
      : ""
  }

  ${
    a.isBlock
      ? `
        <button
          type="button"
          class="boton boton-outline btn-admin-unblock"
          data-action="unblock"
          data-id="${a.id}"
        >
          Desbloquear
        </button>
      `
      : a.status !== "completed" && a.status !== "cancelled"
      ? `
        <button
          type="button"
          class="boton btn-admin-complete"
          data-action="complete"
          data-id="${a.id}"
        >
          Completar
        </button>

        <button
          type="button"
          class="boton boton-outline btn-admin-pending"
          data-action="pending"
          data-id="${a.id}"
        >
          Pendiente
        </button>

        <button
          type="button"
          class="boton boton-outline btn-admin-no-show"
          data-action="no_show"
          data-id="${a.id}"
        >
          No asistió
        </button>

        <button
          type="button"
          class="boton boton-outline btn-admin-reschedule"
          data-action="reschedule"
          data-id="${a.id}"
        >
          Reprogramar
        </button>

        <button
          type="button"
          class="boton boton-outline btn-admin-edit"
          data-action="edit"
          data-id="${a.id}"
        >
          Editar
        </button>

        <button
          type="button"
          class="boton boton-outline btn-admin-cancel"
          data-action="cancel"
          data-id="${a.id}"
        >
          Cancelar
        </button>
      `
      : ""
  }
</div>

    </article>
  `;
}

function renderRescheduleModal(appointment) {
  return `
    <div class="admin-modal-backdrop" id="adminRescheduleBackdrop">
      <div class="admin-modal panel admin-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="adminRescheduleTitle">
        <div class="admin-modal-head">
          <div>
            <h3 id="adminRescheduleTitle">Reprogramar cita</h3>
            <p class="muted">Selecciona la nueva fecha y hora para esta cita.</p>
          </div>
          <button type="button" class="admin-modal-close" id="adminRescheduleClose" aria-label="Cerrar">×</button>
        </div>

        <div class="admin-detail-grid">
          <div class="admin-detail-item">
            <span>Cliente</span>
            <strong>${appointment.clientName}</strong>
          </div>

          <div class="admin-detail-item">
            <span>Servicio</span>
            <strong>${appointment.serviceName}</strong>
          </div>

          <div class="admin-detail-item">
            <span>Nueva fecha</span>
            <input id="rescheduleDate" type="date" value="${appointment.date || ""}" />
          </div>

          <div class="admin-detail-item">
            <span>Nueva hora</span>
            <input id="rescheduleTime" type="time" step="900" value="${appointment.startTime || "11:00"}" />
          </div>
        </div>

        <div class="admin-confirm-actions">
          <button type="button" class="boton boton-outline" id="adminRescheduleCancel">
            Cancelar
          </button>
          <button type="button" class="boton" id="adminRescheduleSave">
            Guardar cambio
          </button>
        </div>
      </div>
    </div>
  `;
}

function askRescheduleData(modalRoot, appointment) {
  return new Promise((resolve) => {
    modalRoot.innerHTML = renderRescheduleModal(appointment);

    const backdrop = document.getElementById("adminRescheduleBackdrop");
    const btnClose = document.getElementById("adminRescheduleClose");
    const btnCancel = document.getElementById("adminRescheduleCancel");
    const btnSave = document.getElementById("adminRescheduleSave");
    const dateEl = document.getElementById("rescheduleDate");
    const timeEl = document.getElementById("rescheduleTime");

    const close = (result = null) => {
      modalRoot.innerHTML = "";
      resolve(result);
    };

    btnClose?.addEventListener("click", () => close(null));
    btnCancel?.addEventListener("click", () => close(null));

    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) close(null);
    });

    btnSave?.addEventListener("click", () => {
      const payload = {
        newDateKey: dateEl?.value,
        newStartTime: timeEl?.value,
      };

      if (!payload.newDateKey || !payload.newStartTime) return;
      close(payload);
    });
  });
}

function renderAppointments(rows) {
  if (!rows.length) return renderEmptyState();

  return `
    <div class="admin-list">
      ${rows.map(renderAppointmentCard).join("")}
    </div>
  `;
}

function renderDetailModal(appointment) {
  const extrasText = appointment.extrasNames.length
    ? appointment.extrasNames.join(", ")
    : "Sin extras";

  return `
    <div class="admin-modal-backdrop" id="adminModalBackdrop">
      <div class="admin-modal panel" role="dialog" aria-modal="true" aria-labelledby="adminModalTitle">
        <div class="admin-modal-head">
          <div>
            <h3 id="adminModalTitle">${
              appointment.isBlock ? "Detalle del bloqueo" : "Detalle de la cita"
            }</h3>
            <p class="muted">Consulta completa del registro seleccionado.</p>
          </div>
          <button type="button" class="admin-modal-close" id="adminModalClose" aria-label="Cerrar">×</button>
        </div>

        <div class="admin-detail-grid">
          <div class="admin-detail-item">
            <span>${appointment.isBlock ? "Registro" : "Cliente"}</span>
            <strong>${appointment.isBlock ? "Bloqueo manual" : appointment.clientName}</strong>
          </div>

          <div class="admin-detail-item">
            <span>${appointment.isBlock ? "Tipo" : "Teléfono"}</span>
            <strong>${appointment.isBlock ? "Bloqueo de agenda" : appointment.clientPhone}</strong>
          </div>

          <div class="admin-detail-item">
            <span>Servicio principal</span>
            <strong>${appointment.isBlock ? "Horario bloqueado" : appointment.serviceName}</strong>
          </div>

          <div class="admin-detail-item">
            <span>Extras</span>
            <strong>${appointment.isBlock ? "No aplica" : extrasText}</strong>
          </div>

          <div class="admin-detail-item">
            <span>Fecha</span>
            <strong>${appointment.date || "—"}</strong>
          </div>

          <div class="admin-detail-item">
            <span>Horario</span>
            <strong>${appointment.startTime} - ${appointment.endTime}</strong>
          </div>

          <div class="admin-detail-item">
            <span>Duración</span>
            <strong>${appointment.durationMin} min</strong>
          </div>

          <div class="admin-detail-item">
            <span>Total estimado</span>
            <strong>${currency(appointment.totalPrice)}</strong>
          </div>

          <div class="admin-detail-item">
            <span>Estado</span>
            <strong>${getStatusLabel(appointment.status)}</strong>
          </div>

          <div class="admin-detail-item">
            <span>Slot</span>
            <strong>${appointment.slotId}</strong>
          </div>
        </div>

        <div class="admin-detail-note">
          <span>Nota</span>
          <p>${appointment.notes || "Sin observaciones registradas."}</p>
        </div>
      </div>
    </div>
  `;
}

function renderConfirmModal({
  title = "Confirmar acción",
  message = "¿Deseas continuar?",
  confirmText = "Aceptar",
  cancelText = "Cancelar",
}) {
  return `
    <div class="admin-modal-backdrop" id="adminConfirmBackdrop">
      <div class="admin-modal panel admin-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="adminConfirmTitle">
        <div class="admin-modal-head">
          <div>
            <h3 id="adminConfirmTitle">${title}</h3>
            <p class="muted">${message}</p>
          </div>
        </div>

        <div class="admin-confirm-actions">
          <button type="button" class="boton boton-outline" id="adminConfirmCancel">
            ${cancelText}
          </button>
          <button type="button" class="boton" id="adminConfirmAccept">
            ${confirmText}
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderBlockModal(defaultDate) {
  return `
    <div class="admin-modal-backdrop" id="adminBlockBackdrop">
      <div class="admin-modal panel admin-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="adminBlockTitle">
        <div class="admin-modal-head">
          <div>
            <h3 id="adminBlockTitle">Bloquear horario</h3>
            <p class="muted">Reserva un espacio interno para que no aparezca disponible en la agenda.</p>
          </div>
          <button type="button" class="admin-modal-close" id="adminBlockClose" aria-label="Cerrar">×</button>
        </div>

        <div class="admin-detail-grid">
          <div class="admin-detail-item">
            <span>Fecha</span>
            <input id="blockDate" type="date" value="${defaultDate}" />
          </div>

          <div class="admin-detail-item">
            <span>Hora inicio</span>
            <input id="blockStart" type="time" step="900" value="15:00" />
          </div>

          <div class="admin-detail-item">
            <span>Duración (min)</span>
            <input id="blockDuration" type="number" min="15" step="15" value="60" />
          </div>

          <div class="admin-detail-item">
            <span>Motivo</span>
            <input id="blockReason" type="text" maxlength="80" placeholder="Ej. Comida, salida, descanso" />
          </div>
        </div>

        <div class="admin-confirm-actions">
          <button type="button" class="boton boton-outline" id="adminBlockCancel">
            Cancelar
          </button>
          <button type="button" class="boton" id="adminBlockSave">
            Guardar bloqueo
          </button>
        </div>
      </div>
    </div>
  `;
}

function askConfirmation(modalRoot, options) {
  return new Promise((resolve) => {
    modalRoot.innerHTML = renderConfirmModal(options);

    const backdrop = document.getElementById("adminConfirmBackdrop");
    const btnCancel = document.getElementById("adminConfirmCancel");
    const btnAccept = document.getElementById("adminConfirmAccept");

    const close = (result) => {
      modalRoot.innerHTML = "";
      resolve(result);
    };

    btnCancel?.addEventListener("click", () => close(false));
    btnAccept?.addEventListener("click", () => close(true));
    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) close(false);
    });
  });
}

function askBlockData(modalRoot, defaultDate) {
  return new Promise((resolve) => {
    modalRoot.innerHTML = renderBlockModal(defaultDate);

    const backdrop = document.getElementById("adminBlockBackdrop");
    const btnClose = document.getElementById("adminBlockClose");
    const btnCancel = document.getElementById("adminBlockCancel");
    const btnSave = document.getElementById("adminBlockSave");

    const dateEl = document.getElementById("blockDate");
    const startEl = document.getElementById("blockStart");
    const durationEl = document.getElementById("blockDuration");
    const reasonEl = document.getElementById("blockReason");

    const close = (result = null) => {
      modalRoot.innerHTML = "";
      resolve(result);
    };

    btnClose?.addEventListener("click", () => close(null));
    btnCancel?.addEventListener("click", () => close(null));

    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) close(null);
    });

    btnSave?.addEventListener("click", () => {
      const payload = {
        dateKey: dateEl?.value,
        startTime: startEl?.value,
        durationMin: Number(durationEl?.value || 0),
        reason: String(reasonEl?.value || "").trim() || "Bloqueo manual",
      };

      if (!payload.dateKey || !payload.startTime || payload.durationMin <= 0) {
        return;
      }

      close(payload);
    });
  });
}

function showToast(message, type = "success") {
  let root = document.getElementById("adminToastRoot");

  if (!root) {
    root = document.createElement("div");
    root.id = "adminToastRoot";
    root.className = "admin-toast-root";
    document.body.appendChild(root);
  }

  const toast = document.createElement("div");
  toast.className = `admin-toast ${type}`;
  toast.textContent = message;

  root.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 250);
  }, 2600);
}

function getPeakHour(rows) {
  const map = {};

  rows.forEach((r) => {
    if (r.isBlock || r.status === "cancelled") return;
    const hour = r.startTime || "--:--";
    map[hour] = (map[hour] || 0) + 1;
  });

  let peakHour = null;
  let max = 0;

  for (const hour in map) {
    if (map[hour] > max) {
      max = map[hour];
      peakHour = hour;
    }
  }

  return peakHour || "—";
}

function getTopService(rows) {
  const map = {};

  rows.forEach((r) => {
    if (r.isBlock || r.status === "cancelled") return;
    const service = r.serviceName || "Sin servicio";
    map[service] = (map[service] || 0) + 1;
  });

  let topService = null;
  let max = 0;

  for (const service in map) {
    if (map[service] > max) {
      max = map[service];
      topService = service;
    }
  }

  return topService || "—";
}

function getAverageIncome(rows) {
  const valid = rows.filter((r) => !r.isBlock && r.status !== "cancelled");
  if (!valid.length) return 0;

  const total = valid.reduce((acc, r) => acc + Number(r.totalPrice || 0), 0);
  return Math.round(total / valid.length);
}

function getAverageDuration(rows) {
  const valid = rows.filter((r) => !r.isBlock && r.status !== "cancelled");
  if (!valid.length) return 0;

  const total = valid.reduce((acc, r) => acc + Number(r.durationMin || 0), 0);
  return Math.round(total / valid.length);
}

function getPercent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function buildDashboardMetrics(rows) {
  const appointments = rows.filter((r) => !r.isBlock);
  const totalAppointments = appointments.length;

  const cancelledCount = appointments.filter((r) => r.status === "cancelled").length;
  const noShowCount = appointments.filter((r) => r.status === "no_show").length;
  const completedCount = appointments.filter((r) => r.status === "completed").length;
  const confirmedCount = appointments.filter((r) => r.status === "confirmed").length;
  const pendingCount = appointments.filter((r) => r.status === "pending").length;
  const blockedCount = rows.filter((r) => r.isBlock && r.status === "blocked").length;

  return {
    peakHour: getPeakHour(rows),
    topService: getTopService(rows),
    avgIncome: getAverageIncome(rows),
    avgDuration: getAverageDuration(rows),
    cancelRate: getPercent(cancelledCount, totalAppointments),
    noShowRate: getPercent(noShowCount, totalAppointments),
    statusData: [
      { label: "Confirmadas", value: confirmedCount },
      { label: "Completadas", value: completedCount },
      { label: "Pendientes", value: pendingCount },
      { label: "Canceladas", value: cancelledCount },
      { label: "No asistió", value: noShowCount },
      { label: "Bloqueos", value: blockedCount },
    ],
    hourData: buildHourDistribution(rows),
  };
}

function buildHourDistribution(rows) {
  const map = {};

  rows.forEach((r) => {
    if (r.isBlock || r.status === "cancelled") return;
    const hour = r.startTime || "--:--";
    map[hour] = (map[hour] || 0) + 1;
  });

  return Object.entries(map)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function renderMiniBars(items, emptyLabel = "Sin datos") {
  if (!items.length || items.every((i) => !i.value)) {
    return `<p class="muted">${emptyLabel}</p>`;
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return `
    <div class="admin-bars">
      ${items
        .map(
          (item) => `
            <div class="admin-bar-row">
              <div class="admin-bar-top">
                <span>${item.label}</span>
                <strong>${item.value}</strong>
              </div>
              <div class="admin-bar-track">
                <div class="admin-bar-fill" style="width:${(item.value / max) * 100}%"></div>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDashboard(rows) {
  const d = buildDashboardMetrics(rows);

  return `
    <section class="admin-dashboard">
      <div class="admin-insights-grid">
        <article class="admin-insight-card">
          <span class="admin-insight-label">Hora pico</span>
          <strong class="admin-insight-value">${d.peakHour}</strong>
        </article>

        <article class="admin-insight-card">
          <span class="admin-insight-label">Servicio más solicitado</span>
          <strong class="admin-insight-value">${d.topService}</strong>
        </article>

        <article class="admin-insight-card">
          <span class="admin-insight-label">Promedio por cita</span>
          <strong class="admin-insight-value">${currency(d.avgIncome)}</strong>
        </article>

        <article class="admin-insight-card">
          <span class="admin-insight-label">Duración promedio</span>
          <strong class="admin-insight-value">${d.avgDuration} min</strong>
        </article>

        <article class="admin-insight-card">
          <span class="admin-insight-label">% cancelación</span>
          <strong class="admin-insight-value">${d.cancelRate}%</strong>
        </article>

        <article class="admin-insight-card">
          <span class="admin-insight-label">% no asistió</span>
          <strong class="admin-insight-value">${d.noShowRate}%</strong>
        </article>
      </div>

      <div class="admin-charts-grid">
        <article class="panel admin-chart-card">
          <div class="admin-chart-head">
            <h3>Distribución por estado</h3>
            <p class="muted">Resumen del comportamiento de las citas del periodo visible.</p>
          </div>
          ${renderMiniBars(d.statusData, "No hay estados para mostrar.")}
        </article>

        <article class="panel admin-chart-card">
          <div class="admin-chart-head">
            <h3>Citas por hora</h3>
            <p class="muted">Identifica la concentración operativa del día.</p>
          </div>
          ${renderMiniBars(d.hourData, "No hay citas activas para mostrar.")}
        </article>
      </div>
    </section>
  `;
}


function toComparableDate(date, startTime = "00:00") {
  if (!date) return 0;
  return new Date(`${date}T${startTime}:00`).getTime();
}

function buildFrequentClients(rows) {
  const map = new Map();

  rows.forEach((row) => {
    if (row.type === "block") return;
    if (row.status === "cancelled") return;

    const phone = String(
      row.clientPhone || row.phone || row.whatsapp || ""
    ).trim();

    if (!phone) return;

    const name = String(row.clientName || "Cliente").trim();
    const service = String(row.serviceName || "Servicio").trim();
    const amount = Number(row.totalPrice ?? row.price ?? 0) || 0;
    const dateValue = toComparableDate(row.date, row.startTime);

    if (!map.has(phone)) {
      map.set(phone, {
        clientName: name,
        clientPhone: phone,
        visits: 0,
        totalSpent: 0,
        lastVisitDate: row.date || "—",
        lastVisitTime: row.startTime || "—",
        lastVisitValue: dateValue,
        services: {},
      });
    }

    const client = map.get(phone);

    client.visits += 1;
    client.totalSpent += amount;

    if (dateValue >= client.lastVisitValue) {
      client.clientName = name || client.clientName;
      client.lastVisitDate = row.date || client.lastVisitDate;
      client.lastVisitTime = row.startTime || client.lastVisitTime;
      client.lastVisitValue = dateValue;
    }

    client.services[service] = (client.services[service] || 0) + 1;
  });

  const result = Array.from(map.values()).map((client) => {
    let favoriteService = "—";
    let max = 0;

    for (const service in client.services) {
      if (client.services[service] > max) {
        max = client.services[service];
        favoriteService = service;
      }
    }

    return {
      ...client,
      favoriteService,
    };
  });

  result.sort((a, b) => {
    if (b.visits !== a.visits) return b.visits - a.visits;
    return b.totalSpent - a.totalSpent;
  });

  return result.slice(0, 5);
}

function renderFrequentClients(rows) {
  const clients = buildFrequentClients(rows);

  if (!clients.length) {
    return `
      <section class="panel admin-frequent-section">
        <div class="admin-chart-head">
          <h3>Clientes frecuentes</h3>
          <p class="muted">Todavía no hay suficiente historial para mostrar clientes recurrentes.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel admin-frequent-section">
      <div class="admin-chart-head">
        <h3>Clientes frecuentes</h3>
        <p class="muted">Resumen de clientes con mayor recurrencia dentro del historial registrado.</p>
      </div>

      <div class="admin-frequent-list">
        ${clients
          .map(
            (client, index) => `
              <article class="admin-frequent-card">
                <div class="admin-frequent-rank">#${index + 1}</div>

                <div class="admin-frequent-main">
                  <h4>${client.clientName}</h4>
                  <div class="admin-frequent-meta">
                    <span>Tel: ${client.clientPhone}</span>
                    <span>Citas: ${client.visits}</span>
                    <span>Gastado: ${currency(client.totalSpent)}</span>
                  </div>
                </div>

                <div class="admin-frequent-extra">
                  <span>Última visita</span>
                  <strong>${client.lastVisitDate} · ${client.lastVisitTime}</strong>
                  <small>Servicio frecuente: ${client.favoriteService}</small>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export function vistaAdmin() {
  const app = document.getElementById("app");

  if (window.__unsubAdmin) {
  window.__unsubAdmin();
  window.__unsubAdmin = null;
}

if (window.__unsubAdminHistory) {
  window.__unsubAdminHistory();
  window.__unsubAdminHistory = null;
}

  const today = toDateKey(new Date());

app.innerHTML = `
<section class="contenedor seccion admin-page">
  <div class="seccion-head admin-head">
    <div>
      <h1>Panel Administrativo</h1>
      <p class="muted">
        Consulta de citas en tiempo real, control de agenda y acciones rápidas del día.
      </p>
    </div>
  </div>

  <div class="panel admin-toolbar">

    <!-- FILA 1: filtros + acciones -->
    <div class="admin-toolbar-row">
      <div class="admin-filters">
        <div class="admin-field">
          <label class="muted" for="fechaAdmin">Fecha</label>
          <input id="fechaAdmin" type="date" value="${today}" />
        </div>

        <div class="admin-field">
          <label class="muted" for="estadoAdmin">Estado</label>
          <select id="estadoAdmin">
            ${ESTADOS.map(
              (item) => `<option value="${item.value}">${item.label}</option>`
            ).join("")}
          </select>
        </div>
      </div>

      <div class="admin-actions">
        <button id="btnHoy" class="boton boton-outline" type="button">Hoy</button>
        <a href="#/admin-semana" class="boton boton-outline">Ver semana</a>
        <button id="btnBloquear" class="boton" type="button">Bloquear horario</button>
      </div>
    </div>

    <!-- FILA 2: bloqueos rápidos -->
    <div class="admin-quick-blocks">
      <span class="quick-title">Bloqueos rápidos:</span>
      <button id="btnBlock30" class="boton boton-outline" type="button">30 min</button>
      <button id="btnBlock60" class="boton boton-outline" type="button">1 hora</button>
      <button id="btnBlockFood" class="boton boton-outline" type="button">Comida</button>
      <button id="btnBlockBreak" class="boton boton-outline" type="button">Descanso</button>
    </div>

  </div>

  <div id="adminSummaryWrap"></div>
  <div id="adminDashboardWrap"></div>
  <div id="adminFrequentWrap"></div>
  <div id="adminWrap"></div>
  <div id="adminModalRoot"></div>

</section>
`;

const fechaEl = document.getElementById("fechaAdmin");
const estadoEl = document.getElementById("estadoAdmin");

const wrap = document.getElementById("adminWrap");
const summaryWrap = document.getElementById("adminSummaryWrap");
const dashboardWrap = document.getElementById("adminDashboardWrap");
const frequentWrap = document.getElementById("adminFrequentWrap");
const modalRoot = document.getElementById("adminModalRoot");

const btnHoy = document.getElementById("btnHoy");
const btnBloquear = document.getElementById("btnBloquear");

const btnBlock30 = document.getElementById("btnBlock30");
const btnBlock60 = document.getElementById("btnBlock60");
const btnBlockFood = document.getElementById("btnBlockFood");
const btnBlockBreak = document.getElementById("btnBlockBreak");

let allRows = [];
let allHistoryRows = [];

const repaint = () => {
  const filtered = filterRows(allRows, estadoEl.value);
  summaryWrap.innerHTML = renderSummary(filtered);
  dashboardWrap.innerHTML = renderDashboard(filtered);
  wrap.innerHTML = renderAppointments(filtered);
};

// Listener global para historial completo (clientes frecuentes)
if (window.__unsubAdminHistory) {
  window.__unsubAdminHistory();
  window.__unsubAdminHistory = null;
}

window.__unsubAdminHistory = listenAllAppointments((rows) => {
  allHistoryRows = normalizeRows(rows);
  frequentWrap.innerHTML = renderFrequentClients(allHistoryRows);
});

const attach = (dateKey) => {
  if (window.__unsubAdmin) window.__unsubAdmin();

  summaryWrap.innerHTML = "";
dashboardWrap.innerHTML = "";

  wrap.innerHTML = `<div class="panel"><p class="muted">Cargando citas...</p></div>`;
  summaryWrap.innerHTML = "";
  dashboardWrap.innerHTML = "";
  frequentWrap.innerHTML = "";

  window.__unsubAdmin = listenAppointmentsByDate(dateKey, (rows) => {
    allRows = normalizeRows(rows).sort((a, b) =>
      String(a.startTime).localeCompare(String(b.startTime))
    );
    repaint();

    // Volver a pintar clientes frecuentes
    if (allHistoryRows.length) {
      frequentWrap.innerHTML = renderFrequentClients(allHistoryRows);
    }
  });
};

  const openDetail = (id) => {
    const appointment = allRows.find((row) => row.id === id);
    if (!appointment) return;

    modalRoot.innerHTML = renderDetailModal(appointment);

    const backdrop = document.getElementById("adminModalBackdrop");
    const closeBtn = document.getElementById("adminModalClose");

    const close = () => {
      modalRoot.innerHTML = "";
    };

    closeBtn?.addEventListener("click", close);
    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
  };

  const changeStatus = async (id, newStatus) => {
    const appointment = allRows.find((row) => row.id === id);
    if (!appointment) return;

    const labels = {
      completed: "marcar como completada",
      pending: "marcar como pendiente",
      no_show: "marcar como no asistió",
    };

    const ok = await askConfirmation(modalRoot, {
      title: "Confirmar acción",
      message: `¿Deseas ${labels[newStatus]} la cita de ${appointment.clientName}?`,
      confirmText: "Sí, continuar",
      cancelText: "No",
    });

    if (!ok) return;

    try {
      await updateAppointmentStatus(id, newStatus);
      showToast("Estado actualizado correctamente.", "success");
    } catch (error) {
      console.error("Error al actualizar estado:", error);
      showToast("No se pudo actualizar el estado.", "error");
    }
  };

  const cancelWithRelease = async (id) => {
    const appointment = allRows.find((row) => row.id === id);
    if (!appointment) return;

    const ok = await askConfirmation(modalRoot, {
      title: "Cancelar cita",
      message: `Se cancelará la cita de ${appointment.clientName} y se liberarán sus horarios para que vuelvan a estar disponibles. ¿Deseas continuar?`,
      confirmText: "Sí, cancelar",
      cancelText: "Volver",
    });

    if (!ok) return;

    try {
      await cancelAppointment(id);
      showToast(
        "La cita fue cancelada y los horarios quedaron disponibles.",
        "success"
      );
    } catch (error) {
      console.error("Error al cancelar cita:", error);
      showToast("No se pudo cancelar la cita.", "error");
    }
  };

  const unblockSchedule = async (id) => {
  const appointment = allRows.find((row) => row.id === id);
  if (!appointment) return;

  const ok = await askConfirmation(modalRoot, {
    title: "Desbloquear horario",
    message:
      "Este horario volverá a estar disponible para nuevas citas. ¿Deseas continuar?",
    confirmText: "Sí, desbloquear",
    cancelText: "Cancelar",
  });

  if (!ok) return;

  try {
    await removeManualBlock(id);
    showToast("Horario desbloqueado correctamente.", "success");
  } catch (error) {
    console.error("Error al desbloquear horario:", error);
    showToast(error.message || "No se pudo desbloquear el horario.", "error");
  }
};

const editCurrentAppointment = async (id) => {
  const appointment = allRows.find((row) => row.id === id);
  if (!appointment) return;

  const payload = await askEditData(modalRoot, appointment);
  if (!payload) return;

  try {
    await updateAppointmentData({
      appointmentId: id,
      clientName: payload.clientName,
      clientPhone: payload.clientPhone,
      note: payload.note,
    });

    showToast("La cita fue actualizada.", "success");
  } catch (error) {
    console.error("Error al editar cita:", error);
    showToast(error.message || "No se pudo editar la cita.", "error");
  }
};

const rescheduleCurrentAppointment = async (id) => {
  const appointment = allRows.find((row) => row.id === id);
  if (!appointment) return;

  const payload = await askRescheduleData(modalRoot, appointment);
  if (!payload) return;

  try {
    await ensureAvailabilityForDate(payload.newDateKey);

    await rescheduleAppointment({
      appointmentId: id,
      newDateKey: payload.newDateKey,
      newStartTime: payload.newStartTime,
    });

    showToast("La cita fue reprogramada correctamente.", "success");
  } catch (error) {
    console.error("Error al reprogramar cita:", error);
    showToast(error.message || "No se pudo reprogramar la cita.", "error");
  }
};

const createQuickBlock = async ({ durationMin, reason }) => {
  const payload = await askBlockData(modalRoot, fechaEl.value);
  if (!payload) return;

  try {
    await ensureAvailabilityForDate(fechaEl.value);

    await createManualBlock({
      dateKey: fechaEl.value,
      startTime: payload.startTime,
      durationMin,
      reason,
    });

    showToast(`Bloqueo "${reason}" creado correctamente.`, "success");
  } catch (error) {
    console.error("Error al crear bloqueo rápido:", error);
    showToast(error.message || "No se pudo crear el bloqueo rápido.", "error");
  }
};

const createBlock = async () => {
  const payload = await askBlockData(modalRoot, fechaEl.value);
  if (!payload) return;

  try {
    await ensureAvailabilityForDate(payload.dateKey);
    await createManualBlock(payload);
    showToast("Horario bloqueado correctamente.", "success");
  } catch (error) {
    console.error("Error al crear bloqueo:", error);
    showToast(error.message || "No se pudo crear el bloqueo.", "error");
  }
};

  attach(fechaEl.value);

  fechaEl.addEventListener("change", () => {
    if (!fechaEl.value) return;
    attach(fechaEl.value);
  });

  estadoEl.addEventListener("change", repaint);

  btnHoy.addEventListener("click", () => {
    const t = toDateKey(new Date());
    fechaEl.value = t;
    attach(t);
  });

  btnBloquear.addEventListener("click", createBlock);

  btnBlock30.addEventListener("click", () =>
  createQuickBlock({ durationMin: 30, reason: "Bloqueo 30 min" })
);

btnBlock60.addEventListener("click", () =>
  createQuickBlock({ durationMin: 60, reason: "Bloqueo 1 hora" })
);

btnBlockFood.addEventListener("click", () =>
  createQuickBlock({ durationMin: 60, reason: "Comida" })
);

btnBlockBreak.addEventListener("click", () =>
  createQuickBlock({ durationMin: 30, reason: "Descanso" })
);

wrap.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const { action, id } = btn.dataset;
  if (!id) return;

  if (action === "detail") {
    openDetail(id);
    return;
  }

  if (action === "unblock") {
    await unblockSchedule(id);
    return;
  }

  if (action === "complete") {
    await changeStatus(id, "completed");
    return;
  }

  if (action === "pending") {
    await changeStatus(id, "pending");
    return;
  }

  if (action === "no_show") {
    await changeStatus(id, "no_show");
    return;
  }

  if (action === "edit") {
  await editCurrentAppointment(id);
  return;
}

  if (action === "reschedule") {
    await rescheduleCurrentAppointment(id);
    return;
  }

  if (action === "cancel") {
    await cancelWithRelease(id);
    return;
  }
});
}

function renderEditModal(appointment) {
  return `
    <div class="admin-modal-backdrop" id="adminEditBackdrop">
      <div class="admin-modal panel admin-confirm-modal">
        <div class="admin-modal-head">
          <div>
            <h3>Editar cita</h3>
            <p class="muted">Modificar datos del cliente.</p>
          </div>
          <button type="button" class="admin-modal-close" id="adminEditClose">×</button>
        </div>

        <div class="admin-detail-grid">
          <div class="admin-detail-item">
            <span>Nombre</span>
            <input id="editName" type="text" value="${appointment.clientName || ""}" />
          </div>

          <div class="admin-detail-item">
            <span>Teléfono</span>
            <input id="editPhone" type="text" value="${appointment.clientPhone || ""}" />
          </div>

          <div class="admin-detail-item">
            <span>Nota</span>
            <input id="editNote" type="text" value="${appointment.note || ""}" />
          </div>
        </div>

        <div class="admin-confirm-actions">
          <button type="button" class="boton boton-outline" id="adminEditCancel">
            Cancelar
          </button>
          <button type="button" class="boton" id="adminEditSave">
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  `;
}

function askEditData(modalRoot, appointment) {
  return new Promise((resolve) => {
    modalRoot.innerHTML = renderEditModal(appointment);

    const backdrop = document.getElementById("adminEditBackdrop");
    const btnClose = document.getElementById("adminEditClose");
    const btnCancel = document.getElementById("adminEditCancel");
    const btnSave = document.getElementById("adminEditSave");

    const nameEl = document.getElementById("editName");
    const phoneEl = document.getElementById("editPhone");
    const noteEl = document.getElementById("editNote");

    const close = (result = null) => {
      modalRoot.innerHTML = "";
      resolve(result);
    };

    btnClose?.addEventListener("click", () => close(null));
    btnCancel?.addEventListener("click", () => close(null));

    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) close(null);
    });

    btnSave?.addEventListener("click", () => {
      close({
        clientName: nameEl.value,
        clientPhone: phoneEl.value,
        note: noteEl.value,
      });
    });
  });
}