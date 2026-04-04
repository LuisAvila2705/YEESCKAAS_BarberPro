export const BARBERIA = {
  nombre: "YEESCKAAS BARBER SHOP",
  slogan: "Corte limpio. Estilo con actitud.",
  descripcion:
    "Agenda tu cita en línea en menos de un minuto. Atención profesional, ambiente cómodo y resultados de calidad.",

  // Ubicación (real)
  zonaCorta: "Cumbres de Santa Catarina",
  ciudadCorta: "Santa Catarina, N.L.",
  direccion:
    "John Ruskin 2901, Cumbres de Santa Catarina Primer Sector, 66358 Cd. Santa Catarina, N.L.",
  googleMapsUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(
      "John Ruskin 2901, Cumbres de Santa Catarina Primer Sector, 66358 Cd. Santa Catarina, N.L."
    ),

  // WhatsApp (REAL) -> Formato internacional para wa.me (MX = 52)
  // Número: 8110063378  => wa.me/528110063378
  whatsapp: "528110063378",
  telefono: "8110063378",

  // Horarios (reales)
  horarios: [
    { dia: "Lunes", horas: "11:00 a.m. – 8:00 p.m." },
    { dia: "Martes", horas: "11:00 a.m. – 8:00 p.m." },
    { dia: "Miércoles", horas: "11:00 a.m. – 8:00 p.m." },
    { dia: "Jueves", horas: "11:00 a.m. – 8:00 p.m." },
    { dia: "Viernes", horas: "11:00 a.m. – 8:00 p.m." },
    { dia: "Sábado", horas: "10:00 a.m. – 6:00 p.m." },
    { dia: "Domingo", horas: "Cerrado" }
  ],

  // Servicios (precios reales según captura)
  servicios: [
    { nombre: "Corte sin cita ni navajas", precio: 140, precioTexto: "$140", duracion: "30–40 min" },
    { nombre: "Corte c/n sin cita", precio: 160, precioTexto: "$160", duracion: "40–50 min" },
    { nombre: "Corte con cita FULL", precio: 200, precioTexto: "$200", duracion: "40–50 min" },
    { nombre: "Complemento: Ceja", precio: 50, precioTexto: "$50", duracion: "10–15 min" },
    { nombre: "Complemento: Barba", precio: 100, precioTexto: "$100", duracion: "20–30 min" },
    { nombre: "Complemento: Mascarilla", precio: 80, precioTexto: "$80", duracion: "20–30 min" }
  ],

  // Galería (cortes + local)
  galeria: [
    { src: "/assets/corte1.png", alt: "Corte estilo fade con barba" },
    { src: "/assets/corte2.png", alt: "Corte clásico con desvanecido" },
    { src: "/assets/corte3.png", alt: "Rizos con taper fade" },
    { src: "/assets/corte4.png", alt: "Corte low fade" },
    { src: "/assets/corte5.png", alt: "Corte infantil" },
    { src: "/assets/local1.png", alt: "Interior de la barbería" }
  ],

  // (Opcional) Si ya usas el filtro en inicio.js, NO ocupas heroCollage
  // Si lo quieres conservar para futuro, déjalo:
  heroCollage: [
    { src: "/assets/corte1.png", alt: "Corte estilo fade con barba" },
    { src: "/assets/corte2.png", alt: "Corte clásico con desvanecido" },
    { src: "/assets/corte3.png", alt: "Rizos con taper fade" },
    { src: "/assets/corte4.png", alt: "Corte low fade" },
    { src: "/assets/corte5.png", alt: "Corte infantil" }
  ],

  // Redes (solo URLs reales; NO metas whatsapp aquí para evitar duplicados)
  redes: {
    instagram: "https://www.instagram.com/yeesckaasbarbershop/",
    facebook: "https://www.facebook.com/yeesckaasbarbershop",
    tiktok: "" // si no hay, se deja vacío (y luego lo ocultamos en UI)
  }
};