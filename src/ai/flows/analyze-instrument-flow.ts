
'use server';
/**
 * @fileOverview AI flow to analyze pedagogical assessment instruments using Gemini 2.5 Flash.
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
  photoDataUri: z.string().describe("Data URI of the image (base64). Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type AnalyzeInstrumentInput = z.infer<typeof AnalyzeInstrumentInputSchema>;

const AnalyzeInstrumentOutputSchema = z.object({
  type: z.enum(['cotejo', 'rubrica', 'escala', 'guia']).describe('Identified instrument type.'),
  name: z.string().describe('Suggested name for the evaluation activity.'),
  description: z.string().describe('Pedagogical intent or context.'),
  suggestedWeight: z.number().optional().describe('Weight percentage (0-100) if found in the document text.'),
  checklistCriteria: z.array(ChecklistItemSchema).optional().describe('Criteria for checklist/test or guide.'),
  rubricDimensions: z.array(RubricDimensionSchema).optional().describe('Dimensions for rubric.'),
  scaleLevels: z.array(z.object({
    label: z.string(),
    points: z.number()
  })).optional().describe('Levels for rating scale.'),
});
export type AnalyzeInstrumentOutput = z.infer<typeof AnalyzeInstrumentOutputSchema>;

const analyzeInstrumentPrompt = ai.definePrompt({
  name: 'analyzeInstrumentPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: AnalyzeInstrumentInputSchema },
  output: { schema: AnalyzeInstrumentOutputSchema },
  config: {
    temperature: 0.1,
  },
  prompt: `Eres un Consultor Pedagógico Senior para el IES LA SALLE URUBAMBA. 
Tu misión es digitalizar instrumentos de evaluación a partir de imágenes.

ANALIZA LA IMAGEN Y DETECTA:
1. TIPO DE INSTRUMENTO:
   - Si es una lista de ítems con SI/NO o puntajes: 'cotejo'.
   - Si es una tabla con filas (criterios) y columnas (niveles): 'rubrica'.
   - Si es una lista de criterios con una escala única (ej: 1 al 5): 'escala'.
   - Si es un formato de observación de procesos técnicos paso a paso: 'guia'.

2. EXTRACCIÓN DE DATOS:
   - Extrae el NOMBRE de la actividad.
   - Extrae todos los CRITERIOS o PREGUNTAS.
   - Si es RÚBRICA: Extrae las dimensiones y descripciones de cada nivel.
   - Si es COTEJO o GUIA: Ajusta los puntos de cada criterio para que la SUMA TOTAL SEA EXACTAMENTE 20.
   - PESO: Busca si el documento menciona algún porcentaje (ej: "Vale 30%", "Peso: 40"). Si lo encuentras, extráelo como un número en 'suggestedWeight'.

INSTRUCCIONES CRÍTICAS:
- Responde siempre en ESPAÑOL.
- Asegúrate de que el objeto JSON sea válido y completo.

Imagen: {{media url=photoDataUri}}`,
});

export async function analyzeInstrument(input: AnalyzeInstrumentInput): Promise<AnalyzeInstrumentOutput> {
  const { output } = await analyzeInstrumentPrompt(input);
  if (!output) {
    throw new Error("La IA no pudo procesar la imagen correctamente.");
  }
  return output;
}
