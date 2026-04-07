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
  challengeId: z.string(),
  studentCode: z.string(),
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

import { adminDb as db } from '@/lib/firebase-admin';

// Helper to unwrap Firestore REST API fields
function unwrap(fields: any) {
  const result: any = {};
  for (const key in fields) {
    const val = fields[key];
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.integerValue !== undefined) result[key] = parseInt(val.integerValue);
    else if (val.doubleValue !== undefined) result[key] = parseFloat(val.doubleValue);
    else if (val.arrayValue !== undefined) result[key] = (val.arrayValue.values || []).map((v: any) => unwrap({item: v}).item);
    else if (val.mapValue !== undefined) result[key] = unwrap(val.mapValue.fields);
    else if (val.timestampValue !== undefined) result[key] = val.timestampValue;
  }
  return result;
}

async function fetchFirestoreDocument(path: string) {
  const projectID = 'devforge-academy';
  const url = `https://firestore.googleapis.com/v1/projects/${projectID}/databases/(default)/documents/${path}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return unwrap(data.fields);
}

export async function evaluateChallenge(input: EvaluateChallengeInput): Promise<SafeEvaluateChallengeOutput> {
  try {
    // 1. Fetch challenge and premium data securely
    let challengeData: any = null;
    let premiumData: any = {};

    try {
      const challengeSnap = await db.collection('coding_challenges').doc(input.challengeId).get();
      if (challengeSnap.exists) challengeData = challengeSnap.data();
      
      const premiumSnap = await db.collection('coding_challenges').doc(input.challengeId).collection('premium').doc('data').get();
      if (premiumSnap.exists) premiumData = premiumSnap.data();
    } catch (e) {
      console.warn("Firebase Admin fallback to REST API for public data due to:", (e as any).message);
    }

    // REST Fallback for public challenges if Admin SDK failed or data is missing
    if (!challengeData) {
      challengeData = await fetchFirestoreDocument(`coding_challenges/${input.challengeId}`);
    }

    if (!challengeData) throw new Error("Reto no encontrado o no accesible.");
    
    // 2. Prepare full input for AI
    const fullInput = {
      challengeId: input.challengeId,
      challengeTitle: challengeData.title || "Reto",
      challengeDescription: challengeData.description || "",
      technology: challengeData.technology || "General",
      studentCode: input.studentCode,
      solutionReference: premiumData?.solution || challengeData.solution || "", 
      ...premiumData 
    };

    const data = await evaluateChallengeFlow(fullInput);
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

const EvaluateChallengeInternalSchema = z.object({
  challengeTitle: z.string(),
  challengeDescription: z.string(),
  technology: z.string(),
  studentCode: z.string(),
  solutionReference: z.string().optional(),
});

const prompt = ai.definePrompt({
  name: 'evaluateChallengePrompt',
  input: {schema: EvaluateChallengeInternalSchema},
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

1. SI ES UNA ACTIVIDAD DE CÓDIGO O PSEUDOCÓDIGO (React, Node, Python, PSeInt, SQL, etc.):
   - Analiza no solo si funciona, sino la ELEGANCIA, el performance y la arquitectura.
   - Detecta posibles bugs latentes, problemas de legibilidad o falta de escalabilidad.
   - Sugiere patrones de diseño que podrían aplicarse.

2. SI ES TEORÍA, ENSAYO, DISEÑO, INGLÉS O CUALQUIER OTRA MATERIA NO RELACIONADA CON CÓDIGO:
   - Evalúa profundamente el conocimiento demostrado sobre la materia expuesta.
   - Analiza la precisión de la respuesta, la claridad, asertividad o vocabulario profesional empleado de acuerdo con los estándares de la industria.
   - ¡NO rechaces evaluar la entrega si no contiene código! Es tu labor evaluar el texto.

3. SI EL ESTUDIANTE ENTREGA UN "REPORTE DE DESEMPEÑO INTERACTIVO":
   - No pidas código. El estudiante ya demostró su conocimiento a través de una actividad lúdica (Swipe, Drag&Drop, Video).
   - Usa el puntaje proporcionado en el reporte para validar su éxito.
   - Genera un feedback basado en la materia/tecnología del reto, felicitando por los aciertos y reforzando la importancia de los conceptos evaluados.

OBLIGATORIO:
- Calificación: 0.0 a 5.0. (Menos de 3.0 es reprobado).
- IMPORTANTE: La calificación NUNCA debe superar los 5.0 puntos. Si tu razonamiento interno es sobre 10, divídelo por 2 antes de asignar el valor 'score'.
- Sé específico: No digas "Buen trabajo", di "Excelente uso de async/await y manejo de errores...".
- Si la calidad es superior (4.5+), otorga una insignia de maestría técnica que sea muy motivadora.
- REPORTE INTERACTIVO: Si es un reporte de desempeño interactivo, asigna el puntaje indicado en el reporte (ej: si dice 5.0/5.0, pon score: 5.0).`,
});

const evaluateChallengeFlow = ai.defineFlow(
  {
    name: 'evaluateChallengeFlow',
    inputSchema: EvaluateChallengeInternalSchema,
    outputSchema: EvaluateChallengeOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) throw new Error('La evaluación falló.');
    
    // Clamp the score to [0, 5] just in case the AI deviates
    return {
      ...output,
      score: Math.min(Math.max(output.score, 0), 5)
    };
  }
);
