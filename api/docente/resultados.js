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
  return String(correo || "")
    .trim()
    .toLowerCase();
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

function limpiarModoIntento(valor) {
  const modo = String(valor || "ultimo")
    .trim()
    .toLowerCase();

  if (["ultimo", "mejor", "todos"].includes(modo)) {
    return modo;
  }

  return "ultimo";
}

async function obtenerTodosLosIntentos({ grupo, actividadSlug }) {
  return sql`
    SELECT
      i.id AS intento_id,
      e.id AS estudiante_id,
      e.nombre,
      e.apellido,
      e.grupo,
      a.id AS actividad_id,
      a.slug AS actividad_slug,
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
    WHERE
      (${grupo}::text IS NULL OR e.grupo = ${grupo})
      AND (${actividadSlug}::text IS NULL OR a.slug = ${actividadSlug})
    ORDER BY i.fecha_intento DESC, e.apellido ASC, e.nombre ASC;
  `;
}

async function obtenerUltimosIntentos({ grupo, actividadSlug }) {
  return sql`
    SELECT *
    FROM (
      SELECT DISTINCT ON (i.estudiante_id, i.actividad_id)
        i.id AS intento_id,
        e.id AS estudiante_id,
        e.nombre,
        e.apellido,
        e.grupo,
        a.id AS actividad_id,
        a.slug AS actividad_slug,
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
      WHERE
        (${grupo}::text IS NULL OR e.grupo = ${grupo})
        AND (${actividadSlug}::text IS NULL OR a.slug = ${actividadSlug})
      ORDER BY
        i.estudiante_id,
        i.actividad_id,
        i.fecha_intento DESC,
        i.numero_intento DESC
    ) resultados
    ORDER BY fecha_intento DESC, apellido ASC, nombre ASC;
  `;
}

async function obtenerMejoresIntentos({ grupo, actividadSlug }) {
  return sql`
    SELECT *
    FROM (
      SELECT DISTINCT ON (i.estudiante_id, i.actividad_id)
        i.id AS intento_id,
        e.id AS estudiante_id,
        e.nombre,
        e.apellido,
        e.grupo,
        a.id AS actividad_id,
        a.slug AS actividad_slug,
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
      WHERE
        (${grupo}::text IS NULL OR e.grupo = ${grupo})
        AND (${actividadSlug}::text IS NULL OR a.slug = ${actividadSlug})
      ORDER BY
        i.estudiante_id,
        i.actividad_id,
        i.porcentaje DESC,
        i.fecha_intento DESC,
        i.numero_intento DESC
    ) resultados
    ORDER BY fecha_intento DESC, apellido ASC, nombre ASC;
  `;
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

    const grupo = limpiarTexto(req.body?.grupo);
    const actividadSlug = limpiarTexto(req.body?.actividadSlug);
    const modoIntento = limpiarModoIntento(req.body?.modoIntento);

    let resultados = [];

    if (modoIntento === "todos") {
      resultados = await obtenerTodosLosIntentos({ grupo, actividadSlug });
    } else if (modoIntento === "mejor") {
      resultados = await obtenerMejoresIntentos({ grupo, actividadSlug });
    } else {
      resultados = await obtenerUltimosIntentos({ grupo, actividadSlug });
    }

    return res.status(200).json({
      ok: true,
      filtros: {
        grupo,
        actividadSlug,
        modoIntento,
      },
      total: resultados.length,
      resultados,
    });
  } catch (error) {
    console.error("Error en /api/docente/resultados:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener resultados docentes.",
    });
  }
}
