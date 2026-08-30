import { randomUUID } from "node:crypto";
import { access, allowedExtensions, cors, createDelivery, deliveryFolder, driveToken, exercise, extension, MAX_BYTES, safeName } from "../lib/entregas.js";

function methodError(res) { return res.status(405).json({ ok: false, message: "Método no permitido." }); }
function fail(res, error, fallback) { return res.status(error.status || 500).json({ ok: false, message: error.message || fallback }); }

async function estado(sql, estudiante) {
  const entregas = await sql`SELECT DISTINCT ON (numero_ejercicio) numero_ejercicio,numero_version,fecha_entrega,tipo_evidencia FROM entregas_ejercicios WHERE estudiante_id=${estudiante.id} AND actividad_id=${estudiante.actividad_id} AND estado='entregado' ORDER BY numero_ejercicio,numero_version DESC`;
  return { ok: true, entregas };
}

async function guardarTexto(sql, estudiante, body) {
  const numero = exercise(body.numeroEjercicio), codigo = String(body.codigoTexto || "").trim(), explicacion = String(body.respuestaExplicacion || "").trim();
  if (!numero || !codigo || !explicacion) { const error = new Error("Se requiere programa escrito y respuesta para explicar."); error.status = 400; throw error; }
  const entrega = await createDelivery(sql, { estudianteId: estudiante.id, actividadId: estudiante.actividad_id, numeroEjercicio: numero, tipo: "texto", codigo, explicacion });
  return { ok: true, entrega: entrega[0] };
}

async function iniciarUpload(sql, estudiante, body) {
  const numero = exercise(body.numeroEjercicio), original = String(body.nombreOriginal || ""), ext = extension(original), size = Number(body.tamanioBytes);
  if (!numero || !allowedExtensions.has(ext) || !Number.isInteger(size) || size < 1 || size > MAX_BYTES) { const error = new Error("Datos de archivo no válidos."); error.status = 400; throw error; }
  const folder = await deliveryFolder(estudiante, Math.ceil(numero / 10)), uploadToken = randomUUID();
  const base = safeName(original.replace(new RegExp(`\\.${ext}$`, "i"), ""));
  const name = `E${String(numero).padStart(2, "0")}_${base}_${new Date().toISOString().replace(/[-:.TZ]/g, "")}.${ext}`;
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size", { method: "POST", headers: { Authorization: `Bearer ${folder.token}`, "Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": String(body.mimeType || "application/octet-stream"), "X-Upload-Content-Length": String(size) }, body: JSON.stringify({ name, parents: [folder.id] }) });
  const uploadUrl = response.headers.get("location"); if (!response.ok || !uploadUrl) throw new Error("No se pudo iniciar la sesión de subida en Drive.");
  await sql`INSERT INTO entregas_upload_pendientes (token,estudiante_id,actividad_id,numero_ejercicio,bloque,drive_folder_id,nombre_original,nombre_drive,mime_type,extension,tamanio_bytes) VALUES (${uploadToken},${estudiante.id},${estudiante.actividad_id},${numero},${Math.ceil(numero / 10)},${folder.id},${original},${name},${String(body.mimeType || "application/octet-stream")},${ext},${size})`;
  return { ok: true, uploadToken, uploadUrl };
}

async function confirmarUpload(sql, estudiante, body) {
  const explicacion = String(body.respuestaExplicacion || "").trim(), fileId = String(body.driveFileId || ""), uploadToken = String(body.uploadToken || "");
  if (!explicacion || !fileId || !uploadToken) { const error = new Error("Faltan datos para confirmar la entrega."); error.status = 400; throw error; }
  const pending = await sql`SELECT * FROM entregas_upload_pendientes WHERE token=${uploadToken} AND estudiante_id=${estudiante.id} AND actividad_id=${estudiante.actividad_id} AND creado_en > now()-interval '1 hour' LIMIT 1`;
  if (!pending.length) { const error = new Error("La sesión de subida no existe o venció."); error.status = 404; throw error; }
  const item = pending[0], auth = await driveToken();
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,parents`, { headers: { Authorization: `Bearer ${auth}` } });
  const file = await response.json(); if (!response.ok || file.id !== fileId || file.name !== item.nombre_drive || !file.parents?.includes(item.drive_folder_id) || Number(file.size) !== Number(item.tamanio_bytes)) { const error = new Error("Drive no confirmó el archivo esperado."); error.status = 400; throw error; }
  const entrega = await createDelivery(sql, { estudianteId: estudiante.id, actividadId: estudiante.actividad_id, numeroEjercicio: item.numero_ejercicio, tipo: "archivo", explicacion });
  await sql`INSERT INTO archivos_entrega (entrega_id,drive_file_id,nombre_original,nombre_drive,mime_type,extension,tamanio_bytes) VALUES (${entrega[0].id},${file.id},${item.nombre_original},${file.name},${file.mimeType || item.mime_type},${item.extension},${item.tamanio_bytes})`;
  await sql`DELETE FROM entregas_upload_pendientes WHERE token=${uploadToken}`;
  return { ok: true, entrega: entrega[0] };
}

export default async function handler(req, res) {
  cors(req, res); if (req.method === "OPTIONS") return res.status(200).end(); if (req.method !== "POST") return methodError(res);
  try {
    const { sql, estudiante } = await access(req.body?.idToken);
    const actions = { estado, "guardar-texto": guardarTexto, "iniciar-upload": iniciarUpload, "confirmar-upload": confirmarUpload };
    const action = actions[req.body?.accion]; if (!action) return res.status(400).json({ ok: false, message: "Acción de entrega no válida." });
    return res.status(200).json(await action(sql, estudiante, req.body || {}));
  } catch (error) { return fail(res, error, "No se pudo procesar la entrega."); }
}
