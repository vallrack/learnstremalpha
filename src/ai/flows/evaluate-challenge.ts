
'use server';
/**
 * @fileOverview AI flow to evaluate student coding challenges and award technical badges.
 *
 * - evaluateChallenge - A function that grades and provides feedback for a student's solution.
 * - EvaluateChallengeInput - Input type (student code, challenge context).
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
  feedback: z.string().describe('Feedback técnico detallado y sugerencias de mejora, SIEMPRE EN ESPAÑOL.'),
  awardedBadge: z.object({
    title: z.string().describe('Un título creativo para la insignia lograda, ej: "Maestro de Bucles en Python" o "Arquitecto de Sombras CSS".'),
    description: z.string().describe('Una breve explicación de por qué ganó esta insignia.'),
    iconType: z.enum(['logic', 'style', 'data', 'architecture', 'speed']).describe('El tipo de habilidad demostrada.')
  }).optional().describe('Solo se otorga si el puntaje es alto (4.5+) y demuestra maestría en un concepto específico.'),
});
export type EvaluateChallengeOutput = z.infer<typeof EvaluateChallengeOutputSchema>;

export async function evaluateChallenge(input: EvaluateChallengeInput): Promise<EvaluateChallengeOutput> {
  return evaluateChallengeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'evaluateChallengePrompt',
  input: {schema: EvaluateChallengeInputSchema},
  output: {schema: EvaluateChallengeOutputSchema},
  prompt: `Eres un experto revisor técnico y desarrollador senior. 
Tu tarea es evaluar la entrega de un estudiante para un desafío de código o diseño.

REGLA CRÍTICA: Todo el feedback debe estar escrito en ESPAÑOL.

Contexto del Desafío:
---
Título: {{{challengeTitle}}}
Tecnología: {{{technology}}}
Descripción: {{{challengeDescription}}}
Solución de Referencia (si está disponible): {{{solutionReference}}}
---

Entrega del Estudiante:
---
{{{studentCode}}}
---

Criterios de Evaluación:
1. Lógica y Correctitud: ¿El código resuelve el problema planteado?
2. Mejores Prácticas: ¿Es código limpio, eficiente y sigue los patrones de {{{technology}}}?
3. Estructura/Diseño: Si es UI, ¿la estructura tiene sentido para el objetivo?

Si el estudiante demuestra un dominio excepcional (puntaje 4.5 o más), inventa una "Insignia de Maestría" específica para la habilidad que demostró (ej: "Maestro de bucles", "Ninja de Funciones Asíncronas").

Proporciona una calificación del 0 al 5. Sé alentador pero riguroso. 
Si el código está vacío o es irrelevante para el reto, califica con 0 o 1. 
Considera que una nota de 3 o más significa que ha aprobado.`,
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
