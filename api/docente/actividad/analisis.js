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

function limpiarTexto(valor) {
  const texto = String(valor || "").trim();
  return texto.length ? texto : null;
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

    const validacion = await validarDocente(idToken);

    if (!validacion.ok) {
      return res.status(validacion.status).json({
        ok: false,
        message: validacion.message,
      });
    }

    const actividadSlug = limpiarTexto(req.body?.actividadSlug);
    const grupo = limpiarTexto(req.body?.grupo);

    if (!actividadSlug) {
      return res.status(400).json({
        ok: false,
        message: "Falta actividadSlug.",
      });
    }

    const actividades = await sql`
      SELECT
        id,
        slug,
        titulo
      FROM actividades
      WHERE slug = ${actividadSlug}
      LIMIT 1;
    `;

    if (!actividades.length) {
      return res.status(404).json({
        ok: false,
        message: "No se encontró la actividad solicitada.",
      });
    }

    const preguntas = await sql`
      SELECT
        ri.numero_pregunta,
        COUNT(*)::int AS total_respuestas,
        SUM(CASE WHEN ri.es_correcta THEN 1 ELSE 0 END)::int AS correctas,
        SUM(CASE WHEN ri.es_correcta THEN 0 ELSE 1 END)::int AS incorrectas,
        ROUND(
          100.0 * SUM(CASE WHEN ri.es_correcta THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
          2
        )::float AS porcentaje_acierto
      FROM respuestas_intento ri
      JOIN intentos i ON i.id = ri.intento_id
      JOIN estudiantes e ON e.id = i.estudiante_id
      JOIN actividades a ON a.id = i.actividad_id
      WHERE
        a.slug = ${actividadSlug}
        AND (${grupo}::text IS NULL OR e.grupo = ${grupo})
      GROUP BY ri.numero_pregunta
      ORDER BY ri.numero_pregunta ASC;
    `;

    return res.status(200).json({
      ok: true,
      actividad: actividades[0],
      filtros: {
        grupo,
        actividadSlug,
      },
      total: preguntas.length,
      preguntas,
    });
  } catch (error) {
    console.error("Error en /api/docente/actividad/analisis:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener análisis por pregunta.",
    });
  }
}