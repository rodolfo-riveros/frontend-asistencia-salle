'use server';
/**
 * @fileOverview AI flow to analyze pedagogical assessment instruments using Gemini 2.5 Flash.
 * Optimized to be context-aware of the instrument type selected by the user.
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
  expectedType: z.enum(['cotejo', 'rubrica', 'escala', 'anecdotario', 'manual']).optional().describe('The type of instrument the user selected in the UI.'),
});
export type AnalyzeInstrumentInput = z.infer<typeof AnalyzeInstrumentInputSchema>;

const AnalyzeInstrumentOutputSchema = z.object({
  type: z.enum(['cotejo', 'rubrica', 'escala', 'anecdotario']).describe('Identified or confirmed instrument type.'),
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
Tu misión es digitalizar instrumentos de evaluación a partir de imágenes con ALTA PRECISIÓN.

CONTEXTO DEL USUARIO:
El usuario espera un instrumento de tipo: "{{expectedType}}". 
Prioriza la extracción de datos siguiendo estrictamente esta estructura.

INSTRUCCIONES DE EXTRACCIÓN:
1. SI ES RÚBRICA: Extrae una tabla de dimensiones (filas) y niveles (columnas). Cada dimensión debe tener sus propios descriptores por nivel.
2. SI ES COTEJO o GUÍA: Extrae una lista de ítems. Ajusta los puntos de cada ítem para que la suma total sea exactamente 20.
3. SI ES ESCALA: Extrae los criterios y la escala común (ej: 1 al 5).
4. DATOS GENERALES: Extrae el nombre de la actividad y cualquier porcentaje de peso mencionado.

REGLAS CRÍTICAS:
- Responde siempre en ESPAÑOL.
- No inventes datos; si algo no es legible, omítelo pero mantén la estructura.
- Asegúrate de que los puntos sean números válidos.

Imagen: {{media url=photoDataUri}}`,
});

export async function analyzeInstrument(input: AnalyzeInstrumentInput): Promise<AnalyzeInstrumentOutput> {
  const { output } = await analyzeInstrumentPrompt(input);
  if (!output) {
    throw new Error("La IA no pudo procesar la imagen con el rigor requerido.");
  }
  return output;
}
