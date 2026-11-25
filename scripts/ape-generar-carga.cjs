// Emite sentencias con material docente privado. No guardar la salida en Git.
const fs = require('node:fs');
const path = require('node:path');
const base = process.argv[2];
if (!base) throw new Error('Indicá la carpeta de los borradores privados.');
const literal = value => `'${String(value).replaceAll("'", "''")}'`;
const statements = [];
for (const serie of ['a', 'b']) {
  const read = name => JSON.parse(fs.readFileSync(path.join(base, name), 'utf8'));
  const questions = read(`borrador-ape-serie-${serie}.json`);
  const code = read(`borrador-ape-${serie}-codigo.json`);
  if (questions.length !== 20 || code.length !== 10) throw new Error(`Cantidad incorrecta en serie ${serie}`);
  for (const [index, item] of [...questions, ...code].entries()) {
    const format = index < 20 ? item.formato : 'codigo';
    const number = format === 'codigo' ? index - 19 : null;
    if (!item.id || !item.consigna || !['inicial', 'intermedio', 'integrador'].includes(item.nivel)) throw new Error('Ejercicio incompleto');
    if (format === 'opcion' && (!Array.isArray(item.opciones) || item.opciones.length !== 4 || !Number.isInteger(item.clave) || item.clave < 0 || item.clave > 3)) throw new Error(`Clave no válida: ${item.id}`);
    if (format === 'verdadero-falso' && typeof item.clave !== 'boolean') throw new Error(`Clave no válida: ${item.id}`);
    if (!['codigo', 'opcion', 'verdadero-falso'].includes(format)) throw new Error(`Formato no válido: ${item.id}`);
    statements.push(`INSERT INTO ape_ejercicios (actividad_slug, identificador, nivel, formato, numero_entrega, datos) VALUES (${literal(`ape-serie-${serie}`)}, ${literal(item.id)}, ${literal(item.nivel)}, ${literal(format)}, ${number === null ? 'NULL' : number}, ${literal(JSON.stringify(item))}::jsonb) ON CONFLICT (actividad_slug, identificador) DO UPDATE SET nivel=EXCLUDED.nivel, formato=EXCLUDED.formato, numero_entrega=EXCLUDED.numero_entrega, datos=EXCLUDED.datos`);
  }
}
process.stdout.write(JSON.stringify(statements));
