-- Ejecutar sólo tras aprobar la prueba docente de poo-modelado-02.
INSERT INTO realiza (estudiante_id, actividad_id, habilitada, fecha_habilitacion)
SELECT e.id, a.id, TRUE, CURRENT_TIMESTAMP
FROM estudiantes e
JOIN actividades a ON a.slug = 'poo-modelado-02'
WHERE e.activo = TRUE
  AND lower(trim(e.grupo)) IN ('1mf', '1mg')
  AND NOT EXISTS (
    SELECT 1 FROM realiza r WHERE r.estudiante_id = e.id AND r.actividad_id = a.id
  );

UPDATE realiza r
SET habilitada = TRUE, fecha_habilitacion = CURRENT_TIMESTAMP
FROM estudiantes e
JOIN actividades a ON a.slug = 'poo-modelado-02'
WHERE r.estudiante_id = e.id
  AND r.actividad_id = a.id
  AND e.activo = TRUE
  AND lower(trim(e.grupo)) IN ('1mf', '1mg');
