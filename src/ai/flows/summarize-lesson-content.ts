'use server';

/**
 * @fileOverview This file defines a Genkit flow for summarizing lesson content.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeLessonContentInputSchema = z.object({
  lessonContent: z.string().describe('The full content of the lesson to be summarized.'),
});
export type SummarizeLessonContentInput = z.infer<typeof SummarizeLessonContentInputSchema>;

const SummarizeLessonContentOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the lesson content.'),
});
export type SummarizeLessonContentOutput = z.infer<typeof SummarizeLessonContentOutputSchema>;

export type SafeSummarizeLessonContentOutput = 
  | { success: true; data: SummarizeLessonContentOutput }
  | { success: false; error: string };

export async function summarizeLessonContent(
  input: SummarizeLessonContentInput
): Promise<SafeSummarizeLessonContentOutput> {
  try {
    const data = await summarizeLessonContentFlow(input);
    return { success: true, data };
  } catch (error: any) {
    console.error("Summarization Error:", error);
    return { success: false, error: error.message || 'Error al generar el resumen.' };
  }
}

const summarizeLessonContentPrompt = ai.definePrompt({
  name: 'summarizeLessonContentPrompt',
  input: {schema: SummarizeLessonContentInputSchema},
  output: {schema: SummarizeLessonContentOutputSchema},
  prompt: `Please provide a concise summary of the following lesson content. The summary should capture the main points and be easy to review.

Lesson Content:

---
{{{lessonContent}}}
---`,
});

const summarizeLessonContentFlow = ai.defineFlow(
  {
    name: 'summarizeLessonContentFlow',
    inputSchema: SummarizeLessonContentInputSchema,
    outputSchema: SummarizeLessonContentOutputSchema,
  },
  async (input) => {
    const {output} = await summarizeLessonContentPrompt(input);
    if (!output) {
      throw new Error('Failed to generate summary.');
    }
    return output;
  }
);
