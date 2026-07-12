'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateRecoveryQuizInputSchema = z.object({
  temaMarkdown: z.string().describe('Contenido del tema en formato markdown extraído del documento del docente.'),
  cantidad: z.number().default(5).describe('Cantidad de preguntas a generar (1-20).'),
});
export type GenerateRecoveryQuizInput = z.infer<typeof GenerateRecoveryQuizInputSchema>;

const GenerateRecoveryQuizOutputSchema = z.object({
  preguntas: z.array(z.object({
    pregunta: z.string().describe('Texto de la pregunta.'),
    opciones: z.array(z.string()).length(4).describe('Cuatro opciones de respuesta (a, b, c, d).'),
    correcta: z.number().min(0).max(3).describe('Índice de la respuesta correcta (0-3).'),
  })).describe('Lista de preguntas generadas.'),
});
export type GenerateRecoveryQuizOutput = z.infer<typeof GenerateRecoveryQuizOutputSchema>;

const generateRecoveryQuizPrompt = ai.definePrompt({
  name: 'generateRecoveryQuizPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: GenerateRecoveryQuizInputSchema },
  output: { schema: GenerateRecoveryQuizOutputSchema },
  config: { temperature: 0.4 },
  prompt: `Eres un Evaluador Académico del IES LA SALLE URUBAMBA.
Genera preguntas de opción múltiple (4 opciones) para evaluar a un estudiante de recuperación.

CONTENIDO DEL TEMA (SOLO ESTE TEXTO ES VÁLIDO):
{{temaMarkdown}}

INSTRUCCIONES:
1. Genera exactamente {{cantidad}} preguntas basadas ESTRICTAMENTE en el CONTENIDO ACADÉMICO del documento.
2. IGNORA cualquier metadato del archivo (nombre de archivo, software creador, versión de PDF, autor, fecha de creación, etc.). Solo usa el contenido educativo real.
3. Cada pregunta debe tener 4 opciones (a, b, c, d).
4. Solo una opción debe ser correcta; las otras deben ser distractores plausibles.
5. Las preguntas deben medir comprensión del tema, no sobre el formato del documento.
6. Responde en ESPAÑOL con terminología técnica apropiada.
7. NO inventes información que no esté en el contenido académico.`,
});

export async function generateRecoveryQuiz(input: GenerateRecoveryQuizInput): Promise<GenerateRecoveryQuizOutput> {
  const { output } = await generateRecoveryQuizPrompt(input);
  if (!output || !output.preguntas || output.preguntas.length === 0) {
    throw new Error('No se pudieron generar preguntas. Intenta con otro documento.');
  }
  return output;
}
