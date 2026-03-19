
'use server';
/**
 * @fileOverview AI flow to evaluate student coding and language challenges.
 *
 * - evaluateChallenge - A function that grades and provides feedback for a student's solution.
 * - EvaluateChallengeInput - Input type (student text/code, challenge context).
 * - EvaluateChallengeOutput - Output type (score, feedback, passed status, awarded badge).
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
  score: z.number().describe('Una calificación numérica del 0 al 5, donde 5 es la máxima nota.'),
  passed: z.boolean().describe('Indica si el estudiante aprobó el desafío (generalmente nota >= 3).'),
  feedback: z.string().describe('Feedback detallado y sugerencias de mejora, SIEMPRE EN ESPAÑOL.'),
  awardedBadge: z.object({
    title: z.string().describe('Un título creativo para la insignia lograda, ej: "Polyglot Coder" o "Maestro de la Lógica".'),
    description: z.string().describe('Una breve explicación de por qué ganó esta insignia.'),
    iconType: z.enum(['logic', 'style', 'data', 'architecture', 'speed', 'communication']).describe('El tipo de habilidad demostrada.')
  }).optional().describe('Solo se otorga si el puntaje es alto (4.5+) y demuestra maestría.'),
});
export type EvaluateChallengeOutput = z.infer<typeof EvaluateChallengeOutputSchema>;

export async function evaluateChallenge(input: EvaluateChallengeInput): Promise<EvaluateChallengeOutput> {
  return evaluateChallengeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateChallengePrompt',
  input: {schema: EvaluateChallengeInputSchema},
  output: {schema: EvaluateChallengeOutputSchema},
  prompt: `Eres un experto revisor senior en tecnología y comunicación profesional.
Tu tarea es evaluar la entrega de un estudiante para un desafío que puede ser de CÓDIGO o de IDIOMAS (INGLÉS TÉCNICO).

REGLA CRÍTICA: Todo el feedback debe estar escrito en ESPAÑOL para que el estudiante lo entienda claramente, independientemente de la materia evaluada.

Contexto del Desafío:
---
Título: {{{challengeTitle}}}
Materia/Tecnología: {{{technology}}}
Descripción: {{{challengeDescription}}}
Referencia Esperada: {{{solutionReference}}}
---

Entrega del Estudiante:
---
{{{studentCode}}}
---

INSTRUCCIONES SEGÚN MATERIA:

1. SI ES CÓDIGO O LÓGICA (Ej: JavaScript, Python, PSeInt, LPP):
   - Evalúa la correctitud algorítmica y mejores prácticas.
   - Para PSeInt/LPP, prioriza la resolución lógica sobre la sintaxis estricta.

2. SI ES INGLÉS O COMUNICACIÓN (Ej: English for Programmers, B1, Technical Documentation):
   - Evalúa gramática, vocabulario técnico y adecuación al contexto profesional.
   - Valora si el estudiante logra comunicar la idea técnica de forma efectiva en inglés.
   - Sugiere correcciones idiomáticas si es necesario.

Criterios Generales:
- Proporciona una calificación del 0 al 5 (3 o más es aprobado).
- Sé alentador pero riguroso.
- Si el estudiante demuestra maestría (4.5+), otorga una insignia creativa relacionada con la habilidad (ej: "Global Communicator", "Algorithm Ninja").`,
});

const evaluateChallengeFlow = ai.defineFlow(
  {
    name: 'evaluateChallengeFlow',
    inputSchema: EvaluateChallengeInputSchema,
    outputSchema: EvaluateChallengeOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) throw new Error('La evaluación falló.');
    return output;
  }
);
