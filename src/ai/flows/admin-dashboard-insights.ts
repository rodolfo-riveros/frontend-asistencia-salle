
'use server';
/**
 * @fileOverview AI flow to generate executive insights for the Admin Dashboard.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdminDashboardInputSchema = z.object({
  stats: z.object({
    totalPrograms: z.number(),
    totalInstructors: z.number(),
    totalCourses: z.number(),
    averageAttendance: z.string(),
  }),
  recentActivities: z.array(z.string()),
});
export type AdminDashboardInput = z.infer<typeof AdminDashboardInputSchema>;

const AdminDashboardOutputSchema = z.object({
  executiveSummary: z.string().describe('A high-level overview of institutional health.'),
  criticalInsights: z.array(z.string()).describe('List of important data points or concerns identified.'),
  strategicRecommendations: z.array(z.string()).describe('Actionable advice for institutional improvement.'),
});
export type AdminDashboardOutput = z.infer<typeof AdminDashboardOutputSchema>;

const adminDashboardInsightsPrompt = ai.definePrompt({
  name: 'adminDashboardInsightsPrompt',
  input: { schema: AdminDashboardInputSchema },
  output: { schema: AdminDashboardOutputSchema },
  prompt: `You are an AI Strategy Consultant for IES LA SALLE URUBAMBA. 
Analyze the following institutional data:

Programs: {{stats.totalPrograms}}
Instructors: {{stats.totalInstructors}}
Courses: {{stats.totalCourses}}
Average Attendance: {{stats.averageAttendance}}

Recent Activities:
{{#each recentActivities}}
- {{this}}
{{/each}}

Provide an executive analysis including institutional health summary, critical insights (trends or red flags), and strategic recommendations to improve performance and student retention. 
Maintain a formal, professional, and institutional tone.`,
});

const adminDashboardInsightsFlow = ai.defineFlow(
  {
    name: 'adminDashboardInsightsFlow',
    inputSchema: AdminDashboardInputSchema,
    outputSchema: AdminDashboardOutputSchema,
  },
  async (input) => {
    const { output } = await adminDashboardInsightsPrompt(input);
    return output!;
  }
);

export async function getAdminInsights(input: AdminDashboardInput): Promise<AdminDashboardOutput> {
  return adminDashboardInsightsFlow(input);
}
