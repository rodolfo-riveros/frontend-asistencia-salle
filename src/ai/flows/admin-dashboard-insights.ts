
'use server';
/**
 * @fileOverview AI flow to generate executive insights for the Admin Dashboard in Spanish.
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
  executiveSummary: z.string().describe('Un resumen de alto nivel de la salud institucional.'),
  criticalInsights: z.array(z.string()).describe('Lista de puntos de datos importantes o preocupaciones identificadas.'),
  strategicRecommendations: z.array(z.string()).describe('Acciones recomendadas para la mejora institucional.'),
});
export type AdminDashboardOutput = z.infer<typeof AdminDashboardOutputSchema>;

const adminDashboardInsightsPrompt = ai.definePrompt({
  name: 'adminDashboardInsightsPrompt',
  input: { schema: AdminDashboardInputSchema },
  output: { schema: AdminDashboardOutputSchema },
  prompt: `Eres un Consultor de Estrategia de IA para el IES LA SALLE URUBAMBA. 
Analiza los siguientes datos institucionales:

Programas: {{stats.totalPrograms}}
Docentes: {{stats.totalInstructors}}
Cursos: {{stats.totalCourses}}
Asistencia Promedio: {{stats.averageAttendance}}

Actividades Recientes:
{{#each recentActivities}}
- {{this}}
{{/each}}

Proporciona un análisis ejecutivo que incluya un resumen de la salud institucional, hallazgos críticos (tendencias o señales de alerta) y recomendaciones estratégicas para mejorar el rendimiento y la retención estudiantil. 

Toda la respuesta DEBE estar obligatoriamente en ESPAÑOL.
Mantén un tono formal, profesional e institucional.`,
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
