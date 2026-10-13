INSERT INTO actividades (slug, titulo, activa, fecha_creacion, anio, asignatura, tema, orden, url, descripcion)
SELECT 'poo-modelado-01', 'Del problema al objeto', TRUE, CURRENT_TIMESTAMP, 2026, 'pi', 'poo', 2, '/2026/pi/poo/modelado-01/', 'Modelá un libro para un programa de préstamos: elegí objeto, atributos, métodos y justificá tus decisiones.'
WHERE NOT EXISTS (SELECT 1 FROM actividades WHERE slug = 'poo-modelado-01');

INSERT INTO actividades (slug, titulo, activa, fecha_creacion, anio, asignatura, tema, orden, url, descripcion)
SELECT 'poo-estado-01', '¿Quién puede cambiar los datos?', TRUE, CURRENT_TIMESTAMP, 2026, 'pi', 'poo', 3, '/2026/pi/poo/estado-01/', 'Pensá qué ocurre cuando los datos de un objeto se pueden cambiar directamente.'
WHERE NOT EXISTS (SELECT 1 FROM actividades WHERE slug = 'poo-estado-01');

INSERT INTO realiza (estudiante_id, actividad_id, habilitada, fecha_habilitacion)
SELECT e.id, a.id, TRUE, CURRENT_TIMESTAMP
FROM estudiantes e
JOIN actividades a ON a.slug IN ('poo-modelado-01', 'poo-estado-01')
WHERE e.activo = TRUE
  AND lower(trim(e.grupo)) IN ('1mf', '1mg', 'profesor')
  AND NOT EXISTS (
    SELECT 1 FROM realiza r WHERE r.estudiante_id = e.id AND r.actividad_id = a.id
  );

UPDATE realiza r SET habilitada = TRUE
FROM estudiantes e
JOIN actividades a ON a.slug IN ('poo-modelado-01', 'poo-estado-01')
WHERE r.estudiante_id = e.id
  AND r.actividad_id = a.id
  AND e.activo = TRUE
  AND lower(trim(e.grupo)) IN ('1mf', '1mg', 'profesor');
