
'use server';
/**
 * @fileOverview AI flow to generate multiple choice quiz questions based on pedagogical criteria using Gemini 2.5 Flash.
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
    temperature: 0.7,
  },
  prompt: `Eres un Diseñador Instruccional Senior para el IES LA SALLE URUBAMBA.
Tu tarea es crear un Quizz de gamificación basado en los siguientes criterios de evaluación técnica para el curso de "{{subjectName}}".

INSTRUCCIONES:
1. Crea exactamente 2 preguntas desafiantes por cada criterio proporcionado.
2. Las preguntas deben evaluar el conocimiento técnico descrito en el criterio.
3. Asegúrate de que las opciones sean plausibles pero solo una sea correcta.
4. Vincula cada pregunta al 'id' del criterio correspondiente mediante el campo 'criterionId'.
5. Responde siempre en ESPAÑOL con un tono profesional y motivador.

Criterios:
{{#each criteria}}
- [ID: {{this.id}}] {{this.description}}
{{/each}}`,
});

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  const { output } = await generateQuizPrompt(input);
  if (!output) {
    throw new Error("La IA no pudo generar las preguntas del Quizz.");
  }
  return output;
}
