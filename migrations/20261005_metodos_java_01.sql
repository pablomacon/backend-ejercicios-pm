-- Actividad de Métodos en Java para 1MF, 1MG y profesor.
INSERT INTO actividades (slug, titulo, activa, fecha_creacion, anio, asignatura, tema, orden, url, descripcion)
SELECT 'metodos-java-01', 'Métodos en Java — Actividad 1', TRUE, CURRENT_TIMESTAMP, 2026, 'pi', 'metodos', 1, '/2026/pi/metodos/01/', 'Actividad práctica para reconocer, completar y utilizar métodos en Java, trabajando métodos sin parámetros, con parámetros, con retorno y booleanos.'
WHERE NOT EXISTS (SELECT 1 FROM actividades WHERE slug = 'metodos-java-01');

INSERT INTO preguntas (actividad_slug, numero_pregunta, respuesta_correcta)
SELECT datos.actividad_slug, datos.numero_pregunta, datos.respuesta_correcta
FROM (VALUES
  ('metodos-java-01', 1, 'a'), ('metodos-java-01', 2, 'a'), ('metodos-java-01', 3, 'a'), ('metodos-java-01', 4, 'a'), ('metodos-java-01', 5, 'a'),
  ('metodos-java-01', 6, 'a'), ('metodos-java-01', 7, 'a'), ('metodos-java-01', 8, 'a'), ('metodos-java-01', 9, 'a'), ('metodos-java-01', 10, 'a'),
  ('metodos-java-01', 11, 'a'), ('metodos-java-01', 12, 'a'), ('metodos-java-01', 13, 'a'), ('metodos-java-01', 14, 'a'), ('metodos-java-01', 15, 'a'),
  ('metodos-java-01', 16, 'a'), ('metodos-java-01', 17, 'a'), ('metodos-java-01', 18, 'a'), ('metodos-java-01', 19, 'a'), ('metodos-java-01', 20, 'a')
) AS datos(actividad_slug, numero_pregunta, respuesta_correcta)
WHERE NOT EXISTS (SELECT 1 FROM preguntas p WHERE p.actividad_slug = datos.actividad_slug AND p.numero_pregunta = datos.numero_pregunta);

INSERT INTO realiza (estudiante_id, actividad_id, habilitada, fecha_habilitacion)
SELECT e.id, a.id, TRUE, CURRENT_TIMESTAMP
FROM estudiantes e JOIN actividades a ON a.slug = 'metodos-java-01'
WHERE e.activo = TRUE AND lower(trim(e.grupo)) IN ('1mf', '1mg', 'profesor')
  AND NOT EXISTS (SELECT 1 FROM realiza r WHERE r.estudiante_id = e.id AND r.actividad_id = a.id);
