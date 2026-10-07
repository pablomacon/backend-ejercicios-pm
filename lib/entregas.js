import { neon } from "@neondatabase/serverless";
import { OAuth2Client } from "google-auth-library";
import { verifyStudentSession } from "./student-session.js";

export const DELIVERY_SLUGS = new Set(["arreglos-strings-01", "metodos-java-02", "poo-intro-01"]);
export const FORM_DELIVERY_SLUGS = new Set(["poo-intro-01"]);
export const MAX_BYTES = Number(process.env.ENTREGAS_MAX_BYTES || 104857600);
export const allowedExtensions = new Set(["zip", "jpg", "jpeg", "png", "txt", "java"]);
const deliveryRootByActivity = Object.freeze({
  "arreglos-strings-01": "Ejercicios-arreglos-agosto",
  "metodos-java-02": "Ejercicios-metodos-java"
});
const allowedOrigins = ["https://pablomacon.github.io", "https://actividades.profemacon.net", "https://pm-actividades-hub.pages.dev", "http://localhost:5500", "http://127.0.0.1:5500"];

export function cors(req, res) {
  if (allowedOrigins.includes(req.headers.origin)) res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
  res.setHeader("Vary", "Origin"); res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS"); res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
export function exercise(number) { const value = Number(number); return Number.isInteger(value) && value >= 1 && value <= 50 ? value : null; }
export function extension(name) { return String(name || "").split(".").pop().toLowerCase(); }
export function safeName(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^[_ .]+|[_ .]+$/g, "").slice(0, 100) || "sin_nombre"; }
export async function access(credential, activitySlug) {
  if (!credential) { const error = new Error("Falta la credencial de sesión."); error.status = 401; throw error; }
  const slug = String(activitySlug || "");
  if (!DELIVERY_SLUGS.has(slug)) { const error = new Error("Actividad de entrega no válida."); error.status = 400; throw error; }
  const appSession = verifyStudentSession(credential, slug);
  let email = appSession?.email;
  if (!email) {
    try {
      const ticket = await new OAuth2Client(process.env.GOOGLE_CLIENT_ID).verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
      email = ticket.getPayload()?.email;
    } catch {
      const error = new Error("La sesión venció. Volvé a iniciar sesión para continuar."); error.status = 401; throw error;
    }
  }
  if (!email) { const error = new Error("No se pudo identificar al estudiante."); error.status = 401; throw error; }
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT e.id, e.nombre, e.apellido, e.grupo, a.id AS actividad_id, a.slug AS actividad_slug FROM estudiantes e JOIN realiza r ON r.estudiante_id=e.id JOIN actividades a ON a.id=r.actividad_id WHERE lower(e.correo_electronico)=lower(${email}) AND e.activo=TRUE AND a.slug=${slug} AND a.activa=TRUE AND r.habilitada=TRUE LIMIT 1`;
  if (!rows.length) { const error = new Error("Tu cuenta no está habilitada para esta actividad."); error.status = 403; throw error; }
  return { sql, estudiante: rows[0] };
}
export async function driveToken() {
  const client = new OAuth2Client(process.env.GOOGLE_DRIVE_CLIENT_ID, process.env.GOOGLE_DRIVE_CLIENT_SECRET);
  client.setCredentials({ refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN });
  const token = await client.getAccessToken(); if (!token.token) throw new Error("No se pudo obtener autorización para Google Drive."); return token.token;
}
async function driveJson(url, options = {}) { const response = await fetch(url, options); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error?.message || "Google Drive rechazó la operación."); return data; }
export async function folderId({ token, parentId, name }) {
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and name='${name.replaceAll("'", "\\'")}' and trashed=false`);
  const found = await driveJson(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, { headers: { Authorization: `Bearer ${token}` } });
  if (found.files?.[0]?.id) return found.files[0].id;
  const folder = await driveJson("https://www.googleapis.com/drive/v3/files?fields=id", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] }) });
  return folder.id;
}
export async function deliveryFolder(estudiante, bloque) {
  const token = await driveToken(); const root = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID; if (!root) throw new Error("Falta configurar GOOGLE_DRIVE_ROOT_FOLDER_ID.");
  const activityFolder = deliveryRootByActivity[estudiante.actividad_slug] || `Ejercicios-${safeName(estudiante.actividad_slug)}`;
  const batch = await folderId({ token, parentId: root, name: activityFolder });
  const group = await folderId({ token, parentId: batch, name: safeName(estudiante.grupo) });
  const student = await folderId({ token, parentId: group, name: `${safeName(estudiante.apellido)}_${safeName(estudiante.nombre)}` });
  const block = await folderId({ token, parentId: student, name: `Bloque_${String(bloque).padStart(2, "0")}` });
  return { token, id: block };
}
export async function createDelivery(sql, values) {
  const version = await sql`SELECT COALESCE(MAX(numero_version),0)+1 AS numero FROM entregas_ejercicios WHERE estudiante_id=${values.estudianteId} AND actividad_id=${values.actividadId} AND numero_ejercicio=${values.numeroEjercicio}`;
  return sql`INSERT INTO entregas_ejercicios (estudiante_id,actividad_id,numero_ejercicio,bloque,tipo_evidencia,codigo_texto,respuesta_explicacion,numero_version) VALUES (${values.estudianteId},${values.actividadId},${values.numeroEjercicio},${Math.ceil(values.numeroEjercicio/10)},${values.tipo},${values.codigo || null},${values.explicacion},${version[0].numero}) RETURNING id,numero_version,fecha_entrega`;
}
