'use server';
/**
 * @fileOverview AI flow to evaluate student coding challenges.
 *
 * - evaluateChallenge - A function that grades and provides feedback for a student's solution.
 * - EvaluateChallengeInput - Input type (student code, challenge context).
 * - EvaluateChallengeOutput - Output type (score, feedback, passed status).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EvaluateChallengeInputSchema = z.object({
  challengeTitle: z.string(),
  challengeDescription: z.string(),
  technology: z.string(),
  studentCode: z.string(),
  solutionReference: z.string().optional(),
});
export type EvaluateChallengeInput = z.infer<typeof EvaluateChallengeInputSchema>;

const EvaluateChallengeOutputSchema = z.object({
  score: z.number().describe('A score from 0 to 100.'),
  passed: z.boolean().describe('Whether the student passed the challenge.'),
  feedback: z.string().describe('Detailed technical feedback and suggestions for improvement.'),
});
export type EvaluateChallengeOutput = z.infer<typeof EvaluateChallengeOutputSchema>;

export async function evaluateChallenge(input: EvaluateChallengeInput): Promise<EvaluateChallengeOutput> {
  return evaluateChallengeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateChallengePrompt',
  input: {schema: EvaluateChallengeInputSchema},
  output: {schema: EvaluateChallengeOutputSchema},
  prompt: `You are an expert technical interviewer and senior developer. 
Your task is to evaluate a student's submission for a coding/design challenge.

Challenge Context:
---
Title: {{{challengeTitle}}}
Technology: {{{technology}}}
Description: {{{challengeDescription}}}
Reference Solution (if available): {{{solutionReference}}}
---

Student's Submission:
---
{{{studentCode}}}
---

Evaluation Criteria:
1. Logic and Correctness: Does the code solve the problem described?
2. Best Practices: Is the code clean, efficient, and following the idiomatic patterns of {{{technology}}}?
3. Visual/Structure (if UI/UX): Does the HTML/CSS/Design structure make sense for the goal?

Provide a score from 0 to 100. Be encouraging but rigorous. If the code is completely empty or irrelevant, give a very low score.`,
});

const evaluateChallengeFlow = ai.defineFlow(
  {
    name: 'evaluateChallengeFlow',
    inputSchema: EvaluateChallengeInputSchema,
    outputSchema: EvaluateChallengeOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) throw new Error('Evaluation failed.');
    return output;
  }
);
