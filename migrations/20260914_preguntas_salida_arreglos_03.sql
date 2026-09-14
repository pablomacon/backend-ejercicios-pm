-- Preguntas de salida sobre arreglos y recorridos para 1MF, 1MG y profesor.
INSERT INTO actividades (slug, titulo, activa, fecha_creacion, anio, asignatura, tema, orden, url, descripcion)
SELECT
  'arreglos-recorridos-salida-03',
  'Preguntas de salida: arreglos y recorridos',
  TRUE,
  CURRENT_TIMESTAMP,
  2026,
  'pi',
  'arreglos',
  302,
  '/2026/pi/arreglos/03/',
  'Actividad breve sobre búsquedas, condiciones de corte y recorridos de arreglos en Java.'
WHERE NOT EXISTS (
  SELECT 1 FROM actividades WHERE slug = 'arreglos-recorridos-salida-03'
);

INSERT INTO preguntas (actividad_slug, numero_pregunta, respuesta_correcta)
SELECT datos.actividad_slug, datos.numero_pregunta, datos.respuesta_correcta
FROM (VALUES
  ('arreglos-recorridos-salida-03', 1, 'c'),
  ('arreglos-recorridos-salida-03', 2, 'a'),
  ('arreglos-recorridos-salida-03', 3, 'b'),
  ('arreglos-recorridos-salida-03', 4, 'c'),
  ('arreglos-recorridos-salida-03', 5, 'a'),
  ('arreglos-recorridos-salida-03', 6, 'c'),
  ('arreglos-recorridos-salida-03', 7, 'b'),
  ('arreglos-recorridos-salida-03', 8, 'd'),
  ('arreglos-recorridos-salida-03', 9, 'b'),
  ('arreglos-recorridos-salida-03', 10, 'c')
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
JOIN actividades a ON a.slug = 'arreglos-recorridos-salida-03'
WHERE e.activo = TRUE
  AND lower(trim(e.grupo)) IN ('1mf', '1mg', 'profesor')
  AND NOT EXISTS (
    SELECT 1
    FROM realiza r
    WHERE r.estudiante_id = e.id
      AND r.actividad_id = a.id
  );
