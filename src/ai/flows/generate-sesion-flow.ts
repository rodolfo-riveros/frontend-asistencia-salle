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
  contenidos: z.string().describe('Contenidos de la sesion'),
  lugarTipo: z.string().describe('Lugar y tipo de sesion'),
  horasTeoricas: z.string().describe('Horas teoricas'),
  horasPracticas: z.string().describe('Horas practicas'),
});
export type GenerateSesionInput = z.infer<typeof GenerateSesionInputSchema>;

const ActividadSchema = z.object({
  nombre: z.string().describe('Nombre de la actividad o momento'),
  descripcion: z.string().describe('Descripcion detallada de la actividad'),
  duracion: z.string().describe('Duracion en minutos'),
  recursos: z.string().describe('Recursos y materiales necesarios'),
});

const GenerateSesionOutputSchema = z.object({
  titulo: z.string().describe('Titulo completo de la sesion'),
  logro: z.string().describe('Logro o proposito de la sesion'),
  capacidades: z.array(z.string()).describe('Lista de capacidades a desarrollar'),
  secuenciaDidactica: z.object({
    inicio: z.array(ActividadSchema).describe('Actividades de inicio (motivacion, saberes previos)'),
    proceso: z.array(ActividadSchema).describe('Actividades de proceso (construccion del aprendizaje)'),
    cierre: z.array(ActividadSchema).describe('Actividades de cierre (evaluacion, metacognicion)'),
  }).describe('Secuencia didactica organizada en inicio, proceso y cierre'),
  evaluacion: z.string().describe('Estrategia de evaluacion y criterios'),
  observaciones: z.string().describe('Observaciones y recomendaciones para el docente'),
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
- Horas teoricas: {{horasTeoricas}}
- Horas practicas: {{horasPracticas}}

INSTRUCCIONES:
1. Disena una secuencia didactica completa con actividades concretas y detalladas.
2. Cada actividad debe tener: nombre, descripcion, duracion en minutos y recursos.
3. Distribuye las horas teoricas y practicas de forma coherente en las actividades.
4. Las actividades deben estar alineadas con el logro de la sesion y el indicador.
5. Incluye estrategias de evaluacion formativa durante el proceso.
6. Considera la competencia transversal en al menos una actividad.
7. Responde siempre en ESPANOL con lenguaje pedagogico apropiado.
8. Se especifico y evita respuestas genericas.`,
});

export async function generateSesion(input: GenerateSesionInput): Promise<GenerateSesionOutput> {
  const { output } = await generateSesionPrompt(input);
  if (!output) {
    throw new Error('La IA no pudo generar la sesion de aprendizaje.');
  }
  return output;
}
