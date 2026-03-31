import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Next.js automatically loads environment variables from .env* files.
// Ensuring we pick a NON-EMPTY key from the provided environment variables.
const apiKey = [
  process.env.GOOGLE_GENAI_API_KEY,
  process.env.GEMINI_API_KEY
].find(key => key && key.length > 0);

export const ai = genkit({
  plugins: [googleAI({ apiKey })],
  model: 'googleai/gemini-1.5-flash-latest',
});
