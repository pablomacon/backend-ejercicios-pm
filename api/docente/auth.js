import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const DOCENTES_AUTORIZADOS = [
  "pablomacon@gmail.com",
];

const allowedOrigins = [
  "https://pablomacon.github.io",
  "https://actividades.profemacon.net",
  "https://pm-actividades-hub.pages.dev",

  // Panel docente
  "https://resultados.profemacon.net",
  "https://resultados-pm.pages.dev",

  // Desarrollo local
  "http://localhost",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function normalizarCorreo(correo) {
  return String(correo || "").trim().toLowerCase();
}

function esDocenteAutorizado(correo) {
  const correoNormalizado = normalizarCorreo(correo);

  return DOCENTES_AUTORIZADOS.some(
    (docente) => normalizarCorreo(docente) === correoNormalizado,
  );
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "Método no permitido.",
    });
  }

  try {
    const { idToken } = req.body || {};

    if (!idToken) {
      return res.status(400).json({
        ok: false,
        message: "Falta idToken.",
      });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const email = payload?.email;
    const name = payload?.name || payload?.given_name || "Docente";

    if (!email) {
      return res.status(401).json({
        ok: false,
        message: "No se pudo obtener el correo de Google.",
      });
    }

    if (!esDocenteAutorizado(email)) {
      return res.status(403).json({
        ok: false,
        message: "Usuario no autorizado para acceder al panel docente.",
      });
    }

    return res.status(200).json({
      ok: true,
      docente: {
        email,
        nombre: name,
      },
    });
  } catch (error) {
    console.error("Error en /api/docente/auth:", error);

    return res.status(401).json({
      ok: false,
      message: "Token inválido o no verificable.",
    });
  }
}