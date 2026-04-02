'use server';
/**
 * @fileOverview An AI-powered tool to analyze historical attendance data.
 *
 * - aiAttendanceInsights - A function that analyzes attendance data to generate summaries, identify trends, and highlight patterns.
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
  analysisContext: z.string().optional().describe('Optional: A specific student name or course unit name to focus the analysis on. E.g., "Student John Doe" or "Course: Advanced Mathematics".'),
});
export type AttendanceInsightsInput = z.infer<typeof AttendanceInsightsInputSchema>;

const AttendanceInsightsOutputSchema = z.object({
  summary: z.string().describe('A general summary of the attendance data provided.'),
  trends: z.array(z.string()).describe('List of identified attendance trends (e.g., "Student X is frequently late on Mondays.", "Course Y has a higher rate of unjustified absences.").'),
  patterns: z.array(z.string()).describe('List of highlighted attendance patterns (e.g., "A group of students often misses the first class after a holiday.", "Specific course units show a drop in attendance towards the end of the semester.").'),
  recommendations: z.array(z.string()).describe('Actionable recommendations based on the insights (e.g., "Consider reaching out to students with consistent \'Falta\' statuses.", "Review curriculum engagement for course units with low attendance.").'),
});
export type AttendanceInsightsOutput = z.infer<typeof AttendanceInsightsOutputSchema>;

const attendanceInsightsPrompt = ai.definePrompt({
  name: 'attendanceInsightsPrompt',
  input: { schema: AttendanceInsightsInputSchema },
  output: { schema: AttendanceInsightsOutputSchema },
  prompt: `You are an AI-powered attendance data analyst for a technical education system. Your task is to analyze historical attendance records and provide insights.

Here is the historical attendance data:
{{#each attendanceRecords}}
- Student: {{this.studentName}} (ID: {{this.studentId}}), Course: {{this.courseUnitName}} (ID: {{this.courseUnitId}}), Date: {{this.date}}, Status: {{this.status}}
{{/each}}

{{#if analysisContext}}
Focus your analysis on: {{{analysisContext}}}
{{/if}}

Based on the provided attendance data, perform the following:
1.  **Summarize** the overall attendance situation.
2.  **Identify trends** such as:
    -   Students with consistent lateness or absences.
    -   Specific days or times with higher/lower attendance.
    -   Course units with notable attendance issues.
    -   Changes in attendance over time.
3.  **Highlight patterns** such-as:
    -   Groups of students exhibiting similar attendance behaviors.
    -   Correlation between attendance status and specific events or dates.
    -   Any unusual or significant attendance deviations.
4.  **Provide actionable recommendations** for administrators or instructors to support students or improve attendance based on your findings.

Ensure your output strictly adheres to the JSON schema for summary, trends, patterns, and recommendations.`,
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
