import { BARBERIA } from "../datos/barberia.js";

export function vistaInicio() {
  const app = document.getElementById("app");

  // =========================
  //  WHATSAPP (Fuente única)
  // =========================
  // Número real (MX): 81 1006 3378 -> wa.me requiere 521 + número
  const WA_REAL = "5218110063378";

  // Si en BARBERIA viene un whatsapp válido, úsalo; si no, usa el real.
  const waNumber =
    (BARBERIA.whatsapp && String(BARBERIA.whatsapp).trim()) ||
    (BARBERIA.redes?.whatsapp && String(BARBERIA.redes.whatsapp).trim()) ||
    WA_REAL;

  const waBase = waNumber ? `https://wa.me/${waNumber}` : null;

  const waLinkGeneral = waBase
    ? `${waBase}?text=${encodeURIComponent("Hola, quiero agendar una cita.")}`
    : (BARBERIA.redes?.instagram || "#");

  const waLinkServicio = (nombreServicio) => {
    if (!waBase) return (BARBERIA.redes?.instagram || "#");
    const msg = `Hola, me gustaría cotizar y agendar: ${nombreServicio}.`;
    return `${waBase}?text=${encodeURIComponent(msg)}`;
  };

  // =========================
  //  MAPS EMBED (sin API key)
  // =========================
  const mapsEmbedUrl =
    "https://www.google.com/maps?q=" +
    encodeURIComponent(BARBERIA.direccion || "") +
    "&output=embed";

  // =========================
  //  GALERÍA (cortes vs local)
  // =========================
  const galeria = Array.isArray(BARBERIA.galeria) ? BARBERIA.galeria : [];
  const esLocal = (src) => /local/i.test(String(src || ""));

  const cortes = galeria.filter((g) => !esLocal(g.src));
  const local = galeria.find((g) => esLocal(g.src));

  // Collage hero: máximo 5 cortes
  const collage = cortes.slice(0, 5);

  // =========================
  //  COLLAGE HERO (click -> lightbox)
  // =========================
  const collageHTML = collage.length
    ? `
      <div class="hero-collage" aria-label="Portafolio de cortes">

        <figure class="hc big">
          <button class="hc-open" type="button"
            data-src="${collage[0].src}"
            data-alt="${collage[0].alt || "Corte"}"
            aria-label="Ver imagen en grande: ${collage[0].alt || "Corte"}">
            <img src="${collage[0].src}" alt="${collage[0].alt || "Corte"}" loading="lazy" />
            <figcaption>${collage[0].alt || ""}</figcaption>
          </button>
        </figure>

        <div class="hc-grid">
          ${collage
            .slice(1, 5)
            .map(
              (img) => `
                <figure class="hc sm">
                  <button class="hc-open" type="button"
                    data-src="${img.src}"
                    data-alt="${img.alt || "Corte"}"
                    aria-label="Ver imagen en grande: ${img.alt || "Corte"}">
                    <img src="${img.src}" alt="${img.alt || "Corte"}" loading="lazy" />
                    <figcaption>${img.alt || ""}</figcaption>
                  </button>
                </figure>
              `
            )
            .join("")}
        </div>

        <a class="hc-cta" href="${BARBERIA.redes?.instagram || "#"}" target="_blank" rel="noopener">
          Ver más cortes
        </a>
      </div>
    `
    : `
      <div class="hero-media" aria-hidden="true">
        <div class="mock">
          <div class="mock-top"></div>
          <div class="mock-body">
            <div class="mock-line w80"></div>
            <div class="mock-line w60"></div>
            <div class="mock-line w70"></div>
            <div class="mock-grid">
              <div class="mock-box"></div>
              <div class="mock-box"></div>
              <div class="mock-box"></div>
              <div class="mock-box"></div>
            </div>
          </div>
        </div>
      </div>
    `;

  // =========================
  //  PRECIOS REALES (captura)
  // =========================
  const PRECIOS = {
    "Corte": "$140",
    "Corte c/n": "$160",
    "Corte con cita": "$200",
    "Ceja": "$50",
    "Barba": "$100",
    "Mascarilla": "$80",
  };

  // =========================
  //  SERVICIOS (cards)
  // =========================
  const serviciosCards = (BARBERIA.servicios || [])
    .map((s) => {
      const precio = PRECIOS[s.nombre] || s.precioTexto || "Preguntar";
      return `
        <div class="card servicio-premium">
          <div class="servicio-top">
            <h3>${s.nombre}</h3>
            <span class="badge">${s.duracion || ""}</span>
          </div>

          <div class="servicio-precio">
            ${precio}
          </div>

          <div class="card-actions">
            <a class="btn-sm" href="#/citas">Agendar</a>
            <a class="btn-sm btn-ghost" href="${waLinkServicio(s.nombre)}" target="_blank" rel="noopener">
              WhatsApp
            </a>
          </div>
        </div>
      `;
    })
    .join("");

  // =========================
  //  HORARIOS
  // =========================
  const horariosRows = (BARBERIA.horarios || [])
    .map(
      (h) => `
      <div class="fila">
        <span class="dia">${h.dia}</span>
        <span class="hrs">${h.horas}</span>
      </div>
    `
    )
    .join("");

  // =========================
  //  MINI-CARDS
  // =========================
  const miniUbicacionTitle = BARBERIA.zonaCorta || "Ubicación";
  const miniUbicacionSub = BARBERIA.ciudadCorta || "";

  const miniHorarioTitle = "Lun–Vie 11:00–20:00";
  const miniHorarioSub = "Sáb 10:00–18:00";

  const miniAtencionTitle = "Por cita";
  const miniAtencionSub = "Agenda rápida";

  // Texto visible “humano” del WhatsApp
  const waVisible = "81 1006 3378";

  // =========================
  //  RENDER
  // =========================
  app.innerHTML = `
    <section class="hero">
      <div class="hero-content">
        <p class="tag">Innovacion Constante</p>
        <h1>${BARBERIA.nombre || ""}</h1>
        <h2>${BARBERIA.slogan || ""}</h2>
        <p class="lead">${BARBERIA.descripcion || ""}</p>

        <div class="hero-actions">
          <a class="boton" href="#/citas">Agendar cita</a>
          <a class="boton boton-outline" href="${waLinkGeneral}" target="_blank" rel="noopener">
            WhatsApp
          </a>
        </div>

        <div class="hero-mini">
          <div class="mini-item">
            <span class="mini-title">Ubicación</span>
            <span class="mini-text">${miniUbicacionTitle}</span>
            <span class="mini-sub">${miniUbicacionSub}</span>
          </div>

          <div class="mini-item">
            <span class="mini-title">Horario</span>
            <span class="mini-text">${miniHorarioTitle}</span>
            <span class="mini-sub">${miniHorarioSub}</span>
          </div>

          <div class="mini-item">
            <span class="mini-title">Atención</span>
            <span class="mini-text">${miniAtencionTitle}</span>
            <span class="mini-sub">${miniAtencionSub}</span>
          </div>
        </div>
      </div>

      <div class="hero-media">
        ${collageHTML}
      </div>
    </section>

    <section class="contenedor seccion" id="servicios">
      <div class="seccion-head">
        <h2>Servicios y precios</h2>
        <p>Selecciona el servicio y agenda en segundos.</p>
      </div>
      <div class="grid-cards">
        ${serviciosCards}
      </div>
    </section>

    <section class="contenedor seccion">
      <div class="seccion-grid">
        <div class="panel">
          <h2>Horarios</h2>
          <p class="muted">Horario de atención (editable cuando el dueño lo confirme).</p>
          <div class="tabla">
            ${horariosRows}
          </div>
        </div>

        <div class="panel">
          <h2>Ubicación</h2>
          <p class="muted">
            <strong>${BARBERIA.zonaCorta || ""}</strong><br/>
            ${BARBERIA.direccion || ""}
          </p>

          <div class="ubi-actions">
            <a class="boton boton-outline" href="${BARBERIA.googleMapsUrl || "#"}" target="_blank" rel="noopener">
              Ver en Google Maps
            </a>
          </div>

          <div class="map-wrap">
            <iframe
              title="Mapa"
              src="${mapsEmbedUrl}"
              loading="lazy"
              referrerpolicy="no-referrer-when-downgrade"
              allowfullscreen
            ></iframe>
          </div>
        </div>
      </div>
    </section>

    <!-- Portafolio: NO repetir los cortes del hero -->
    <section class="contenedor seccion">
      <div class="seccion-head">
        <h2>Portafolio</h2>
        <p>Mira más resultados y estilos en Instagram.</p>
      </div>

      <div class="panel portafolio">
        <div class="portafolio-left">
          <h3>Resultados reales</h3>
          <p class="muted">
            La mejor referencia es el trabajo: fades, clásicos, rizos, infantil y más.
          </p>

          <p class="contacto-wa">
            Citas por WhatsApp: <strong>${waVisible}</strong>
          </p>

          <div class="portafolio-actions">
            <a class="boton" href="${BARBERIA.redes?.instagram || "#"}" target="_blank" rel="noopener">
              Ver en Instagram
            </a>
            <a class="boton boton-outline" href="#/citas">Agendar</a>
          </div>
        </div>

        ${
          local
            ? `
              <div class="portafolio-right">
                <img class="local-shot" src="${local.src}" alt="${local.alt || "Interior de la barbería"}" loading="lazy" />
              </div>
            `
            : ""
        }
      </div>
    </section>

    <section class="contenedor seccion">
      <div class="cta-final">
        <div>
          <h2>¿Listo para tu próxima cita?</h2>
          <p class="muted">Agenda en línea o escríbenos por WhatsApp.</p>
        </div>
        <div class="cta-actions">
          <a class="boton" href="#/citas">Agendar</a>
          <a class="boton boton-outline" href="${waLinkGeneral}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>
    </section>

    <section class="contenedor seccion">
      <div class="panel">
        <h2>Redes sociales</h2>
        <p class="muted">Mira trabajos recientes, promos y estilos en nuestras redes.</p>

        <div class="redes">
          <a class="red-btn" href="${BARBERIA.redes?.instagram || "#"}" target="_blank" rel="noopener">Instagram</a>
          <a class="red-btn" href="${BARBERIA.redes?.facebook || "#"}" target="_blank" rel="noopener">Facebook</a>
        </div>
      </div>
    </section>

    <footer class="contenedor footer">
      <div>
        <strong>${BARBERIA.nombre || ""}</strong>
        <p class="muted">© ${new Date().getFullYear()} • Citas en línea • Sitio creado por Luis Angel Avila Lopez</p>
      </div>
      <div class="footer-links">
        <a href="${BARBERIA.redes?.instagram || "#"}" target="_blank" rel="noopener">Instagram</a>
        <a href="${BARBERIA.redes?.facebook || "#"}" target="_blank" rel="noopener">Facebook</a>
      </div>
    </footer>

    <a class="fab" href="#/citas" aria-label="Agendar cita">Agendar</a>

    <!-- LIGHTBOX PREMIUM -->
    <div class="lightbox" id="lightbox" aria-hidden="true">
      <div class="lb-backdrop" data-close="1"></div>
      <div class="lb-dialog" role="dialog" aria-modal="true" aria-label="Vista previa">
        <button class="lb-close" type="button" data-close="1" aria-label="Cerrar">✕</button>
        <img class="lb-img" id="lbImg" alt="" />
        <p class="lb-cap" id="lbCap"></p>
      </div>
    </div>
  `;

  // =========================
  //  LIGHTBOX EVENTS
  // =========================
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbCap = document.getElementById("lbCap");

  const openLB = (src, alt) => {
    lb.classList.add("is-open");
    lb.setAttribute("aria-hidden", "false");
    lbImg.src = src;
    lbImg.alt = alt || "Imagen";
    lbCap.textContent = alt || "";
    document.body.style.overflow = "hidden";
  };

  const closeLB = () => {
    lb.classList.remove("is-open");
    lb.setAttribute("aria-hidden", "true");
    lbImg.src = "";
    lbImg.alt = "";
    lbCap.textContent = "";
    document.body.style.overflow = "";
  };

  // Delegación: click a cualquier imagen del collage
  app.addEventListener("click", (e) => {
    const btn = e.target.closest(".hc-open");
    if (btn) {
      openLB(btn.dataset.src, btn.dataset.alt);
      return;
    }
    if (e.target.closest("[data-close='1']")) closeLB();
  });

  // Click en logo del HEADER (o cualquier elemento fuera de #app)
// usando data-lb-src / data-lb-alt
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-lb-src]");
  if (!el) return;

  const src = el.getAttribute("data-lb-src");
  const alt = el.getAttribute("data-lb-alt") || el.getAttribute("alt") || "Imagen";
  if (src) openLB(src, alt);
});

  // ESC para cerrar
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lb.classList.contains("is-open")) closeLB();
  });
}