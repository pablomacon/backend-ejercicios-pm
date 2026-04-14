export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Método no permitido" });
  }

  return res.status(200).json({
    ok: true,
    message: "Endpoint creado correctamente. Falta conectar Google y Neon."
  });
}