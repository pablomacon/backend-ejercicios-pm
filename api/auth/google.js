import { neon } from "@neondatabase/serverless";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://pablomacon.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Método no permitido" });
  }

  try {
    const { idToken, slug } = req.body;

    if (!idToken || !slug) {
      return res.status(400).json({
        ok: false,
        message: "Faltan datos: idToken o slug.",
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

    const resultado = await sql`
  SELECT 
      e.id,
      e.nombre,
      e.apellido,
      e.grupo,
      e.correo_electronico,
      a.titulo
  FROM estudiantes e
  JOIN realiza r ON e.id = r.estudiante_id
  JOIN actividades a ON a.id = r.actividad_id
  WHERE lower(e.correo_electronico) = lower(${correo})
    AND a.slug = ${slug}
    AND e.activo = TRUE
    AND a.activa = TRUE
    AND r.habilitada = TRUE
`;

    if (resultado.length === 0) {
      return res.status(403).json({
        ok: false,
        message: "Tu cuenta no está habilitada para esta actividad.",
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Acceso autorizado.",
      estudiante: resultado[0],
    });
  } catch (error) {
    console.error("Error en /api/auth/google:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al validar la autenticación o consultar la base.",
    });
  }
}
