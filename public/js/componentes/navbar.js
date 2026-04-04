import { getCurrentAdminSession, logoutAdmin } from "../repos/authRepo.js";

export async function renderNavbar() {
  const header = document.getElementById("navbar");
  if (!header) return;

  const session = await getCurrentAdminSession();
  const isAdmin = !!session;

  header.innerHTML = `
    <nav class="nav">
      <div class="brand">
        <button
          class="brand-logoBtn"
          type="button"
          data-lb-src="/assets/logo.png"
          data-lb-alt="Yeesckaas Barber Shop"
          aria-label="Ver logo en grande"
        >
          <img
            src="/assets/logo.png"
            alt="Yeesckaas Barber Shop"
            class="brand-logo"
            loading="lazy"
            decoding="async"
          />
        </button>

        <a class="brand-text" href="#/">Barbería</a>
      </div>

      <div class="nav-links">
        <a href="#/" class="nav-link" data-route="/">Inicio</a>
        <a href="#/citas" class="nav-link" data-route="/citas">Citas</a>

        ${
          isAdmin
            ? `
              <a href="#/admin" class="nav-link" data-route="/admin">Admin</a>
              <a href="#/admin-semana" class="nav-link" data-route="/admin-semana">Semana</a>
              <a href="#/" id="navLogout" class="nav-link">Salir</a>
            `
            : `
              <a href="#/login" class="nav-link" data-route="/login">Login</a>
            `
        }
      </div>
    </nav>
  `;

  if (isAdmin) {
    const logoutBtn = document.getElementById("navLogout");
    logoutBtn?.addEventListener("click", async (e) => {
      e.preventDefault();
      await logoutAdmin();
      window.location.hash = "#/";
      renderNavbar();
    });
  }
}