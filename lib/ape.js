export function publico(row) {
  const d = row.datos;
  return {
    id: row.identificador, nivel: row.nivel, formato: row.formato,
    numeroEntrega: row.numero_entrega, titulo: d.titulo || '',
    consigna: d.consigna, opciones: row.formato === 'verdadero-falso' ? ['Verdadero', 'Falso'] : (d.opciones || []),
    codigoEjemplo: d.codigoEjemplo || '', consignaDespues: d.consignaDespues || '', opcionesCodigo: d.opcionesCodigo === true,
    pistas: d.pistas || [], contenidos: d.contenidos || [],
  };
}

export function evaluar(row, respuesta) {
  if (row.formato === 'codigo') return null;
  if (!Number.isInteger(respuesta) || respuesta < 0 || respuesta >= (row.formato === 'opcion' ? row.datos.opciones.length : 2)) return null;
  const clave = row.formato === 'verdadero-falso' ? (row.datos.clave ? 0 : 1) : row.datos.clave;
  return { correcta: respuesta === clave, justificacion: row.datos.justificacion };
}
