import { neon } from "@neondatabase/serverless";
import { OAuth2Client } from "google-auth-library";

const sql = neon(process.env.DATABASE_URL);
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const DOCENTES_AUTORIZADOS = ["pablomacon@gmail.com"];

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

async function validarDocente(idToken) {
  if (!idToken) {
    return {
      ok: false,
      status: 400,
      message: "Falta idToken.",
    };
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const email = payload?.email;

  if (!email) {
    return {
      ok: false,
      status: 401,
      message: "No se pudo obtener el correo de Google.",
    };
  }

  if (!esDocenteAutorizado(email)) {
    return {
      ok: false,
      status: 403,
      message: "Usuario no autorizado para acceder al panel docente.",
    };
  }

  return {
    ok: true,
    docente: {
      email,
      nombre: payload?.name || payload?.given_name || "Docente",
    },
  };
}

function limpiarEntero(valor) {
  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero <= 0) {
    return null;
  }

  return numero;
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
    const { idToken, intentoId } = req.body || {};

    const validacion = await validarDocente(idToken);

    if (!validacion.ok) {
      return res.status(validacion.status).json({
        ok: false,
        message: validacion.message,
      });
    }

    const intentoIdLimpio = limpiarEntero(intentoId);

    if (!intentoIdLimpio) {
      return res.status(400).json({
        ok: false,
        message: "intentoId inválido.",
      });
    }

    const intentos = await sql`
      SELECT
        i.id AS intento_id,
        e.id AS estudiante_id,
        e.nombre,
        e.apellido,
        e.grupo,
        a.id AS actividad_id,
        a.slug AS actividad_slug,
        a.titulo AS actividad,
        a.titulo AS actividad_titulo,
        i.numero_intento,
        i.puntaje_obtenido,
        i.puntaje_total,
        i.porcentaje,
        i.juicio,
        i.devolucion,
        i.fecha_intento
      FROM intentos i
      JOIN estudiantes e ON e.id = i.estudiante_id
      JOIN actividades a ON a.id = i.actividad_id
      WHERE i.id = ${intentoIdLimpio}
      LIMIT 1;
    `;

    if (!intentos.length) {
      return res.status(404).json({
        ok: false,
        message: "No se encontró el intento solicitado.",
      });
    }

    const respuestas = await sql`
      SELECT
        id,
        intento_id,
        numero_pregunta,
        tipo_pregunta,
        enunciado_pregunta,
        respuesta_dada,
        respuesta_correcta,
        es_correcta
      FROM respuestas_intento
      WHERE intento_id = ${intentoIdLimpio}
      ORDER BY numero_pregunta ASC;
    `;

    return res.status(200).json({
      ok: true,
      intento: intentos[0],
      respuestas,
    });
  } catch (error) {
    console.error("Error en /api/docente/intento/detalle:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener el detalle del intento.",
    });
  }
}