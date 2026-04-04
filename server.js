import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(express.json({ limit: "1mb" }));

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, servicio: "barberia-pwa" });
});

// (Más adelante) API: /api/...
// app.use("/api", ...);

// Servir estáticos del frontend
app.use(express.static(path.join(__dirname, "public")));

// Fallback SPA (para rutas tipo #/citas funciona igual, pero lo dejamos bien)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
