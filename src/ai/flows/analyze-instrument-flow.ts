'use server';
/**
 * @fileOverview AI flow to analyze images of assessment instruments (checklists/rubrics).
 *
 * - analyzeInstrument - Extracts criteria, types and scores from an image.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChecklistItemSchema = z.object({
  description: z.string().describe('The description of the criterion.'),
  points: z.number().describe('Points assigned to this criterion.'),
});

const RubricLevelSchema = z.object({
  label: z.string().describe('Level name (e.g., Excelente, Bueno).'),
  points: z.number().describe('Points for this level.'),
  description: z.string().describe('Description of performance at this level.'),
});

const RubricDimensionSchema = z.object({
  category: z.string().describe('Category or dimension being evaluated.'),
  levels: z.array(RubricLevelSchema).describe('The performance levels for this dimension.'),
});

const AnalyzeInstrumentInputSchema = z.object({
  photoDataUri: z.string().describe("Data URI of the image (base64)."),
});
export type AnalyzeInstrumentInput = z.infer<typeof AnalyzeInstrumentInputSchema>;

const AnalyzeInstrumentOutputSchema = z.object({
  type: z.enum(['cotejo', 'rubrica']).describe('Identified instrument type.'),
  name: z.string().describe('Suggested name for the evaluation activity.'),
  checklistCriteria: z.array(ChecklistItemSchema).optional().describe('Extracted criteria if checklist.'),
  rubricDimensions: z.array(RubricDimensionSchema).optional().describe('Extracted dimensions if rubric.'),
});
export type AnalyzeInstrumentOutput = z.infer<typeof AnalyzeInstrumentOutputSchema>;

const analyzeInstrumentPrompt = ai.definePrompt({
  name: 'analyzeInstrumentPrompt',
  input: { schema: AnalyzeInstrumentInputSchema },
  output: { schema: AnalyzeInstrumentOutputSchema },
  prompt: `Eres un experto en pedagogía y digitalización académica para el IES LA SALLE URUBAMBA.
Tu tarea es analizar la imagen proporcionada de un instrumento de evaluación (lista de cotejo o rúbrica).

INSTRUCCIONES:
1. Identifica el tipo de instrumento.
2. Extrae el nombre de la actividad o tema si está visible.
3. Si es una LISTA DE COTEJO: Extrae cada criterio y su puntaje. Asegúrate de que la suma de puntos de todos los criterios sea exactamente 20.
4. Si es una RÚBRICA: Extrae las dimensiones (filas) y los niveles de desempeño (columnas). Si los niveles no están claros, usa el estándar: Excelente (4), Bueno (3), Regular (2), Deficiente (1), No presenta (0).
5. Genera todo el contenido en ESPAÑOL.

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
