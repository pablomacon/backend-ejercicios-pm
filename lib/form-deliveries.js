export const FORM_CONFIG = Object.freeze({
  "poo-intro-01": {
    1: { tipo: "tabla_atributos", filas: ["cliente-agencia-viajes", "animal-zoologico", "jugador-futbol", "vehiculo"], campos: ["posibles", "necesarias"] },
    2: { tipo: "tabla_comportamientos", filas: ["cliente-agencia-viajes", "animal-zoologico", "jugador-futbol", "vehiculo"], campos: ["posibles", "necesarias"] },
    3: { tipo: "preguntas_abiertas", preguntas: 8 },
  },
});

function textoObligatorio(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

export function respuestaFormulario(slug, numero, raw) {
  const config = FORM_CONFIG[slug]?.[numero];
  if (!config || !raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const respuestas = raw.respuestas;
  if (!respuestas || typeof respuestas !== "object" || Array.isArray(respuestas)) return null;
  if (config.preguntas) {
    const normalizadas = {};
    for (let index = 1; index <= config.preguntas; index += 1) {
      const value = textoObligatorio(respuestas[`pregunta-${index}`]);
      if (!value) return null;
      normalizadas[`pregunta-${index}`] = value;
    }
    return { version: 1, tipo: config.tipo, respuestas: normalizadas };
  }
  const normalizadas = {};
  for (const fila of config.filas) {
    const source = respuestas[fila];
    if (!source || typeof source !== "object" || Array.isArray(source)) return null;
    normalizadas[fila] = {};
    for (const campo of config.campos) {
      const value = textoObligatorio(source[campo]);
      if (!value) return null;
      normalizadas[fila][campo] = value;
    }
  }
  return { version: 1, tipo: config.tipo, respuestas: normalizadas };
}
