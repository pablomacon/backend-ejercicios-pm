import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Método no permitido" });
  }

  try {
    const { correo, slug } = req.body;

    if (!correo || !slug) {
      return res.status(400).json({
        ok: false,
        message: "Faltan datos: correo o slug.",
      });
    }

    const sql = neon(process.env.DATABASE_URL);

    const resultado = await sql`
      SELECT 
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
        message: "El estudiante no está habilitado para esta actividad.",
      });
    }

    const estudiante = resultado[0];

    return res.status(200).json({
      ok: true,
      message: "Acceso autorizado.",
      estudiante,
    });
  } catch (error) {
    console.error("Error en /api/auth/google:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al consultar la base de datos.",
    });
  }
}
