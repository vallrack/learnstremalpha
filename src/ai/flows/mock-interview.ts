'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MockInterviewInputSchema = z.object({
  message: z.string().describe('The message from the user (transcribed voice).'),
  language: z.enum(['en', 'es']).default('es').describe('The language of the interview.'),
  role: z.string().describe('The role for which the user is interviewing (e.g., Frontend Developer).'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.array(z.object({ text: z.string() })),
  })).optional().describe('The conversation history to maintain context.'),
});

const MockInterviewOutputSchema = z.object({
  reply: z.string().describe('The AI interviewer\'s response.'),
  suggestedNextStep: z.string().optional().describe('Optional suggestion for the user (internal only).'),
});

export async function mockInterview(input: z.infer<typeof MockInterviewInputSchema>) {
  return mockInterviewFlow(input);
}

const mockInterviewFlow = ai.defineFlow(
  {
    name: 'mockInterviewFlow',
    inputSchema: MockInterviewInputSchema,
    outputSchema: MockInterviewOutputSchema,
  },
  async (input) => {
    const { message, language, role, history = [] } = input;

    const systemPrompt = language === 'en' 
      ? `You are a world-class technical interviewer at a top tech company. 
         You are interviewing a candidate for a ${role} position.
         Your goal is to be professional, slightly challenging, but encouraging.
         Speak naturally and keep your responses relatively concise (maximum 3 sentences) since the user is listening to you.
         Conduct the interview in English.`
      : `Eres un entrevistador técnico de clase mundial en una empresa tecnológica top.
         Estás entrevistando a un candidato para la posición de ${role}.
         Tu objetivo es ser profesional, ligeramente desafiante pero alentador.
         Habla de forma natural y mantén tus respuestas relativamente concisas (máximo 3 frases) ya que el usuario te está escuchando.
         Realiza la entrevista en español.`;

    const historyString = history.map(m => 
      `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content[0].text}`
    ).join('\n');

    const fullPrompt = `
${systemPrompt}

Conversation History:
${historyString}

Current Candidate Statement: "${message}"
Interviewer:`;

    const { text } = await ai.generate(fullPrompt);

    return {
      reply: text,
      suggestedNextStep: "Continue the interview flow"
    };
  }
);
