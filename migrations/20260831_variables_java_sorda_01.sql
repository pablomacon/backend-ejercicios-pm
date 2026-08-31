-- Actividad adaptada para Angelo Botto (48) y Nahuel Fernández (57), grupo 1MF.
-- También se habilita para los usuarios activos del grupo profesor.
INSERT INTO actividades (slug, titulo, activa, fecha_creacion, anio, asignatura, tema, orden, url, descripcion)
SELECT
  'variables-java-sorda-01',
  'Variables e impresión en Java',
  TRUE,
  CURRENT_TIMESTAMP,
  2026,
  'pi',
  'variables',
  103,
  '/2026/pi/variables/03/',
  'Actividad adaptada sobre variables, tipos de datos e impresión en pantalla en Java.'
WHERE NOT EXISTS (
  SELECT 1 FROM actividades WHERE slug = 'variables-java-sorda-01'
);

INSERT INTO preguntas (actividad_slug, numero_pregunta, respuesta_correcta)
SELECT datos.actividad_slug, datos.numero_pregunta, datos.respuesta_correcta
FROM (VALUES
  ('variables-java-sorda-01', 1, 'verdadero'),
  ('variables-java-sorda-01', 2, 'b'),
  ('variables-java-sorda-01', 3, 'c'),
  ('variables-java-sorda-01', 4, 'verdadero'),
  ('variables-java-sorda-01', 5, 'b'),
  ('variables-java-sorda-01', 6, 'd'),
  ('variables-java-sorda-01', 7, 'verdadero'),
  ('variables-java-sorda-01', 8, 'a'),
  ('variables-java-sorda-01', 9, 'd'),
  ('variables-java-sorda-01', 10, 'b')
) AS datos(actividad_slug, numero_pregunta, respuesta_correcta)
WHERE NOT EXISTS (
  SELECT 1
  FROM preguntas p
  WHERE p.actividad_slug = datos.actividad_slug
    AND p.numero_pregunta = datos.numero_pregunta
);

INSERT INTO realiza (estudiante_id, actividad_id, habilitada, fecha_habilitacion)
SELECT e.id, a.id, TRUE, CURRENT_TIMESTAMP
FROM estudiantes e
JOIN actividades a ON a.slug = 'variables-java-sorda-01'
WHERE (e.id IN (48, 57) OR lower(trim(e.grupo)) = 'profesor')
  AND e.activo = TRUE
  AND NOT EXISTS (
    SELECT 1
    FROM realiza r
    WHERE r.estudiante_id = e.id
      AND r.actividad_id = a.id
  );
