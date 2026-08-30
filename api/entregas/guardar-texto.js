import { access, cors, createDelivery, exercise } from "./_shared.js";
export default async function handler(req,res) {
  cors(req,res); if(req.method==="OPTIONS") return res.status(200).end(); if(req.method!=="POST") return res.status(405).json({ok:false,message:"Método no permitido."});
  try { const numero=exercise(req.body?.numeroEjercicio); const codigo=String(req.body?.codigoTexto||"").trim(); const explicacion=String(req.body?.respuestaExplicacion||"").trim(); if(!numero||!codigo||!explicacion) return res.status(400).json({ok:false,message:"Se requiere programa escrito y respuesta para explicar."}); const {sql,estudiante}=await access(req.body.idToken); const entrega=await createDelivery(sql,{estudianteId:estudiante.id,actividadId:estudiante.actividad_id,numeroEjercicio:numero,tipo:"texto",codigo,explicacion}); return res.status(201).json({ok:true,entrega:entrega[0]}); }
  catch(error) { return res.status(error.status||500).json({ok:false,message:error.message||"No se pudo guardar la entrega."}); }
}
