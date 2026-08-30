-- Ejecutar una única vez en Neon después de verificar el esquema de producción.
CREATE TABLE IF NOT EXISTS entregas_ejercicios (
  id BIGSERIAL PRIMARY KEY,
  estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id),
  actividad_id INTEGER NOT NULL REFERENCES actividades(id),
  numero_ejercicio SMALLINT NOT NULL CHECK (numero_ejercicio BETWEEN 1 AND 50),
  bloque SMALLINT NOT NULL CHECK (bloque BETWEEN 1 AND 5),
  tipo_evidencia VARCHAR(12) NOT NULL CHECK (tipo_evidencia IN ('archivo', 'texto')),
  codigo_texto TEXT,
  respuesta_explicacion TEXT NOT NULL CHECK (length(trim(respuesta_explicacion)) > 0),
  numero_version INTEGER NOT NULL CHECK (numero_version > 0),
  estado VARCHAR(16) NOT NULL DEFAULT 'entregado' CHECK (estado IN ('entregado', 'error')),
  fecha_entrega TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT entrega_evidencia_valida CHECK (
    (tipo_evidencia = 'texto' AND codigo_texto IS NOT NULL AND length(trim(codigo_texto)) > 0)
    OR tipo_evidencia = 'archivo'
  ),
  CONSTRAINT entrega_version_unica UNIQUE (estudiante_id, actividad_id, numero_ejercicio, numero_version)
);
CREATE INDEX IF NOT EXISTS entregas_ejercicios_estado_idx ON entregas_ejercicios (estudiante_id, actividad_id, numero_ejercicio, fecha_entrega DESC);

CREATE TABLE IF NOT EXISTS archivos_entrega (
  id BIGSERIAL PRIMARY KEY,
  entrega_id BIGINT NOT NULL REFERENCES entregas_ejercicios(id) ON DELETE CASCADE,
  drive_file_id VARCHAR(255) NOT NULL UNIQUE,
  nombre_original TEXT NOT NULL,
  nombre_drive TEXT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  extension VARCHAR(10) NOT NULL,
  tamanio_bytes BIGINT NOT NULL CHECK (tamanio_bytes > 0),
  fecha_subida TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entregas_upload_pendientes (
  token UUID PRIMARY KEY,
  estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id),
  actividad_id INTEGER NOT NULL REFERENCES actividades(id),
  numero_ejercicio SMALLINT NOT NULL CHECK (numero_ejercicio BETWEEN 1 AND 50),
  bloque SMALLINT NOT NULL CHECK (bloque BETWEEN 1 AND 5),
  drive_folder_id VARCHAR(255) NOT NULL,
  nombre_original TEXT NOT NULL,
  nombre_drive TEXT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  extension VARCHAR(10) NOT NULL,
  tamanio_bytes BIGINT NOT NULL CHECK (tamanio_bytes > 0),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- La actividad se entrega por código/archivo; no utiliza preguntas ni intentos.
INSERT INTO actividades (slug, titulo, activa, fecha_creacion, anio, asignatura, tema, orden, url, descripcion)
SELECT
  'arreglos-strings-01',
  '50 ejercicios de arreglos y Strings',
  TRUE,
  CURRENT_TIMESTAMP,
  2026,
  'pi',
  'arreglos-strings',
  301,
  '/2026/pi/arreglos-strings/01/',
  'Banco progresivo de práctica en Java: arreglos, Strings, recorridos, búsquedas y modificaciones.'
WHERE NOT EXISTS (
  SELECT 1 FROM actividades WHERE slug = 'arreglos-strings-01'
);

-- Se habilita para estudiantes activos de los grupos indicados por el docente.
INSERT INTO realiza (estudiante_id, actividad_id, habilitada, fecha_habilitacion)
SELECT e.id, a.id, TRUE, CURRENT_TIMESTAMP
FROM estudiantes e
JOIN actividades a ON a.slug = 'arreglos-strings-01'
WHERE e.activo = TRUE
  AND lower(trim(e.grupo)) IN ('1mf', '1mg', 'profesor')
  AND NOT EXISTS (
    SELECT 1
    FROM realiza r
    WHERE r.estudiante_id = e.id
      AND r.actividad_id = a.id
  );
