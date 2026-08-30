import { access, cors } from "./_shared.js";
export default async function handler(req,res) {
  cors(req,res); if(req.method==="OPTIONS") return res.status(200).end(); if(req.method!=="POST") return res.status(405).json({ok:false,message:"Método no permitido."});
  try { const {sql,estudiante}=await access(req.body?.idToken); const entregas=await sql`SELECT DISTINCT ON (numero_ejercicio) numero_ejercicio,numero_version,fecha_entrega,tipo_evidencia FROM entregas_ejercicios WHERE estudiante_id=${estudiante.id} AND actividad_id=${estudiante.actividad_id} AND estado='entregado' ORDER BY numero_ejercicio,numero_version DESC`; return res.status(200).json({ok:true,entregas}); }
  catch(error) { return res.status(error.status||500).json({ok:false,message:error.message||"No se pudo recuperar el estado."}); }
}
