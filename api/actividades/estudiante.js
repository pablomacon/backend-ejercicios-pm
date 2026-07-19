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

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      message: "Método no permitido",
    });
  }

  try {
    const { idToken, anio, asignatura } = req.body;

    if (!idToken || !anio || !asignatura) {
      return res.status(400).json({
        ok: false,
        message: "Faltan datos: idToken, anio o asignatura.",
      });
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(401).json({
        ok: false,
        message: "No se pudo obtener el correo desde Google.",
      });
    }

    const correo = payload.email;
    const sql = neon(process.env.DATABASE_URL);

    const estudianteResultado = await sql`
      SELECT id, nombre, apellido, grupo, correo_electronico
      FROM estudiantes
      WHERE lower(correo_electronico) = lower(${correo})
        AND activo = TRUE
      LIMIT 1
    `;

    if (estudianteResultado.length === 0) {
      return res.status(403).json({
        ok: false,
        message: "Tu cuenta no está registrada o no está activa.",
      });
    }

    const estudiante = estudianteResultado[0];

    const actividades = await sql`
      SELECT
        a.id,
        a.slug,
        a.titulo,
        a.descripcion,
        a.url,
        a.anio,
        a.asignatura,
        a.tema,
        a.orden,
        r.habilitada,
        COUNT(i.id)::int AS intentos_realizados,
        MAX(i.porcentaje)::numeric AS mejor_porcentaje,
        MAX(i.puntaje_obtenido)::numeric AS mejor_puntaje,
        MAX(i.puntaje_total)::numeric AS puntaje_total,
        MAX(i.juicio) AS juicio,
        MAX(i.fecha_intento) AS ultimo_intento
      FROM realiza r
      JOIN actividades a ON a.id = r.actividad_id
      LEFT JOIN intentos i
        ON i.actividad_id = a.id
       AND i.estudiante_id = r.estudiante_id
      WHERE r.estudiante_id = ${estudiante.id}
        AND a.anio = ${anio}
        AND a.asignatura = ${asignatura}
        AND a.activa = TRUE
      GROUP BY
        a.id,
        a.slug,
        a.titulo,
        a.descripcion,
        a.url,
        a.anio,
        a.asignatura,
        a.tema,
        a.orden,
        r.habilitada
      ORDER BY a.orden DESC, a.fecha_creacion DESC
    `;

    return res.status(200).json({
      ok: true,
      estudiante,
      actividades,
    });
  } catch (error) {
    console.error("Error en /api/actividades/estudiante:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al obtener las actividades del estudiante.",
    });
  }
}
