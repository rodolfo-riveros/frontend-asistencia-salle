'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const StudentGradeSchema = z.object({
  studentId: z.string().describe('Unique identifier for the student.'),
  studentName: z.string().describe('Full name of the student.'),
  evaluations: z.array(z.object({
    evalName: z.string().describe('Name of the evaluation or instrument.'),
    indicatorCode: z.string().describe('Code of the indicator/logro this eval belongs to.'),
    score: z.number().describe('Raw score obtained (out of maxPoints).'),
    maxPoints: z.number().describe('Maximum possible points for this evaluation.'),
    weight: z.number().describe('Weight percentage of this instrument within its indicator.'),
  })).describe('List of evaluations with scores for this student.'),
  finalGrade: z.number().describe('Calculated final grade on a 0-20 scale. Passing is 13+.'),
});

const AcademicInsightsInputSchema = z.object({
  courseName: z.string().describe('Name of the course/unidad didáctica.'),
  programName: z.string().describe('Name of the academic program.'),
  semester: z.string().describe('Semester or period.'),
  passingGrade: z.number().describe('Minimum grade to pass (default 13).'),
  students: z.array(StudentGradeSchema).describe('Array of all students with their grades.'),
});
export type AcademicInsightsInput = z.infer<typeof AcademicInsightsInputSchema>;

const AcademicInsightsOutputSchema = z.object({
  summary: z.string().describe('General summary of academic performance across the group. Include passing rate, average grade, and overall diagnosis.'),
  groupAverage: z.number().describe('Average final grade of all students.'),
  passingRate: z.number().describe('Percentage of students who passed (0-100).'),
  failingStudents: z.array(z.object({
    name: z.string().describe('Full name of the student.'),
    finalGrade: z.number().describe('Final grade (0-20).'),
    weakestIndicators: z.string().describe('Which indicators they failed. Use EXACT same text for students who failed the same indicators so they can be grouped. Format: "Desaprobó en indicadores: I1, I3".'),
    reason: z.string().describe('Brief analysis of why they are failing (e.g., "Low performance across all indicators, inconsistent with group average").'),
    suggestion: z.string().describe('Specific pedagogical recommendation for what to reinforce and how to improve. Use the same exact text for students who failed the same indicators so they can be grouped.'),
  })).describe('List of students with final grade below passingGrade (desaprobados). Group students with same failed indicators by using identical weakestIndicators and suggestion text.'),
  passingStudents: z.array(z.object({
    name: z.string().describe('Full name of the student.'),
    finalGrade: z.number().describe('Final grade (0-20).'),
    strengths: z.string().describe('Which indicators or evaluations they excelled at.'),
  })).describe('List of students who passed (final grade >= passingGrade).'),
  strugglingEvaluations: z.array(z.object({
    evalName: z.string().describe('Name of the evaluation/instrument.'),
    indicatorCode: z.string().describe('Indicator code this eval belongs to.'),
    failureRate: z.number().describe('Percentage of students who scored below 60% of max points in this eval (0-100).'),
    analysis: z.string().describe('Brief analysis of why this instrument was difficult.'),
  })).describe('Evaluations/instruments where most students performed poorly.'),
  recommendations: z.array(z.string()).describe('Actionable pedagogical recommendations for the instructor to help struggling students. Include at least 3.'),
});
export type AcademicInsightsOutput = z.infer<typeof AcademicInsightsOutputSchema>;

const academicInsightsPrompt = ai.definePrompt({
  name: 'academicInsightsPrompt',
  input: { schema: AcademicInsightsInputSchema },
  output: { schema: AcademicInsightsOutputSchema },
  prompt: `Eres un analista experto en rendimiento académico para el IES LA SALLE URUBAMBA.
Tu misión es analizar las calificaciones de los alumnos, identificar quienes están desaprobados (nota < {{passingGrade}}), y generar recomendaciones pedagógicas.

Curso: {{courseName}}
Programa: {{programName}}
Semestre: {{semester}}
Nota mínima aprobatoria: {{passingGrade}}

DATOS DE ALUMNOS:
{{#each students}}
- {{this.studentName}} | Nota final: {{this.finalGrade}}/20
  Evaluaciones:
  {{#each this.evaluations}}
    • {{this.evalName}} ({{this.indicatorCode}}): {{this.score}}/{{this.maxPoints}} (peso: {{this.weight}}%)
  {{/each}}
{{/each}}

INSTRUCCIONES CRÍTICAS:
1. Calcula el promedio grupal y la tasa de aprobación.
2. Para cada alumno con nota < {{passingGrade}}, inclúyelo en 'failingStudents' con análisis detallado. Si varios alumnos desaprobaron los mismos indicadores, usa exactamente el mismo texto en 'weakestIndicators' y 'suggestion' para que se puedan agrupar.
3. Para cada alumno con nota >= {{passingGrade}}, inclúyelo en 'passingStudents' con sus fortalezas.
4. Identifica qué evaluaciones/instrumentos tuvieron mayor tasa de fracaso (menos del 60% del puntaje máximo) en 'strugglingEvaluations'.
5. Genera recomendaciones pedagógicas accionables en 'recommendations'.
6. En 'failingStudents[].weakestIndicators' sé específico: menciona qué indicadores desaprobó el alumno. Usa formato estandarizado como "Desaprobó en indicadores: I1, I3".
7. En 'failingStudents[].suggestion' da recomendaciones concretas: qué reforzar, cómo mejorar, si necesita recuperación. Usa el MISMO texto para alumnos que fallaron los mismos indicadores.
8. Todo en ESPAÑOL, tono profesional y constructivo. No uses la palabra "jaló", usa "desaprobó".
9. 'recommendations' debe tener al menos 3 elementos.`,
});

const aiAcademicInsightsFlow = ai.defineFlow(
  {
    name: 'aiAcademicInsightsFlow',
    inputSchema: AcademicInsightsInputSchema,
    outputSchema: AcademicInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await academicInsightsPrompt(input);
    return output!;
  }
);

export async function aiAcademicInsights(input: AcademicInsightsInput): Promise<AcademicInsightsOutput> {
  return aiAcademicInsightsFlow(input);
}
