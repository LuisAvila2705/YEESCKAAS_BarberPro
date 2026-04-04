// public/js/app.js  (ajusta la ruta según tu proyecto)
import { iniciarEnrutador } from "./enrutador.js";
import { renderNavbar } from "./componentes/navbar.js";
import { seedCore } from "./firebase/seed.js";

/** Helpers */
function assertEl(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`No existe #${id} en el HTML`);
  return el;
}

function renderFatalError(err) {
  console.error("❌ Error arrancando la app:", err);

  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <div style="padding:24px;font-family:system-ui;max-width:900px;margin:0 auto;">
      <h2>Ocurrió un error al cargar la app</h2>
      <p>Revisa la consola (F12) para ver el detalle.</p>

      <details open style="margin-top:12px;">
        <summary style="cursor:pointer;margin-bottom:8px;">Detalle del error</summary>
        <pre style="background:#f6f6f6;padding:12px;border-radius:8px;overflow:auto;white-space:pre-wrap;">
${String(err?.stack || err)}
        </pre>
      </details>

      <p style="margin-top:12px;">
        Tip: si el problema viene de Firebase/seed, la app debería seguir cargando. Si estás viendo esta pantalla,
        es porque falló el arranque base (navbar/router/imports/paths).
      </p>
    </div>
  `;
}

/**
 * Seed seguro (NO rompe la app si falla)
 * - corre una vez por navegador (localStorage)
 * - si quieres re-seed: localStorage.removeItem("seed_core_v1") en consola
 */
async function runSeedOnce() {
  const seedKey = "seed_core_v1";

  // Permite desactivar el seed desde consola:
  // localStorage.setItem("disable_seed", "1")
  if (localStorage.getItem("disable_seed") === "1") {
    console.log("ℹ️ Seed deshabilitado por localStorage.disable_seed=1");
    return;
  }

  if (localStorage.getItem(seedKey)) {
    console.log("ℹ️ SeedCore ya se ejecutó anteriormente (localStorage)");
    return;
  }

  try {
    console.log("🌱 Ejecutando SeedCore...");
    await seedCore();
    localStorage.setItem(seedKey, "done");
    console.log("✅ SeedCore ejecutado y marcado en localStorage");
  } catch (e) {
    // Importante: NO tirar la app
    console.warn("⚠️ SeedCore falló (no detiene la app):", e);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1) Arranque base (si esto falla, sí mostramos pantalla de error)
  try {
    assertEl("navbar");
    assertEl("app");

    renderNavbar();

    // Ruta default si no hay hash
    if (!window.location.hash) window.location.hash = "#/";

    iniciarEnrutador();

    console.log("✅ App cargó correctamente");
  } catch (err) {
    renderFatalError(err);
    return;
  }

  // 2) Seed *aparte* (si falla, no pasa nada)
  await runSeedOnce();

  // 3) Debug opcional: expone helpers a window (si quieres)
  // window.__debug = { runSeedOnce };
});