import test from "node:test";
import assert from "node:assert/strict";
import { respuestaFormulario } from "../lib/form-deliveries.js";

const filas = ["cliente-agencia-viajes", "animal-zoologico", "jugador-futbol", "vehiculo"];

test("normalizes a complete POO attribute table and keeps line breaks", () => {
  const respuestas = Object.fromEntries(filas.map((fila) => [fila, { posibles: "nombre\nedad", necesarias: "nombre" }]));
  const result = respuestaFormulario("poo-intro-01", 1, { respuestas });

  assert.deepEqual(result, {
    version: 1,
    tipo: "tabla_atributos",
    respuestas: Object.fromEntries(filas.map((fila) => [fila, { posibles: "nombre\nedad", necesarias: "nombre" }])),
  });
});

test("rejects incomplete tables and unsupported exercises", () => {
  assert.equal(respuestaFormulario("poo-intro-01", 1, { respuestas: {} }), null);
  assert.equal(respuestaFormulario("poo-intro-01", 4, { respuestas: {} }), null);
});

test("requires all eight open responses", () => {
  const answers = Object.fromEntries(Array.from({ length: 8 }, (_, index) => [`pregunta-${index + 1}`, `respuesta ${index + 1}`]));
  assert.equal(respuestaFormulario("poo-intro-01", 3, { respuestas: answers }).tipo, "preguntas_abiertas");
  delete answers["pregunta-8"];
  assert.equal(respuestaFormulario("poo-intro-01", 3, { respuestas: answers }), null);
});
