-- Cada respuesta se conserva como un intento de práctica, sin generar un fallo de acreditación.
CREATE TABLE IF NOT EXISTS ape_respuestas (
  id bigserial PRIMARY KEY,
  estudiante_id integer NOT NULL REFERENCES estudiantes(id),
  actividad_id integer NOT NULL REFERENCES actividades(id),
  actividad_slug text NOT NULL,
  ejercicio_id text NOT NULL,
  opcion smallint NOT NULL CHECK (opcion BETWEEN 0 AND 3),
  correcta boolean NOT NULL,
  fecha_respuesta timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (actividad_slug, ejercicio_id) REFERENCES ape_ejercicios(actividad_slug, identificador)
);
CREATE INDEX IF NOT EXISTS ape_respuestas_consulta_idx
  ON ape_respuestas (estudiante_id, actividad_id, ejercicio_id, fecha_respuesta DESC);
