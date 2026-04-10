'use server';
/**
 * @fileOverview AI flow to analyze any type of pedagogical assessment instrument.
 * 
 * Supported: Checklists, Rubrics, Rating Scales, Questionnaires, Anecdotal Records, etc.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChecklistItemSchema = z.object({
  description: z.string().describe('The description of the criterion or question.'),
  points: z.number().describe('Points assigned to this item.'),
});

const RubricLevelSchema = z.object({
  label: z.string().describe('Level name (e.g., Excelente, Logro, Inicio).'),
  points: z.number().describe('Points for this level.'),
  description: z.string().describe('Detailed performance description.'),
});

const RubricDimensionSchema = z.object({
  category: z.string().describe('Category, dimension or competency being evaluated.'),
  levels: z.array(RubricLevelSchema).describe('The performance levels for this dimension.'),
});

const AnalyzeInstrumentInputSchema = z.object({
  photoDataUri: z.string().describe("Data URI of the image (base64)."),
});
export type AnalyzeInstrumentInput = z.infer<typeof AnalyzeInstrumentInputSchema>;

const AnalyzeInstrumentOutputSchema = z.object({
  type: z.enum(['cotejo', 'rubrica', 'escala', 'anecdotario']).describe('Identified instrument type. Maps to UI capabilities.'),
  name: z.string().describe('Suggested name for the evaluation activity.'),
  description: z.string().describe('Pedagogical intent or context of the instrument.'),
  checklistCriteria: z.array(ChecklistItemSchema).optional().describe('Extracted criteria if it is a checklist, test or questionnaire.'),
  rubricDimensions: z.array(RubricDimensionSchema).optional().describe('Extracted dimensions if it is a rubric or complex rating scale.'),
  scaleLevels: z.array(z.object({
    label: z.string(),
    points: z.number()
  })).optional().describe('Shared levels if it is a uniform rating scale (Escala de Valoración).'),
});
export type AnalyzeInstrumentOutput = z.infer<typeof AnalyzeInstrumentOutputSchema>;

const analyzeInstrumentPrompt = ai.definePrompt({
  name: 'analyzeInstrumentPrompt',
  input: { schema: AnalyzeInstrumentInputSchema },
  output: { schema: AnalyzeInstrumentOutputSchema },
  prompt: `Eres un Consultor Pedagógico Senior para el IES LA SALLE URUBAMBA. 
Tu misión es digitalizar instrumentos de evaluación a partir de imágenes (incluso si son fotos de papel o pizarras).

TIPOS DE INSTRUMENTOS QUE DEBES IDENTIFICAR Y MAPEAR:
1. LISTA DE COTEJO / TEST / CUESTIONARIO: Mapear a 'cotejo'. Cada pregunta o ítem es un criterio con puntos.
2. RÚBRICA: Mapear a 'rubrica'. Identifica filas (dimensiones) y columnas (niveles).
3. ESCALA DE VALORACIÓN: Mapear a 'escala'. Identifica los criterios y los niveles compartidos (ej: 1 al 5 o Nunca a Siempre).
4. DIARIO DE CAMPO / ANECDOTARIO / GUÍA NARRATIVA: Mapear a 'anecdotario'. Crea criterios de observación cualitativa.
5. MAPAS MENTALES / CONCEPTUALES / TRABAJOS: Si la imagen es el TRABAJO EN SÍ, genera una RÚBRICA para evaluarlo basándote en estándares académicos.

INSTRUCCIONES CRÍTICAS:
- Extrae el nombre de la actividad.
- Si es una LISTA/TEST: Asegúrate de que la suma de puntos sea 20.
- Si es una RÚBRICA: Si faltan descripciones en los niveles, genéralas tú de forma profesional.
- Toda la salida DEBE estar en ESPAÑOL.

Imagen del instrumento: {{media url=photoDataUri}}`,
});

const analyzeInstrumentFlow = ai.defineFlow(
  {
    name: 'analyzeInstrumentFlow',
    inputSchema: AnalyzeInstrumentInputSchema,
    outputSchema: AnalyzeInstrumentOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeInstrumentPrompt(input);
    return output!;
  }
);

export async function analyzeInstrument(input: AnalyzeInstrumentInput): Promise<AnalyzeInstrumentOutput> {
  return analyzeInstrumentFlow(input);
}
