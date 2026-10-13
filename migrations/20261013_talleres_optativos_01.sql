INSERT INTO actividades (slug, titulo, activa, fecha_creacion, anio, asignatura, tema, orden, url, descripcion)
SELECT
  'talleres-optativos-01',
  'Métodos y reglas de negocio: inscripción a talleres optativos',
  TRUE,
  CURRENT_TIMESTAMP,
  2026,
  'pii',
  'ejercicios',
  1,
  '/2026/pii/ejercicios/talleres-optativos-01/',
  'Práctica de Java sobre métodos y reglas de negocio para validar inscripciones a talleres optativos.'
WHERE NOT EXISTS (SELECT 1 FROM actividades WHERE slug = 'talleres-optativos-01');

INSERT INTO realiza (estudiante_id, actividad_id, habilitada, fecha_habilitacion)
SELECT e.id, a.id, TRUE, CURRENT_TIMESTAMP
FROM estudiantes e
JOIN actividades a ON a.slug = 'talleres-optativos-01'
WHERE e.activo = TRUE
  AND lower(trim(e.grupo)) IN ('2mb', '2mf', 'profesor')
  AND NOT EXISTS (
    SELECT 1 FROM realiza r WHERE r.estudiante_id = e.id AND r.actividad_id = a.id
  );

UPDATE realiza r SET habilitada = TRUE
FROM estudiantes e
JOIN actividades a ON a.slug = 'talleres-optativos-01'
WHERE r.estudiante_id = e.id
  AND r.actividad_id = a.id
  AND e.activo = TRUE
  AND lower(trim(e.grupo)) IN ('2mb', '2mf', 'profesor');
