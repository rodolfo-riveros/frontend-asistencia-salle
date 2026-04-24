
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
    temperature: 0.5,
  },
  prompt: `Eres un Diseñador Instruccional Senior y Experto Técnico para el IES LA SALLE URUBAMBA.
Tu tarea es crear un Quizz de gamificación de ALTA EXIGENCIA basado en criterios de evaluación técnica para el curso de "{{subjectName}}".

INSTRUCCIONES CRÍTICAS DE CALIDAD:
1. RIGOR ACADÉMICO: Las preguntas deben ser técnicamente precisas, basadas en estándares industriales o bibliografía técnica sustentada. Evita datos erróneos, ambiguos o triviales.
2. ESTRUCTURA: Crea exactamente 2 preguntas desafiantes por cada criterio proporcionado.
3. DISTRACTORES: Las opciones incorrectas deben ser plausibles (errores comunes en la práctica técnica) pero claramente distinguibles de la respuesta correcta para un estudiante preparado.
4. LENGUAJE: Usa terminología técnica propia de la carrera. Responde siempre en ESPAÑOL con un tono profesional, institucional y motivador.
5. TRAZABILIDAD: Vincula cada pregunta al 'id' del criterio correspondiente mediante el campo 'criterionId'.

Criterios a evaluar:
{{#each criteria}}
- [ID: {{this.id}}] {{this.description}}
{{/each}}`,
});

export async function generateQuiz(input: GenerateQuizInput): Promise<GenerateQuizOutput> {
  const { output } = await generateQuizPrompt(input);
  if (!output) {
    throw new Error("La IA no pudo generar las preguntas del Quizz con el rigor requerido.");
  }
  return output;
}
