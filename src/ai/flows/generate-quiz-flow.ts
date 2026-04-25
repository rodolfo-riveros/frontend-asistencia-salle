
'use server';
/**
 * @fileOverview AI flow to generate multiple choice quiz questions based on pedagogical criteria using Gemini 2.5 Flash.
 * Optimized to generate 20 high-stakes technical questions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const QuizQuestionSchema = z.object({
  text: z.string().describe('The question text.'),
  options: z.array(z.string()).length(4).describe('Four possible answers.'),
  correctIndex: z.number().min(0).max(3).describe('Index of the correct answer.'),
  timeLimit: z.number().default(20).describe('Seconds to answer.'),
  criterionId: z.string().describe('The ID of the criterion this question evaluates.'),
});

const GenerateQuizInputSchema = z.object({
  criteria: z.array(z.object({
    id: z.string(),
    description: z.string(),
  })),
  subjectName: z.string(),
});
export type GenerateQuizInput = z.infer<typeof GenerateQuizInputSchema>;

const GenerateQuizOutputSchema = z.object({
  questions: z.array(QuizQuestionSchema),
});
export type GenerateQuizOutput = z.infer<typeof GenerateQuizOutputSchema>;

const generateQuizPrompt = ai.definePrompt({
  name: 'generateQuizPrompt',
  model: 'googleai/gemini-2.5-flash',
  input: { schema: GenerateQuizInputSchema },
  output: { schema: GenerateQuizOutputSchema },
  config: {
    temperature: 0.4,
  },
  prompt: `Eres un Diseñador Instruccional Senior y Experto Técnico para el IES LA SALLE URUBAMBA.
Tu tarea es crear un Quizz de gamificación de ALTA EXIGENCIA basado en criterios de evaluación técnica para el curso de "{{subjectName}}".

INSTRUCCIONES CRÍTICAS DE CALIDAD:
1. RIGOR ACADÉMICO: Las preguntas deben ser técnicamente precisas, basadas en estándares industriales o bibliografía técnica sustentada.
2. CANTIDAD: Debes generar exactamente 20 preguntas desafiantes en total. Distribúyelas equitativamente entre los criterios proporcionados (por ejemplo, si hay 10 criterios, crea exactamente 2 preguntas por criterio).
3. DISTRACTORES: Las opciones incorrectas deben ser plausibles pero claramente distinguibles para un estudiante preparado.
4. LENGUAJE: Usa terminología técnica propia de la carrera. Responde siempre en ESPAÑOL con un tono profesional e institucional.
5. TRAZABILIDAD: Vincula cada pregunta al 'id' del criterio correspondiente mediante el campo 'criterionId'.

Criterios a evaluar:
{{#each criteria}}
- [ID: {{this.id}}] {{this.description}}
{{/each}}`,
});

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  const { output } = await generateQuizPrompt(input);
  if (!output || !output.questions) {
    throw new Error("La IA no pudo generar las preguntas del Quizz con el rigor requerido.");
  }
  return output;
}
