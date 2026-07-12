'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSesionInputSchema = z.object({
  programaEstudios: z.string().describe('Programa de estudios'),
  moduloFormativo: z.string().describe('Modulo formativo'),
  unidadCompetencia: z.string().describe('Unidad de competencia vinculada'),
  unidadDidactica: z.string().describe('Unidad didactica'),
  capacidad: z.string().describe('Capacidad'),
  indicadorLogro: z.string().describe('Indicador de logro vinculado'),
  competenciaTransversal: z.string().describe('Competencia transversal priorizada'),
  periodoLectivo: z.string().describe('Periodo lectivo'),
  periodoAcademico: z.string().describe('Periodo academico'),
  fechaDesarrollo: z.string().describe('Fecha de desarrollo'),
  docente: z.string().describe('Docente responsable'),
  sesion: z.string().describe('Sesion de aprendizaje'),
  logro: z.string().describe('Logro o proposito de la sesion'),
  contenidos: z.string().describe('Contenidos de la sesion (separados por comas)'),
  lugarTipo: z.string().describe('Lugar y tipo de sesion'),
  horasTeoricas: z.string().describe('Horas teoricas (en horas pedagogicas de 45min)'),
  horasPracticas: z.string().describe('Horas practicas (en horas pedagogicas de 45min)'),
  distribucionActividades: z.string().describe(
    'Distribucion de horas por cada actividad de clase. Formato: "Actividad 1: 2h, Actividad 2: 2h, Actividad 3: 3h, Actividad 4: 2h, Actividad 5: 2h, Actividad 6: 3h". La suma total debe coincidir con horasTeoricas + horasPracticas. Cada hora = 45 min pedagogicos.'
  ),
});
export type GenerateSesionInput = z.infer<typeof GenerateSesionInputSchema>;

const MomentoInicioSchema = z.object({
  estrategia: z.string().describe('Estrategia metodologica para el inicio'),
  motivacion: z.string().describe('Texto motivador para captar la atencion del estudiante'),
  saberesPrevios: z.string().describe('Pregunta o actividad para recuperar saberes previos'),
  conflictoCognitivo: z.string().describe('Pregunta desafiante que genere conflicto cognitivo'),
});

const MomentoDesarrolloSchema = z.object({
  estrategia: z.string().describe('Estrategia metodologica para el desarrollo'),
  construccion: z.string().describe('Explicacion teorica o conceptual del tema'),
  contenidoPrincipal: z.string().describe('Contenido principal: codigo, ejemplos o demostracion'),
  tiposDatos: z.string().describe('Detalle de tipos de datos, sintaxis o conceptos clave'),
  ejercicios: z.array(z.string()).describe('Lista de ejercicios practicos a realizar'),
});

const MomentoCierreSchema = z.object({
  metacognicion: z.string().describe('Pregunta de metacognicion para reflexion'),
  evaluacion: z.string().describe('Estrategia de evaluacion a aplicar'),
  instrumento: z.string().describe('Instrumento de evaluacion (Lista de Cotejo, Rubrica, etc)'),
});

const ActividadCompletaSchema = z.object({
  numero: z.number().describe('Numero de la actividad (1, 2, 3...)'),
  titulo: z.string().describe('Titulo de la actividad'),
  duracion: z.string().describe('Duracion total en minutos'),
  inicio: MomentoInicioSchema.describe('Momento de inicio de la actividad'),
  desarrollo: MomentoDesarrolloSchema.describe('Momento de desarrollo de la actividad'),
  cierre: MomentoCierreSchema.describe('Momento de cierre de la actividad'),
  recursos: z.array(z.string()).describe('Recursos y materiales necesarios'),
  estrategiaTiempo: z.string().describe('Estrategia y tiempo resumido para la tabla de tiempos'),
});

const CriterioCotejoSchema = z.object({
  numero: z.number().describe('Numero del criterio'),
  descripcion: z.string().describe('Descripcion del criterio a evaluar'),
});

const DimensionRubricaSchema = z.object({
  criterio: z.string().describe('Nombre del criterio o dimension a evaluar'),
  excelente: z.string().describe('Descripcion del nivel excelente (4 pts)'),
  bueno: z.string().describe('Descripcion del nivel bueno (3 pts)'),
  regular: z.string().describe('Descripcion del nivel regular (2 pts)'),
  deficiente: z.string().describe('Descripcion del nivel deficiente (1 pt)'),
});

const GenerateSesionOutputSchema = z.object({
  titulo: z.string().describe('Titulo completo de la sesion (ej: "7. JavaScript Basico - Sintaxis, Variables y Operadores")'),
  logro: z.string().describe('Logro o proposito de la sesion'),
  capacidades: z.array(z.string()).describe('Lista de capacidades a desarrollar'),
  indicador: z.string().describe('Indicador de logro vinculado completo'),
  contenidos: z.array(z.string()).describe('Lista de contenidos tematicos de la sesion'),
  actividades: z.array(ActividadCompletaSchema).describe('Actividades de la sesion (tipicamente 3: inicio global, desarrollo, cierre global)'),
  listaCotejo: z.object({
    titulo: z.string().describe('Titulo de la lista de cotejo'),
    criterios: z.array(CriterioCotejoSchema).describe('Criterios de evaluacion de la lista de cotejo (4-6 criterios)'),
  }).describe('Lista de cotejo para evaluar los aprendizajes'),
  rubrica: z.object({
    titulo: z.string().describe('Titulo de la rubrica'),
    dimensiones: z.array(DimensionRubricaSchema).describe('Dimensiones de la rubrica con niveles (2-3 dimensiones)'),
  }).describe('Rubrica de evaluacion con dimensiones y niveles'),
  observaciones: z.string().describe('Observaciones y recomendaciones para el docente'),
  bibliografia: z.array(z.string()).describe('Referencias bibliograficas y recursos online'),
});
export type GenerateSesionOutput = z.infer<typeof GenerateSesionOutputSchema>;

const generateSesionPrompt = ai.definePrompt({
  name: 'generateSesionPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: GenerateSesionInputSchema },
  output: { schema: GenerateSesionOutputSchema },
  config: {
    temperature: 0.7,
  },
  prompt: `Eres un Pedagogo Senior del IES LA SALLE URUBAMBA especializado en diseno curricular por competencias.

Genera una FICHA DE SESION DE APRENDIZAJE completa y detallada a partir de los siguientes datos:

INFORMACION GENERAL:
- Programa de estudios: {{programaEstudios}}
- Modulo formativo: {{moduloFormativo}}
- Unidad de competencia: {{unidadCompetencia}}
- Unidad didactica: {{unidadDidactica}}
- Capacidad: {{capacidad}}
- Indicador de logro: {{indicadorLogro}}
- Competencia transversal: {{competenciaTransversal}}
- Periodo lectivo: {{periodoLectivo}}
- Periodo academico: {{periodoAcademico}}
- Fecha de desarrollo: {{fechaDesarrollo}}
- Docente: {{docente}}
- Sesion: {{sesion}}
- Logro/Proposito: {{logro}}
- Contenidos: {{contenidos}}
- Lugar y tipo: {{lugarTipo}}
- Horas teoricas: {{horasTeoricas}} (cada hora = 45 min pedagogicos)
- Horas practicas: {{horasPracticas}} (cada hora = 45 min pedagogicos)
- Distribucion de actividades: {{distribucionActividades}}

INSTRUCCIONES CRITICAS:
1. Genera EXACTAMENTE tantas actividades como se indican en la distribucion. Cada actividad corresponde a una sesion de clase completa.
2. Cada actividad debe tener INICIO, DESARROLLO y CIERRE con sus respectivos sub-momentos y la duracion en minutos asignada en la distribucion.
3. Usa HORAS PEDAGOGICAS: 1 hora = 45 minutos. Convierte las horas de la distribucion a minutos reales de clase.
4. Los contenidos deben ser una lista de temas especificos y concretos.
5. La lista de cotejo debe tener 4-6 criterios con puntajes SI=2pts y NO=0pts.
6. La rubrica debe tener 2-3 dimensiones con niveles: Excelente(4), Bueno(3), Regular(2), Deficiente(1), No presenta(0).
7. Las actividades deben incluir codigo, ejemplos o ejercicios practicos segun corresponda.
8. Incluye la competencia transversal en al menos una actividad.
9. Responde siempre en ESPANOL con lenguaje pedagogico apropiado.
10. Se especifico y evita respuestas genericas. Cada campo debe tener contenido sustancial.`,
});

export async function generateSesion(input: GenerateSesionInput): Promise<GenerateSesionOutput> {
  const { output } = await generateSesionPrompt(input);
  if (!output) {
    throw new Error('La IA no pudo generar la sesion de aprendizaje.');
  }
  return output;
}
