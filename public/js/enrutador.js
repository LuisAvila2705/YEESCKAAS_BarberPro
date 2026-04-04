import { vistaInicio } from "./vistas/inicio.js";
import { vistaCitas } from "./vistas/citas.js";
import { vistaAdmin } from "./vistas/admin.js";
import { vistaAdminSemana } from "./vistas/adminSemana.js";
import { vistaLogin } from "./vistas/login.js";

import { getCurrentAdminSession } from "./repos/authRepo.js";
import { renderNavbar } from "./componentes/navbar.js";

function rutaActual() {
  const hash = window.location.hash || "#/";
  return hash.replace("#", "");
}

async function requireAdmin() {
  const session = await getCurrentAdminSession();

  if (!session) {
    window.location.hash = "#/login";
    return false;
  }

  return true;
}

export function iniciarEnrutador() {
  const app = document.getElementById("app");
  if (!app) throw new Error("No existe #app");

  const render = async () => {
    await renderNavbar();

    const ruta = rutaActual();

    if (ruta === "/" || ruta === "") {
      vistaInicio();
      return;
    }

    if (ruta === "/citas") {
      vistaCitas();
      return;
    }

    if (ruta === "/login") {
      vistaLogin();
      return;
    }

    if (ruta === "/admin") {
      if (!(await requireAdmin())) return;
      vistaAdmin();
      return;
    }

    if (ruta === "/admin-semana") {
      if (!(await requireAdmin())) return;
      vistaAdminSemana();
      return;
    }

    window.location.hash = "#/";
  };

  window.addEventListener("hashchange", render);
  render();
}