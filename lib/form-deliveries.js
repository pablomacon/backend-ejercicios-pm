export const FORM_CONFIG = Object.freeze({
  "poo-intro-01": {
    1: { tipo: "tabla_atributos", filas: ["cliente-agencia-viajes", "animal-zoologico", "jugador-futbol", "vehiculo"], campos: ["posibles", "necesarias"] },
    2: { tipo: "tabla_comportamientos", filas: ["cliente-agencia-viajes", "animal-zoologico", "jugador-futbol", "vehiculo"], campos: ["posibles", "necesarias"] },
    3: { tipo: "preguntas_abiertas", preguntas: 8 },
  },
  "poo-modelado-01": {
    1: { tipo: "modelo_objeto", seleccionMultiple: ["caracteristicasPosibles", "atributosNecesarios", "comportamientosPosibles", "metodosNecesarios"], textos: ["objetoPrincipal", "nombreModelo", "justificacion"], listas: { atributosModelo: 4, metodosModelo: 3 } },
  },
  "poo-estado-01": {
    1: { tipo: "reflexion_acceso_directo", opciones: ["resultadoMarcarGol", "permiteValorInvalido", "tieneSentidoValorInvalido"], textos: ["propuesta"], },
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
  if (config.seleccionMultiple) {
    const normalizadas = {};
    for (const campo of config.seleccionMultiple) {
      const valores = respuestas[campo];
      if (!Array.isArray(valores) || !valores.length || valores.some((valor) => !textoObligatorio(valor))) return null;
      normalizadas[campo] = valores.map((valor) => textoObligatorio(valor));
    }
    for (const campo of config.textos) {
      const valor = textoObligatorio(respuestas[campo]);
      if (!valor) return null;
      normalizadas[campo] = valor;
    }
    for (const [campo, cantidad] of Object.entries(config.listas)) {
      const valores = respuestas[campo];
      if (!Array.isArray(valores) || valores.length !== cantidad) return null;
      normalizadas[campo] = valores.map(textoObligatorio);
      if (normalizadas[campo].some((valor) => !valor)) return null;
    }
    return { version: 1, tipo: config.tipo, respuestas: normalizadas };
  }
  if (config.opciones) {
    const normalizadas = {};
    for (const campo of config.opciones) {
      const valor = textoObligatorio(respuestas[campo]);
      if (!valor) return null;
      normalizadas[campo] = valor;
    }
    for (const campo of config.textos) {
      const valor = textoObligatorio(respuestas[campo]);
      if (!valor) return null;
      normalizadas[campo] = valor;
    }
    return { version: 1, tipo: config.tipo, respuestas: normalizadas };
  }
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
