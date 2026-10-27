-- Claves privadas de drag-uml residen en lib/uml-drag.js; estas filas identifican los siete casos.
INSERT INTO actividades (slug, titulo, activa, fecha_creacion, anio, asignatura, tema, orden, url, descripcion)
SELECT 'poo-modelado-02', 'Del problema al modelo: clases UML', TRUE, CURRENT_TIMESTAMP, 2026, 'pi', 'poo', 4, '/2026/pi/poo/modelado-02/', 'Análisis de clases, atributos y métodos UML mediante siete casos.'
WHERE NOT EXISTS (SELECT 1 FROM actividades WHERE slug = 'poo-modelado-02');

INSERT INTO preguntas (actividad_slug, numero_pregunta, respuesta_correcta)
SELECT 'poo-modelado-02', n, '{"tipo":"drag-uml-v1","clave":"backend"}'
FROM generate_series(1, 7) AS n
WHERE NOT EXISTS (SELECT 1 FROM preguntas WHERE actividad_slug = 'poo-modelado-02' AND numero_pregunta = n);

-- Publicación escalonada: sólo el docente autorizado puede probar antes de abrir grupos.
INSERT INTO realiza (estudiante_id, actividad_id, habilitada, fecha_habilitacion)
SELECT e.id, a.id, TRUE, CURRENT_TIMESTAMP
FROM estudiantes e JOIN actividades a ON a.slug = 'poo-modelado-02'
WHERE e.activo = TRUE AND lower(e.correo_electronico) = 'pablomacon@gmail.com'
  AND NOT EXISTS (SELECT 1 FROM realiza r WHERE r.estudiante_id=e.id AND r.actividad_id=a.id);
