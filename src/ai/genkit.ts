import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Next.js automatically loads environment variables from .env* files.
// We use a robust fallback for the API key from both possible names provided.
export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY })],
  model: 'googleai/gemini-2.0-flash-exp',
});
