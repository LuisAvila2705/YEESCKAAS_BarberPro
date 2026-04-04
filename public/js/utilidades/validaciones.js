export function validarTelefonoMX(tel) {
  // 10 dígitos, solo números
  return /^[0-9]{10}$/.test(tel);
}

export function limpiarTexto(texto) {
  return String(texto || "").trim().replace(/\s+/g, " ");
}

export function hoyISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
