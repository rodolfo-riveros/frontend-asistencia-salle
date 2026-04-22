
-- ESQUEMA DE BASE DE DATOS PARA IES LA SALLE URUBAMBA
-- SOPORTE PARA REGISTRO AUXILIAR, EVALUACIONES GRUPALES Y QUIZZES

-- 1. EXTENSIONES Y TIPOS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE public.tipo_instrumento AS ENUM (
        'manual', 'cotejo', 'rubrica', 'escala', 'anecdotario', 'grupal', 'quizz'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.semestre_tipo AS ENUM ('I', 'II', 'III', 'IV', 'V', 'VI');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.estado_asistencia AS ENUM ('P', 'F', 'T', 'J');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABLAS BASE (Existentes actualizadas)
CREATE TABLE IF NOT EXISTS public.periodos_academicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  es_activo boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.programas_estudio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  codigo text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.docentes (
  id uuid PRIMARY KEY,
  nombre text NOT NULL,
  especialidad text,
  es_transversal boolean NOT NULL DEFAULT false,
  CONSTRAINT docentes_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.unidades_didacticas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  programa_id uuid REFERENCES public.programas_estudio(id),
  semestre public.semestre_tipo NOT NULL
);

CREATE TABLE IF NOT EXISTS public.alumnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  programa_id uuid REFERENCES public.programas_estudio(id),
  semestre public.semestre_tipo NOT NULL,
  dni text NOT NULL UNIQUE
);

-- 3. GESTIÓN ACADÉMICA Y MATRÍCULA
CREATE TABLE IF NOT EXISTS public.asignacion_docente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  docente_id uuid REFERENCES public.docentes(id) ON DELETE CASCADE,
  unidad_id uuid REFERENCES public.unidades_didacticas(id) ON DELETE CASCADE,
  periodo_id uuid REFERENCES public.periodos_academicos(id) ON DELETE CASCADE,
  UNIQUE(docente_id, unidad_id, periodo_id)
);

CREATE TABLE IF NOT EXISTS public.asistencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id uuid REFERENCES public.alumnos(id) ON DELETE CASCADE,
  unidad_id uuid REFERENCES public.unidades_didacticas(id) ON DELETE CASCADE,
  docente_id uuid REFERENCES public.docentes(id),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  estado public.estado_asistencia NOT NULL,
  observacion text,
  periodo_id uuid REFERENCES public.periodos_academicos(id)
);

-- 4. NUEVO MÓDULO DE EVALUACIONES (REGISTRO AUXILIAR)
CREATE TABLE IF NOT EXISTS public.indicadores_logro (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unidad_id uuid REFERENCES public.unidades_didacticas(id) ON DELETE CASCADE,
    periodo_id uuid REFERENCES public.periodos_academicos(id) ON DELETE CASCADE,
    codigo text NOT NULL, -- Ej: I.L. 01
    descripcion text NOT NULL,
    peso_porcentaje integer NOT NULL DEFAULT 0, -- Peso del indicador en la nota final (0-100)
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evaluaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    indicador_id uuid REFERENCES public.indicadores_logro(id) ON DELETE CASCADE,
    nombre text NOT NULL, -- Ej: Examen Parcial, Proyecto X
    tipo public.tipo_instrumento NOT NULL DEFAULT 'manual',
    peso_instrumento integer NOT NULL DEFAULT 0, -- Peso dentro del indicador (0-100)
    puntaje_maximo integer NOT NULL DEFAULT 20,
    configuracion_json jsonb, -- Almacena niveles de rúbrica, criterios de cotejo o preguntas de Quizz
    periodo_id uuid REFERENCES public.periodos_academicos(id),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calificaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluacion_id uuid REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
    alumno_id uuid REFERENCES public.alumnos(id) ON DELETE CASCADE,
    puntaje numeric(4,2) NOT NULL DEFAULT 0,
    observacion text,
    detalles_json jsonb, -- Desglose de qué criterios/niveles se marcaron específicamente
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(evaluacion_id, alumno_id)
);

-- 5. TRABAJO GRUPAL
CREATE TABLE IF NOT EXISTS public.evaluacion_grupos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluacion_id uuid REFERENCES public.evaluaciones(id) ON DELETE CASCADE,
    nombre_grupo text NOT NULL, -- Ej: Grupo 1
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evaluacion_grupo_integrantes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo_id uuid REFERENCES public.evaluacion_grupos(id) ON DELETE CASCADE,
    alumno_id uuid REFERENCES public.alumnos(id) ON DELETE CASCADE,
    UNIQUE(grupo_id, alumno_id)
);

-- RLS (Row Level Security) - Ejemplo básico
ALTER TABLE public.calificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Docentes pueden gestionar sus calificaciones" ON public.calificaciones
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.asignacion_docente ad
            JOIN public.evaluaciones e ON e.periodo_id = ad.periodo_id
            WHERE e.id = evaluacion_id AND ad.docente_id = auth.uid()
        )
    );
