CREATE TABLE IF NOT EXISTS entregas_formularios (
  id BIGSERIAL PRIMARY KEY,
  estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id),
  actividad_id INTEGER NOT NULL REFERENCES actividades(id),
  numero_ejercicio SMALLINT NOT NULL CHECK (numero_ejercicio BETWEEN 1 AND 3),
  respuesta JSONB NOT NULL CHECK (jsonb_typeof(respuesta) = 'object'),
  numero_version INTEGER NOT NULL CHECK (numero_version > 0),
  estado VARCHAR(16) NOT NULL DEFAULT 'entregado' CHECK (estado IN ('entregado', 'error')),
  fecha_entrega TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT entregas_formularios_version_unica UNIQUE (estudiante_id, actividad_id, numero_ejercicio, numero_version)
);

CREATE INDEX IF NOT EXISTS entregas_formularios_recientes_idx
  ON entregas_formularios (estudiante_id, actividad_id, numero_ejercicio, fecha_entrega DESC);

INSERT INTO actividades (slug, titulo, activa, fecha_creacion, anio, asignatura, tema, orden, url, descripcion)
SELECT
  'poo-intro-01',
  'Introducción a la Programación Orientada a Objetos',
  TRUE,
  CURRENT_TIMESTAMP,
  2026,
  'pi',
  'poo',
  1,
  '/2026/pi/poo/intro/',
  'Introducción a la POO en Java: abstraer, modelar clases y objetos, y distinguir atributos de métodos.'
WHERE NOT EXISTS (SELECT 1 FROM actividades WHERE slug = 'poo-intro-01');

INSERT INTO realiza (estudiante_id, actividad_id, habilitada, fecha_habilitacion)
SELECT e.id, a.id, TRUE, CURRENT_TIMESTAMP
FROM estudiantes e
JOIN actividades a ON a.slug = 'poo-intro-01'
WHERE e.activo = TRUE
  AND lower(trim(e.grupo)) IN ('1mf', '1mg', 'profesor')
  AND NOT EXISTS (
    SELECT 1 FROM realiza r WHERE r.estudiante_id = e.id AND r.actividad_id = a.id
  );

UPDATE realiza r SET habilitada = TRUE
FROM estudiantes e
JOIN actividades a ON a.slug = 'poo-intro-01'
WHERE r.estudiante_id = e.id
  AND r.actividad_id = a.id
  AND e.activo = TRUE
  AND lower(trim(e.grupo)) IN ('1mf', '1mg', 'profesor');
