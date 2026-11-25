import test from 'node:test';
import assert from 'node:assert/strict';
import { publico, evaluar } from '../lib/ape.js';
import handler, { crearHandler } from '../api/ape.js';

const row = { identificador: 'A-01', nivel: 'inicial', formato: 'opcion', numero_entrega: null, datos: { consigna: 'Ejemplo', opciones: ['a', 'b', 'c', 'd'], clave: 2, justificacion: 'Explicación', java: 'privado', pruebas: ['privado'], criterios: ['privado'] } };
test('el contenido público excluye claves y material docente', () => {
  const visible = publico(row);
  assert.deepEqual(visible.opciones, ['a', 'b', 'c', 'd']);
  for (const key of ['clave', 'justificacion', 'java', 'pruebas', 'criterios']) assert.equal(Object.hasOwn(visible, key), false);
});
test('la corrección valida la opción y explica después de responder', () => {
  assert.deepEqual(evaluar(row, 2), { correcta: true, justificacion: 'Explicación' });
  assert.deepEqual(evaluar(row, 1), { correcta: false, justificacion: 'Explicación' });
  for (const value of [-1, 4, 0.5, '2', null]) assert.equal(evaluar(row, value), null);
});
test('verdadero y falso se corresponden con las opciones mostradas', () => {
  const vf = { ...row, formato: 'verdadero-falso', datos: { consigna: 'Ejemplo', clave: false, justificacion: 'No.' } };
  assert.deepEqual(publico(vf).opciones, ['Verdadero', 'Falso']);
  assert.equal(evaluar(vf, 1).correcta, true);
  assert.equal(evaluar(vf, 0).correcta, false);
});
test('la API rechaza acceso sin credencial y series ajenas', async () => {
  const mock = () => ({ statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; }, end() { return this; } });
  let res = mock();
  await handler({ method: 'POST', headers: {}, body: { activitySlug: 'ape-serie-a', accion: 'contenido' } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.ok, false);
  res = mock();
  await handler({ method: 'POST', headers: {}, body: { activitySlug: 'otra', accion: 'contenido' } }, res);
  assert.equal(res.statusCode, 400);
});
test('una respuesta válida se registra antes de mostrar su corrección', async () => {
  const llamadas = [];
  const sql = async (partes, ...valores) => {
    llamadas.push({ texto: partes.join('?'), valores });
    if (partes[0].includes('SELECT')) return [row];
    return [];
  };
  const handle = crearHandler(async () => ({ sql, estudiante: { id: 24, actividad_id: 10 } }));
  const res = { setHeader() {}, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } };
  await handle({ method: 'POST', headers: {}, body: { activitySlug: 'ape-serie-a', accion: 'responder', ejercicio: 'A-01', respuesta: 2 } }, res);
  assert.equal(res.body.correcta, true);
  assert.equal(llamadas.length, 2);
  assert.match(llamadas[1].texto, /INSERT INTO ape_respuestas/);
  assert.deepEqual(llamadas[1].valores, [24, 10, 'ape-serie-a', 'A-01', 2, true]);
});
test('una respuesta no válida no se guarda', async () => {
  let llamadas = 0;
  const handle = crearHandler(async () => ({ sql: async () => { llamadas++; return [row]; }, estudiante: { id: 24, actividad_id: 10 } }));
  const res = { setHeader() {}, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } };
  await handle({ method: 'POST', headers: {}, body: { activitySlug: 'ape-serie-a', accion: 'responder', ejercicio: 'A-01', respuesta: 9 } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(llamadas, 1);
});
test('si falla el guardado no se informa éxito', async () => {
  let llamadas = 0;
  const handle = crearHandler(async () => ({ sql: async () => { if (++llamadas === 1) return [row]; throw new Error('falló la base'); }, estudiante: { id: 24, actividad_id: 10 } }));
  const res = { setHeader() {}, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; return this; } };
  await handle({ method: 'POST', headers: {}, body: { activitySlug: 'ape-serie-a', accion: 'responder', ejercicio: 'A-01', respuesta: 2 } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.ok, false);
});
