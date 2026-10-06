INSERT INTO actividades (slug, titulo, activa, fecha_creacion, anio, asignatura, tema, orden, url, descripcion)
SELECT 'metodos-java-02', 'Métodos en Java — Actividad práctica', TRUE, CURRENT_TIMESTAMP, 2026, 'pi', 'metodos', 2, '/2026/pi/metodos/02/', 'Actividad práctica de programación sobre métodos en Java con entrega de código y archivos.'
WHERE NOT EXISTS (SELECT 1 FROM actividades WHERE slug = 'metodos-java-02');

INSERT INTO realiza (estudiante_id, actividad_id, habilitada, fecha_habilitacion)
SELECT e.id, a.id, TRUE, CURRENT_TIMESTAMP
FROM estudiantes e JOIN actividades a ON a.slug = 'metodos-java-02'
WHERE e.activo = TRUE AND lower(trim(e.grupo)) IN ('1mf', '1mg', 'profesor')
  AND NOT EXISTS (SELECT 1 FROM realiza r WHERE r.estudiante_id = e.id AND r.actividad_id = a.id);

UPDATE realiza r SET habilitada = TRUE
FROM estudiantes e JOIN actividades a ON a.slug = 'metodos-java-02'
WHERE r.estudiante_id = e.id AND r.actividad_id = a.id AND e.activo = TRUE
  AND lower(trim(e.grupo)) IN ('1mf', '1mg', 'profesor');
