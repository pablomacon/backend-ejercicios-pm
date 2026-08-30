import { neon } from "@neondatabase/serverless";
import { OAuth2Client } from "google-auth-library";

const sql = neon(process.env.DATABASE_URL);
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const docentes = new Set(["pablomacon@gmail.com"]);
const origins = ["https://pablomacon.github.io", "https://actividades.profemacon.net", "https://pm-actividades-hub.pages.dev", "https://resultados.profemacon.net", "https://resultados-pm.pages.dev", "http://localhost", "http://localhost:5500", "http://127.0.0.1:5500"];

function cors(req, res) {
  if (origins.includes(req.headers.origin)) res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
  res.setHeader("Vary", "Origin"); res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
async function validate(idToken) {
  if (!idToken) { const error = new Error("Falta idToken."); error.status = 400; throw error; }
  const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
  const email = String(ticket.getPayload()?.email || "").trim().toLowerCase();
  if (!email || !docentes.has(email)) { const error = new Error("Usuario no autorizado para acceder a entregas."); error.status = 403; throw error; }
}

export default async function handler(req, res) {
  cors(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Método no permitido." });
  try {
    await validate(req.body?.idToken);
    const grupo = String(req.body?.grupo || "").trim() || null;
    const entregas = await sql`
      SELECT
        en.id AS entrega_id, e.nombre, e.apellido, e.grupo,
        en.numero_ejercicio, en.bloque, en.numero_version, en.tipo_evidencia,
        en.codigo_texto, en.respuesta_explicacion, en.fecha_entrega,
        ar.nombre_original, ar.tamanio_bytes, ar.drive_file_id
      FROM entregas_ejercicios en
      JOIN estudiantes e ON e.id = en.estudiante_id
      JOIN actividades a ON a.id = en.actividad_id
      LEFT JOIN archivos_entrega ar ON ar.entrega_id = en.id
      WHERE a.slug = 'arreglos-strings-01'
        AND (${grupo}::text IS NULL OR e.grupo = ${grupo})
      ORDER BY en.fecha_entrega DESC, e.apellido, e.nombre, en.numero_ejercicio, en.numero_version DESC
    `;
    return res.status(200).json({ ok: true, entregas });
  } catch (error) {
    console.error("Error en /api/docente/entregas:", error);
    return res.status(error.status || 500).json({ ok: false, message: error.message || "No se pudieron cargar las entregas." });
  }
}
