-- Migration: Reorganizar `seccion` — alumnos es padrón maestro, matriculas tiene la sección

-- 1. Quitar seccion de alumnos (padrón maestro, una persona = un DNI)
ALTER TABLE alumnos DROP COLUMN IF EXISTS seccion;

-- 2. Asegurar que matriculas tenga seccion
ALTER TABLE matriculas
ADD COLUMN IF NOT EXISTS seccion VARCHAR(10) NOT NULL DEFAULT 'U';

COMMENT ON COLUMN matriculas.seccion IS 'U = Regular, REC = Recuperación';

-- 3. Vista principal para filtrado por unidad + seccion
DROP VIEW IF EXISTS v_alumnos_por_unidad;
CREATE VIEW v_alumnos_por_unidad AS
SELECT
  u.id           AS unidad_id,
  u.nombre       AS unidad_nombre,
  a.id           AS alumno_id,
  a.nombre       AS alumno_nombre,
  a.dni,
  a.semestre,
  a.programa_id,
  p.nombre       AS programa_nombre,
  m.seccion
FROM unidades_didacticas u
JOIN programas_estudio p ON p.id = u.programa_id
JOIN matriculas m ON m.programa_id = u.programa_id
                  AND CAST(m.semestre AS semestre_tipo) = u.semestre
                  AND m.seccion = u.seccion
JOIN alumnos a ON a.id = m.alumno_id;

-- 4. Vista para listado de alumnos con su última sección
DROP VIEW IF EXISTS v_alumnos_listado;
CREATE VIEW v_alumnos_listado AS
SELECT DISTINCT ON (a.id)
  a.id,
  a.nombre,
  a.dni,
  a.semestre,
  a.programa_id,
  COALESCE(m.seccion, 'U') AS seccion
FROM alumnos a
LEFT JOIN matriculas m ON m.alumno_id = a.id
ORDER BY a.id, m.created_at DESC;

-- Índices
CREATE INDEX IF NOT EXISTS idx_matriculas_seccion ON matriculas (seccion);
CREATE INDEX IF NOT EXISTS idx_matriculas_alumno_periodo ON matriculas (alumno_id, periodo_id);
