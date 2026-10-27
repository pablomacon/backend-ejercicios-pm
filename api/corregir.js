import { neon } from "@neondatabase/serverless";
import { corregirUml, esActividadUml, UML_TOTAL } from "../lib/uml-drag.js";
import { verifyStudentSession } from "../lib/student-session.js";

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

  Soporta:
  - radio: "a"
  - text: "respuesta"
  - checkbox como array: ["a", "c", "d"]
  - checkbox como JSON string: '["a","c","d"]'
  - checkbox como string separado por "|": "a|c|d"

  En todos los casos múltiples, ordena alfabéticamente:
  ["d", "a", "c"] -> "a|c|d"
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
    const { respuestas, slug, estudianteId, sessionToken } = req.body;

    if (esActividadUml(slug)) {
      const session = verifyStudentSession(sessionToken, slug);
      if (!session) return res.status(401).json({ ok: false, message: "Sesión inválida o vencida." });
      const detalles = [];
      try { for (let numero = 1; numero <= 7; numero += 1) detalles.push(corregirUml(respuestas?.[numero], numero)); }
      catch (error) { return res.status(400).json({ ok: false, message: error.message }); }
      const puntaje = detalles.reduce((s, d) => s + d.puntaje, 0);
      const total = detalles.reduce((s, d) => s + d.total, 0);
      if (total !== UML_TOTAL) throw new Error("La clave UML tiene un total inconsistente.");
      return res.status(200).json({ ok: true, puntaje, total, detalles });
    }

    if (!respuestas || !slug || !estudianteId) {
      return res.status(400).json({
        ok: false,
        message: "Faltan datos: respuestas, slug o estudianteId.",
      });
    }

    const sql = neon(process.env.DATABASE_URL);

    const correctas = await sql`
      SELECT numero_pregunta, respuesta_correcta
      FROM preguntas
      WHERE actividad_slug = ${slug}
      ORDER BY numero_pregunta
    `;

    if (correctas.length === 0) {
      return res.status(404).json({
        ok: false,
        message: "No se encontraron respuestas correctas para esta actividad.",
      });
    }

    let puntaje = 0;

    for (const pregunta of correctas) {
      const numero = pregunta.numero_pregunta;
      const respuestaUsuario = respuestas[numero];

      const usuarioNormalizada = normalizarRespuesta(respuestaUsuario);
      const correctaNormalizada = normalizarRespuesta(
        pregunta.respuesta_correcta,
      );

      if (usuarioNormalizada === correctaNormalizada) {
        puntaje++;
      }
    }

    return res.status(200).json({
      ok: true,
      puntaje,
      total: correctas.length,
    });
  } catch (error) {
    console.error("Error en /api/corregir:", error);

    return res.status(500).json({
      ok: false,
      message: "Error al corregir la actividad.",
    });
  }
}
