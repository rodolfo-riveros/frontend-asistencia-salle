'use server';
/**
 * @fileOverview An AI-powered tool to analyze historical attendance data and predict desertion or tardiness risks.
 *
 * - aiAttendanceInsights - A function that analyzes attendance data to generate summaries, identify trends, and highlight at-risk or warning students.
 * - AttendanceInsightsInput - The input type for the aiAttendanceInsights function.
 * - AttendanceInsightsOutput - The return type for the aiAttendanceInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AttendanceRecordSchema = z.object({
  studentId: z.string().describe('Unique identifier for the student.'),
  studentName: z.string().describe('Name of the student.'),
  courseUnitId: z.string().describe('Unique identifier for the course unit.'),
  courseUnitName: z.string().describe('Name of the course unit.'),
  date: z.string().describe('The date of the attendance record in YYYY-MM-DD format.'),
  status: z.enum(['Presente', 'Tarde', 'Falta', 'Justificado']).describe('Attendance status for the student on this date.'),
});

const AttendanceInsightsInputSchema = z.object({
  attendanceRecords: z.array(AttendanceRecordSchema).describe('An array of historical attendance records.'),
  analysisContext: z.string().optional().describe('Optional: A specific student name or course unit name to focus the analysis on.'),
});
export type AttendanceInsightsInput = z.infer<typeof AttendanceInsightsInputSchema>;

const AttendanceInsightsOutputSchema = z.object({
  summary: z.string().describe('A general summary of the attendance data provided.'),
  atRiskStudents: z.array(z.object({
    name: z.string().describe('Full name of the student.'),
    absencePercentage: z.number().describe('Calculated absence percentage.'),
    reason: z.string().describe('Brief reason why they are at risk (e.g., "Frequent absences on Mondays").'),
  })).describe('List of students with 30% or more absences or showing high desertion risk.'),
  warningStudents: z.array(z.object({
    name: z.string().describe('Full name of the student.'),
    tardyCount: z.number().describe('Number of tardies identified.'),
    reason: z.string().describe('Brief reason for the warning (e.g., "Always arrives 15 minutes late").'),
    suggestion: z.string().describe('Pedagogical suggestion for the teacher to talk to the student.'),
  })).describe('List of students with frequent tardiness (early warning signs).'),
  trends: z.array(z.string()).describe('List of identified attendance trends.'),
  recommendations: z.array(z.string()).describe('Actionable recommendations for the instructor.'),
});
export type AttendanceInsightsOutput = z.infer<typeof AttendanceInsightsOutputSchema>;

const attendanceInsightsPrompt = ai.definePrompt({
  name: 'attendanceInsightsPrompt',
  input: { schema: AttendanceInsightsInputSchema },
  output: { schema: AttendanceInsightsOutputSchema },
  prompt: `Eres un analista experto en retención estudiantil para el IES LA SALLE URUBAMBA. 
Tu misión es identificar alumnos en riesgo de deserción (basándote en faltas) y alumnos con patrones de tardanza (advertencia temprana).

Analiza los siguientes registros históricos de asistencia:
{{#each attendanceRecords}}
- Alumno: {{this.studentName}}, Fecha: {{this.date}}, Estado: {{this.status}}
{{/each}}

{{#if analysisContext}}
Contexto adicional: {{{analysisContext}}}
{{/if}}

INSTRUCCIONES CRÍTICAS:
1. DESERCIÓN: Calcula el % de 'Falta' sobre el total. Si es >= 30%, inclúyelo en 'atRiskStudents'.
2. ADVERTENCIA TEMPRANA (TARDANZAS): Identifica alumnos con 2 o más estados 'Tarde'. Inclúyelos en 'warningStudents'. Explica por qué es una señal de alerta y qué decirle al alumno.
3. Identifica patrones como inasistencias o tardanzas consecutivas o en días específicos.
4. Genera todas las descripciones, nombres y recomendaciones en ESPAÑOL.
5. Sé preciso con los nombres y proporciona recomendaciones pedagógicas reales.

La salida debe ser un objeto JSON que siga estrictamente el esquema definido.`,
});

const aiAttendanceInsightsFlow = ai.defineFlow(
  {
    name: 'aiAttendanceInsightsFlow',
    inputSchema: AttendanceInsightsInputSchema,
    outputSchema: AttendanceInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await attendanceInsightsPrompt(input);
    return output!;
  }
);

export async function aiAttendanceInsights(input: AttendanceInsightsInput): Promise<AttendanceInsightsOutput> {
  return aiAttendanceInsightsFlow(input);
}
