import { neon } from "@neondatabase/serverless";

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
    const {
      estudiante_id,
      actividad_slug,
      puntaje_obtenido,
      puntaje_total,
      porcentaje,
      juicio,
      devolucion,
      respuestas,
    } = req.body;

    if (
      !estudiante_id ||
      !actividad_slug ||
      puntaje_obtenido === undefined ||
      !puntaje_total ||
      porcentaje === undefined ||
      !juicio ||
      !devolucion ||
      !Array.isArray(respuestas)
    ) {
      return res.status(400).json({
        ok: false,
        message: "Faltan datos obligatorios para guardar el intento.",
      });
    }

    const sql = neon(process.env.DATABASE_URL);

    // Buscar la actividad
    const actividadResultado = await sql`
      SELECT id
      FROM actividades
      WHERE slug = ${actividad_slug}
        AND activa = TRUE
      LIMIT 1
    `;

    if (actividadResultado.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "Actividad no encontrada.",
      });
    }

    const actividad_id = actividadResultado[0].id;

    // Verificar que el estudiante esté habilitado para esa actividad
    const habilitacionResultado = await sql`
      SELECT id
      FROM realiza
      WHERE estudiante_id = ${estudiante_id}
        AND actividad_id = ${actividad_id}
        AND habilitada = TRUE
      LIMIT 1
    `;

    if (habilitacionResultado.length === 0) {
      return res.status(403).json({
        ok: false,
        message: "El estudiante no está habilitado para esta actividad.",
      });
    }

    // Obtener próximo número de intento
    const intentoResultado = await sql`
      SELECT COALESCE(MAX(numero_intento), 0) AS max_intento
      FROM intentos
      WHERE estudiante_id = ${estudiante_id}
        AND actividad_id = ${actividad_id}
    `;

    const numero_intento = Number(intentoResultado[0].max_intento) + 1;

    if (numero_intento > 2) {
      return res.status(403).json({
        ok: false,
        message: "Ya se alcanzó el máximo de 2 intentos para esta actividad.",
      });
    }

    // Insertar intento
    const nuevoIntento = await sql`
      INSERT INTO intentos (
        estudiante_id,
        actividad_id,
        numero_intento,
        puntaje_obtenido,
        puntaje_total,
        porcentaje,
        juicio,
        devolucion
      )
      VALUES (
        ${estudiante_id},
        ${actividad_id},
        ${numero_intento},
        ${puntaje_obtenido},
        ${puntaje_total},
        ${porcentaje},
        ${juicio},
        ${devolucion}
      )
      RETURNING id
    `;

    const intento_id = nuevoIntento[0].id;

    // Insertar respuestas
    for (const respuesta of respuestas) {
      await sql`
        INSERT INTO respuestas_intento (
          intento_id,
          numero_pregunta,
          respuesta_dada,
          es_correcta
        )
        VALUES (
          ${intento_id},
          ${respuesta.numero_pregunta},
          ${respuesta.respuesta_dada ?? ""},
          ${respuesta.es_correcta}
        )
      `;
    }

    return res.status(200).json({
      ok: true,
      message: "Intento guardado correctamente.",
      intento_id,
      numero_intento,
    });
  } catch (error) {
    console.error("Error en /api/intentos/guardar:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al guardar el intento en la base de datos.",
    });
  }
}
