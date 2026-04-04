// public/js/utils/whatsapp.js

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeMxPhone(phone) {
  const digits = onlyDigits(phone);

  // Si ya viene con 52 + 10 dígitos
  if (digits.length === 12 && digits.startsWith("52")) {
    return digits;
  }

  // Si viene con 10 dígitos locales MX
  if (digits.length === 10) {
    return `52${digits}`;
  }

  // fallback
  return digits;
}

function safeText(value, fallback = "—") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function buildAppointmentMessage(appointment, type = "confirm") {
  const clientName = appointment.clientName || "cliente";
  const date = appointment.date;
  const startTime = appointment.startTime;
  const endTime = appointment.endTime || "";
  const serviceName = appointment.serviceName || "servicio";
  const note = appointment.notes || "";
  const businessName = "Yeesckaas Barber Shop";

  if (type === "confirm") {
    return `Hola ${clientName}, tu cita en ${businessName} ha sido confirmada.

📅 Fecha: ${date}
⏰ Horario: ${startTime}${endTime ? ` - ${endTime}` : ""}
💈 Servicio: ${serviceName}
${note ? `📝 Nota: ${note}` : ""}

Si necesitas reprogramar o cancelar tu cita, responde a este mensaje.`;
  }

  if (type === "reminder") {
    return `Hola ${clientName}, te recordamos tu cita en ${businessName}.

📅 Fecha: ${date}
⏰ Horario: ${startTime}
💈 Servicio: ${serviceName}

Si necesitas hacer algún cambio, responde a este mensaje.`;
  }

  if (type === "reschedule") {
    return `Hola ${clientName}, tu cita en ${businessName} fue reprogramada.

📅 Nueva fecha: ${date}
⏰ Nuevo horario: ${startTime}
💈 Servicio: ${serviceName}

Si tienes alguna duda, responde a este mensaje.`;
  }

  return `Hola ${clientName}, aquí está la información de tu cita en ${businessName}: ${date} ${startTime}.`;
}

export function buildWhatsAppLink(phone, appointment, type = "confirm") {
  const normalizedPhone = normalizeMxPhone(phone);
  const message = buildAppointmentMessage(appointment, type);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${normalizedPhone}?text=${encoded}`;
}




export function buildCustomerToBarberMessage(appointment) {
  const clientName = appointment.clientName || "Cliente";
  const date = appointment.date || "—";
  const startTime = appointment.startTime || "—";
  const endTime = appointment.endTime || "";
  const serviceName = appointment.serviceName || "Servicio";
  const note = appointment.notes || "";
  const businessName = "Yeesckaas Barber Shop";

  return `Hola, registré una cita desde la página de ${businessName}.

👤 Nombre: ${clientName}
📅 Fecha: ${date}
⏰ Horario: ${startTime}${endTime ? ` - ${endTime}` : ""}
💈 Servicio: ${serviceName}
${note ? `📝 Nota: ${note}` : ""}

Quedo atento a cualquier indicación.`;
}


export function buildBarberWhatsAppLink(barberPhone, appointment) {
  const message = buildCustomerToBarberMessage(appointment);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${barberPhone}?text=${encoded}`;
}