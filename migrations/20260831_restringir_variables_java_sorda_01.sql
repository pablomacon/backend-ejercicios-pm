-- Angelo Botto (48) y Nahuel Fernández (57) solo podrán acceder a
-- variables-java-sorda-01. Se deshabilitan sus otros accesos, sin borrarlos.
UPDATE realiza r
SET habilitada = FALSE
FROM actividades a
WHERE r.actividad_id = a.id
  AND r.estudiante_id IN (48, 57)
  AND a.slug <> 'variables-java-sorda-01'
  AND r.habilitada = TRUE;

-- Garantiza que la actividad adaptada permanezca habilitada para ambos.
UPDATE realiza r
SET habilitada = TRUE
FROM actividades a
WHERE r.actividad_id = a.id
  AND r.estudiante_id IN (48, 57)
  AND a.slug = 'variables-java-sorda-01'
  AND r.habilitada = FALSE;

-- Verificación posterior esperada: solo dos filas habilitadas, una por estudiante.
SELECT e.id, e.nombre, e.apellido, a.slug, r.habilitada
FROM realiza r
JOIN estudiantes e ON e.id = r.estudiante_id
JOIN actividades a ON a.id = r.actividad_id
WHERE e.id IN (48, 57)
ORDER BY e.id, a.slug;
