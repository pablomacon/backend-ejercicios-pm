import { neon } from "@neondatabase/serverless";

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

/*
  Normaliza respuestas para comparar de forma consistente.

  Debe ser equivalente a la función usada en /api/corregir,
  para que el puntaje general y el detalle por pregunta no se contradigan.
*/
function normalizarRespuesta(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  if (Array.isArray(valor)) {
    return [...valor]
      .map(String)
      .map((v) => v.trim())
      .sort()
      .join("|");
  }

  if (typeof valor === "string") {
    const texto = valor.trim();

    if (!texto) {
      return "";
    }

    // Si viene como string JSON, por ejemplo: '["a","c","d"]'
    if (texto.startsWith("[") && texto.endsWith("]")) {
      try {
        const parsed = JSON.parse(texto);

        if (Array.isArray(parsed)) {
          return parsed
            .map(String)
            .map((v) => v.trim())
            .filter(Boolean)
            .sort()
            .join("|");
        }
      } catch (error) {
        // Si no se puede parsear, sigue como texto normal.
      }
    }

    // Si viene como "a|c|d", también se normaliza como conjunto.
    if (texto.includes("|")) {
      return texto
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean)
        .sort()
        .join("|");
    }

    // Si viene como "a,c,d", también lo aceptamos como múltiple.
    if (texto.includes(",")) {
      return texto
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .sort()
        .join("|");
    }

    return texto;
  }

  return String(valor).trim();
}

function corregirRespuesta({ respuestaDada, respuestaCorrecta }) {
  return (
    normalizarRespuesta(respuestaDada) ===
    normalizarRespuesta(respuestaCorrecta)
  );
}

function respuestaATexto(valor) {
  if (Array.isArray(valor)) {
    return valor.join("|");
  }

  return String(valor ?? "");
}

function limpiarNumeroPregunta(valor) {
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
      message: "Método no permitido",
    });
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

    const actividadResultado = await sql`
      SELECT id, slug
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

    /*
      Traemos respuestas correctas desde BD.
      No confiamos en el frontend para es_correcta ni respuesta_correcta.
    */
    const preguntasBD = await sql`
      SELECT
        numero_pregunta,
        respuesta_correcta
      FROM preguntas
      WHERE actividad_slug = ${actividad_slug}
      ORDER BY numero_pregunta ASC
    `;

    const preguntasPorNumero = new Map();

    for (const pregunta of preguntasBD) {
      preguntasPorNumero.set(Number(pregunta.numero_pregunta), pregunta);
    }

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

    for (const respuesta of respuestas) {
      const numeroPregunta = limpiarNumeroPregunta(
        respuesta.numero ?? respuesta.numero_pregunta,
      );

      if (!numeroPregunta) {
        console.warn(
          "Respuesta ignorada por número de pregunta inválido:",
          respuesta,
        );
        continue;
      }

      const preguntaBD = preguntasPorNumero.get(numeroPregunta);

      const respuestaDada =
        respuesta.respuesta !== undefined
          ? respuesta.respuesta
          : respuesta.respuesta_dada;

      const respuestaDadaTexto = respuestaATexto(respuestaDada);

      const respuestaCorrecta = preguntaBD?.respuesta_correcta ?? "";

      const esCorrecta = preguntaBD
        ? corregirRespuesta({
            respuestaDada,
            respuestaCorrecta,
          })
        : false;

      const enunciadoPregunta =
        respuesta.enunciado ?? respuesta.enunciado_pregunta ?? "";

      const tipoPregunta = respuesta.tipo ?? respuesta.tipo_pregunta ?? "";

      await sql`
        INSERT INTO respuestas_intento (
          intento_id,
          numero_pregunta,
          respuesta_dada,
          es_correcta,
          enunciado_pregunta,
          respuesta_correcta,
          tipo_pregunta
        )
        VALUES (
          ${intento_id},
          ${numeroPregunta},
          ${respuestaDadaTexto},
          ${esCorrecta},
          ${enunciadoPregunta},
          ${respuestaCorrecta},
          ${tipoPregunta}
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
