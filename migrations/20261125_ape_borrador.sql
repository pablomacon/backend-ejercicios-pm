-- Preparación: ambas series quedan inactivas hasta completar y verificar su contenido.
-- Este archivo no habilita la serie B. La serie A se activa por separado cuando
-- el frontend y el backend estén desplegados y comprobados.
INSERT INTO actividades (slug, titulo, activa, fecha_creacion, anio, asignatura, tema, orden, url, descripcion)
SELECT v.slug, v.titulo, FALSE, CURRENT_TIMESTAMP, 2026, 'pi', 'ape', v.orden, v.url, v.descripcion
FROM (VALUES
  ('ape-serie-a', 'APE — Serie A', 1, '/2026/pi/ape/a/', 'Práctica de preparación sin arreglos.'),
  ('ape-serie-b', 'APE — Serie B', 2, '/2026/pi/ape/b/', 'Práctica de preparación con arreglos.')
) AS v(slug, titulo, orden, url, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM actividades a WHERE a.slug = v.slug);

-- Se registran únicamente las personas solicitadas; la actividad inactiva
-- todavía no es accesible. No se cambian permisos existentes.
INSERT INTO realiza (estudiante_id, actividad_id, habilitada, fecha_habilitacion)
SELECT e.id, a.id, TRUE, CURRENT_TIMESTAMP
FROM estudiantes e
JOIN actividades a ON a.slug = 'ape-serie-a'
WHERE e.activo = TRUE AND e.id IN (24, 50, 74, 78, 84, 85)
  AND NOT EXISTS (SELECT 1 FROM realiza r WHERE r.estudiante_id = e.id AND r.actividad_id = a.id);
