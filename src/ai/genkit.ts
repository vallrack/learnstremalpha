import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Next.js automatically loads environment variables from .env* files.
// Ensuring we pick a NON-EMPTY key from the provided environment variables.
const apiKey = [
  process.env.BACKUP_AI_KEY,
  process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  process.env.GOOGLE_GENAI_API_KEY,
  process.env.GEMINI_API_KEY
].find(key => key && key.length > 0);

if (!apiKey) {
  console.warn("⚠️ No se detectó ninguna API Key válida en las variables de entorno.");
}

export const ai = genkit({
  plugins: [googleAI({ apiKey })],
  model: 'googleai/gemini-2.0-flash-exp',
});
