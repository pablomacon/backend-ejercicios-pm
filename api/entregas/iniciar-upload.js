import { randomUUID } from "node:crypto";
import { access, cors, deliveryFolder, exercise, extension, allowedExtensions, MAX_BYTES, safeName } from "./_shared.js";
export default async function handler(req,res) {
  cors(req,res); if(req.method==="OPTIONS") return res.status(200).end(); if(req.method!=="POST") return res.status(405).json({ok:false,message:"Método no permitido."});
  try {
    const numero=exercise(req.body?.numeroEjercicio), original=String(req.body?.nombreOriginal||""), ext=extension(original), size=Number(req.body?.tamanioBytes);
    if(!numero||!allowedExtensions.has(ext)||!Number.isInteger(size)||size<1||size>MAX_BYTES) return res.status(400).json({ok:false,message:"Datos de archivo no válidos."});
    const {sql,estudiante}=await access(req.body.idToken); const folder=await deliveryFolder(estudiante); const token=randomUUID(); const name=`E${String(numero).padStart(2,"0")}_${safeName(original.replace(new RegExp(`\\.${ext}$`,"i"),""))}_${new Date().toISOString().replace(/[-:.TZ]/g,"") }.${ext}`;
    const response=await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size",{method:"POST",headers:{Authorization:`Bearer ${folder.token}`,"Content-Type":"application/json; charset=UTF-8","X-Upload-Content-Type":String(req.body.mimeType||"application/octet-stream"),"X-Upload-Content-Length":String(size)},body:JSON.stringify({name,parents:[folder.id]})});
    const uploadUrl=response.headers.get("location"); if(!response.ok||!uploadUrl) throw new Error("No se pudo iniciar la sesión de subida en Drive.");
    await sql`INSERT INTO entregas_upload_pendientes (token,estudiante_id,actividad_id,numero_ejercicio,bloque,drive_folder_id,nombre_original,nombre_drive,mime_type,extension,tamanio_bytes) VALUES (${token},${estudiante.id},${estudiante.actividad_id},${numero},${Math.ceil(numero/10)},${folder.id},${original},${name},${String(req.body.mimeType||"application/octet-stream")},${ext},${size})`;
    return res.status(200).json({ok:true,uploadToken:token,uploadUrl});
  } catch(error) { return res.status(error.status||500).json({ok:false,message:error.message||"No se pudo iniciar la subida."}); }
}
