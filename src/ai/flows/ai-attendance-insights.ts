'use server';
/**
 * @fileOverview An AI-powered tool to analyze historical attendance data and predict desertion risk.
 *
 * - aiAttendanceInsights - A function that analyzes attendance data to generate summaries, identify trends, and highlight at-risk students.
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
  trends: z.array(z.string()).describe('List of identified attendance trends.'),
  recommendations: z.array(z.string()).describe('Actionable recommendations for the instructor.'),
});
export type AttendanceInsightsOutput = z.infer<typeof AttendanceInsightsOutputSchema>;

const attendanceInsightsPrompt = ai.definePrompt({
  name: 'attendanceInsightsPrompt',
  input: { schema: AttendanceInsightsInputSchema },
  output: { schema: AttendanceInsightsOutputSchema },
  prompt: `Eres un analista experto en retención estudiantil para el IES LA SALLE URUBAMBA. 
Tu misión es identificar alumnos en riesgo de deserción basándote en la regla del 30% de inasistencias.

Analiza los siguientes registros históricos de asistencia:
{{#each attendanceRecords}}
- Alumno: {{this.studentName}}, Fecha: {{this.date}}, Estado: {{this.status}}
{{/each}}

{{#if analysisContext}}
Contexto adicional: {{{analysisContext}}}
{{/if}}

INSTRUCCIONES CRÍTICAS:
1. Calcula el porcentaje de inasistencias (Falta) sobre el total de sesiones registradas para cada alumno.
2. Si un alumno tiene el 30% o más de inasistencias, inclúyelo obligatoriamente en la lista de 'atRiskStudents'.
3. Identifica patrones como inasistencias consecutivas o días específicos de falta.
4. Genera todas las descripciones, nombres y recomendaciones en ESPAÑOL.
5. Sé preciso con los nombres y proporciona recomendaciones pedagógicas para evitar la deserción.

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
