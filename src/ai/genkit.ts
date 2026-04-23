import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * @fileOverview Configuración central de Genkit.
 * Se utiliza el plugin oficial de Google AI con soporte para Gemini 1.5 Flash.
 */
export const ai = genkit({
  plugins: [
    googleAI() // El plugin buscará automáticamente GOOGLE_GENAI_API_KEY
  ],
  model: 'googleai/gemini-1.5-flash',
});
