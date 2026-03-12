import { config } from 'dotenv';
config();

import '@/ai/flows/ask-lesson-questions.ts';
import '@/ai/flows/summarize-lesson-content.ts';
import '@/ai/flows/evaluate-challenge.ts';
