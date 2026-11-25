-- El contenido docente se carga por separado; no se incluye en el repositorio público.
CREATE TABLE IF NOT EXISTS ape_ejercicios (
  actividad_slug text NOT NULL,
  identificador text NOT NULL,
  nivel text NOT NULL CHECK (nivel IN ('inicial', 'intermedio', 'integrador')),
  formato text NOT NULL CHECK (formato IN ('opcion', 'verdadero-falso', 'codigo')),
  numero_entrega integer,
  datos jsonb NOT NULL,
  PRIMARY KEY (actividad_slug, identificador),
  CHECK ((formato = 'codigo' AND numero_entrega BETWEEN 1 AND 10) OR
         (formato <> 'codigo' AND numero_entrega IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS ape_ejercicios_numero_entrega
  ON ape_ejercicios (actividad_slug, numero_entrega) WHERE numero_entrega IS NOT NULL;
