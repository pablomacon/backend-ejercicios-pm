import { neon } from "@neondatabase/serverless";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const allowedOrigins = [
  "https://pablomacon.github.io",
  "https://actividades.profemacon.net",
  "https://pm-actividades-hub.pages.dev",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];

export default async function handler(req, res) {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Método no permitido" });
  }

  try {
    const { idToken, actividadSlug } = req.body;

    if (!idToken || !actividadSlug) {
      return res.status(400).json({
        ok: false,
        message: "Faltan datos: idToken o actividadSlug.",
      });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(401).json({
        ok: false,
        message: "No se pudo obtener el correo desde Google.",
      });
    }

    const sql = neon(process.env.DATABASE_URL);

    const estudianteResultado = await sql`
      SELECT id, nombre, apellido, grupo, correo_electronico
      FROM estudiantes
      WHERE lower(correo_electronico) = lower(${payload.email})
        AND activo = TRUE
      LIMIT 1
    `;

    if (estudianteResultado.length === 0) {
      return res.status(403).json({
        ok: false,
        message: "Estudiante no encontrado o inactivo.",
      });
    }

    const estudiante = estudianteResultado[0];

    const actividadResultado = await sql`
      SELECT id, slug, titulo
      FROM actividades
      WHERE slug = ${actividadSlug}
        AND activa = TRUE
      LIMIT 1
    `;

    if (actividadResultado.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Actividad no encontrada.",
      });
    }

    const actividad = actividadResultado[0];

    const intentoResultado = await sql`
      SELECT
        id,
        numero_intento,
        puntaje_obtenido,
        puntaje_total,
        porcentaje,
        juicio,
        devolucion,
        fecha_intento
      FROM intentos
      WHERE estudiante_id = ${estudiante.id}
        AND actividad_id = ${actividad.id}
      ORDER BY porcentaje DESC, fecha_intento DESC
      LIMIT 1
    `;

    if (intentoResultado.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No hay intentos registrados para esta actividad.",
      });
    }

    const intento = intentoResultado[0];

    const respuestas = await sql`
      SELECT
        numero_pregunta,
        respuesta_dada,
        respuesta_correcta,
        es_correcta,
        enunciado_pregunta,
        tipo_pregunta
      FROM respuestas_intento
      WHERE intento_id = ${intento.id}
      ORDER BY numero_pregunta
    `;

    return res.status(200).json({
      ok: true,
      estudiante,
      actividad,
      intento,
      respuestas,
    });
  } catch (error) {
    console.error("Error en /api/intentos/mejor:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener el mejor intento.",
    });
  }
}
