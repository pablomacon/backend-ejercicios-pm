import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false });
  }

  try {
    const { respuestas, slug, estudianteId } = req.body;

    if (!respuestas || !slug || !estudianteId) {
      return res.status(400).json({
        ok: false,
        message: "Faltan datos",
      });
    }

    const sql = neon(process.env.DATABASE_URL);

    // Traer respuestas correctas desde la BD
    const correctas = await sql`
      SELECT numero_pregunta, respuesta_correcta
      FROM preguntas
      WHERE actividad_slug = ${slug}
    `;

    let puntaje = 0;

    correctas.forEach((pregunta) => {
      const respuestaUsuario = respuestas[pregunta.numero_pregunta];

      if (respuestaUsuario === pregunta.respuesta_correcta) {
        puntaje++;
      }
    });

    // Guardar intento
    await sql`
      INSERT INTO intentos (estudiante_id, actividad_slug, puntaje)
      VALUES (${estudianteId}, ${slug}, ${puntaje})
    `;

    return res.status(200).json({
      ok: true,
      puntaje,
      total: correctas.length,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      message: "Error al corregir",
    });
  }
}