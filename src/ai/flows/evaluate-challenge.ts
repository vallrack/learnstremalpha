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

export type SafeEvaluateChallengeOutput = 
  | { success: true; data: EvaluateChallengeOutput }
  | { success: false; error: string };

export async function evaluateChallenge(input: EvaluateChallengeInput): Promise<SafeEvaluateChallengeOutput> {
  try {
    const data = await evaluateChallengeFlow(input);
    return { success: true, data };
  } catch (error: any) {
    console.error("Evaluation Error:", error);
    // Si es un error de cuota, API key o modelo no encontrado, devolvemos un código para el fallback.
    const errorMessage = error.message || "";
    const isSystemError = errorMessage.includes("403") || errorMessage.includes("404") || errorMessage.includes("limit") || errorMessage.includes("not found");
    
    return { 
      success: false, 
      error: isSystemError ? `AI_SYSTEM_ERROR: ${errorMessage}` : (errorMessage || 'Error al evaluar el desafío.') 
    };
  }
}

const prompt = ai.definePrompt({
  name: 'evaluateChallengePrompt',
  input: {schema: EvaluateChallengeInputSchema},
  output: {schema: EvaluateChallengeOutputSchema},
  prompt: `Eres un arquitecto de software senior y reclutador técnico de élite.
Tu misión es realizar una evaluación CRÍTICA, TÉCNICA y ALTAMENTE CONSTRUCTIVA sobre la entrega del estudiante.

REGLA DE ORO: El feedback debe ser en ESPAÑOL, con un tono que mezcle la exigencia de un revisor de código senior con la mentoría de un guía experto.

CONTEXTO DEL RETO:
---
Título: {{{challengeTitle}}}
Tecnología/Materia: {{{technology}}}
Objetivo: {{{challengeDescription}}}
Solución Referencia: {{{solutionReference}}}
---

ENTREGA DEL ESTUDIANTE:
---
{{{studentCode}}}
---

CRITERIOS DE EVALUACIÓN SEGÚN EL CASO:

1. SI ES PRUEBA DE CÓDIGO (React, Node, Python, SQL, PSeInt, etc.):
   - Analiza no solo si funciona, sino la ELEGANCIA, el performance y la arquitectura.
   - Detecta posibles bugs latentes, problemas de legibilidad o falta de escalabilidad.
   - Sugiere patrones de diseño (Clean Code, SOLID) que podrían aplicarse.

2. SI ES INGLÉS TÉCNICO O ENTREVISTA PROFESIONAL:
   - Evalúa el uso de terminología técnica precisa (Keywords).
   - Analiza la fluidez y la coherencia de la respuesta frente a lo que buscaría una empresa tech en EE.UU.
   - Propón formas más "nativas" o profesionales de expresar conceptos técnicos complejos.

OBLIGATORIO:
- Calificación: 0.0 a 5.0. (Menos de 3.0 es reprobado).
- Sé específico: No digas "Buen trabajo", di "Excelente uso de async/await y manejo de errores...".
- Si la calidad es superior (4.5+), otorga una insignia de maestría técnica que sea muy motivadora.`,
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
