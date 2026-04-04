import { loginAdmin } from "../repos/authRepo.js";

export function vistaLogin() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <section class="contenedor seccion login-page">
      <div class="login-card panel">
        <div class="login-head">
          <h1>Acceso administrativo</h1>
          <p class="muted">
            Inicia sesión para acceder al panel de administración de la barbería.
          </p>
        </div>

        <form id="loginForm" class="login-form" novalidate>
          <div class="admin-field">
            <label for="loginEmail">Correo</label>
            <input id="loginEmail" type="email" autocomplete="username" />
            <small id="loginEmailError" class="error"></small>
          </div>

          <div class="admin-field">
            <label for="loginPassword">Contraseña</label>
            <input id="loginPassword" type="password" autocomplete="current-password" />
            <small id="loginPasswordError" class="error"></small>
          </div>

          <div class="login-actions">
            <button id="btnLogin" type="submit" class="boton">Entrar</button>
            <a href="#/" class="boton boton-outline">Volver</a>
          </div>

          <p id="loginError" class="mensaje-err" hidden></p>
        </form>
      </div>
    </section>
  `;

  const form = document.getElementById("loginForm");
  const emailEl = document.getElementById("loginEmail");
  const passwordEl = document.getElementById("loginPassword");
  const btnLogin = document.getElementById("btnLogin");
  const loginError = document.getElementById("loginError");
  const emailError = document.getElementById("loginEmailError");
  const passwordError = document.getElementById("loginPasswordError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    loginError.hidden = true;
    loginError.textContent = "";
    emailError.textContent = "";
    passwordError.textContent = "";

    const email = emailEl.value.trim();
    const password = passwordEl.value;

    let hasError = false;

    if (!email) {
      emailError.textContent = "Ingresa el correo.";
      hasError = true;
    }

    if (!password) {
      passwordError.textContent = "Ingresa la contraseña.";
      hasError = true;
    }

    if (hasError) return;

    btnLogin.disabled = true;
    btnLogin.textContent = "Entrando...";

    try {
      await loginAdmin(email, password);
      location.hash = "#/admin";
    } catch (error) {
      console.error("Error de login:", error);
      loginError.textContent = "No se pudo iniciar sesión. Verifica tus credenciales.";
      loginError.hidden = false;
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = "Entrar";
    }
  });
}