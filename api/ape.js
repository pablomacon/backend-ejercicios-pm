import { access, cors } from '../lib/entregas.js';
import { publico, evaluar } from '../lib/ape.js';

const slugs = new Set(['ape-serie-a', 'ape-serie-b']);

export function crearHandler(obtenerAcceso = access) {
 return async function handler(req, res) {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Método no permitido.' });
  try {
    const { activitySlug, accion, sessionToken, ejercicio, respuesta } = req.body || {};
    if (!slugs.has(activitySlug)) return res.status(400).json({ ok: false, message: 'Serie no válida.' });
    const { sql, estudiante } = await obtenerAcceso(sessionToken, activitySlug);
    if (accion === 'contenido') {
      const rows = await sql`SELECT identificador, nivel, formato, numero_entrega, datos FROM ape_ejercicios WHERE actividad_slug=${activitySlug} ORDER BY CASE nivel WHEN 'inicial' THEN 1 WHEN 'intermedio' THEN 2 ELSE 3 END, identificador`;
      return res.status(200).json({ ok: true, ejercicios: rows.map(publico) });
    }
    if (accion === 'responder') {
      const rows = await sql`SELECT identificador, nivel, formato, numero_entrega, datos FROM ape_ejercicios WHERE actividad_slug=${activitySlug} AND identificador=${String(ejercicio || '')} LIMIT 1`;
      const resultado = rows.length ? evaluar(rows[0], respuesta) : null;
      if (!resultado) return res.status(400).json({ ok: false, message: 'Respuesta no válida.' });
      await sql`INSERT INTO ape_respuestas (estudiante_id, actividad_id, actividad_slug, ejercicio_id, opcion, correcta) VALUES (${estudiante.id}, ${estudiante.actividad_id}, ${activitySlug}, ${rows[0].identificador}, ${respuesta}, ${resultado.correcta})`;
      return res.status(200).json({ ok: true, ...resultado });
    }
    return res.status(400).json({ ok: false, message: 'Acción no válida.' });
  } catch (error) {
    return res.status(error.status || 500).json({ ok: false, message: error.status ? error.message : 'No se pudo cargar la práctica.' });
  }
 };
}

export default crearHandler();
