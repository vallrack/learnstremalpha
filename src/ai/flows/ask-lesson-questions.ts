'use server';
/**
 * @fileOverview An AI lesson assistant that answers questions based on provided lesson content using RAG.
 */

import { ai } from '@/ai/genkit';
import { z, Document } from 'genkit';

// 1. Simulación del Motor de Búsqueda Vectorial (RAG Retriever)
// Cuando estés listo para Firestore Vector Search, solo reemplazas este bloque con firestoreRetriever
export const lessonRetriever = ai.defineRetriever(
  {
    name: 'lessonRetriever',
    configSchema: z.object({
      k: z.number().optional()
    }).optional()
  },
  async (query, options) => {
    console.log("Ejecutando Retriever RAG para query:", query.text);
    
    // Aquí iría tu lógica de Firestore Vector Search o Pinecone
    // Retornamos un mock si el RAG es interactuado
    return {
      documents: [
        Document.fromText("Contenido recuperado desde la base de datos vectorial mediante RAG.")
      ]
    };
  }
);


const AskLessonQuestionsInputSchema = z.object({
  question: z.string().describe('The question asked by the student.'),
  lessonContent: z.string().optional().describe('The textual content of the current lesson (Optional if using RAG).'),
  instructorName: z.string().optional().describe('The name of the instructor of the current course.'),
  instructorBio: z.string().optional().describe('A brief biography or background of the instructor.'),
});
export type AskLessonQuestionsInput = z.infer<typeof AskLessonQuestionsInputSchema>;

const AskLessonQuestionsOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the student\'s question, based on the context.'),
});
export type AskLessonQuestionsOutput = z.infer<typeof AskLessonQuestionsOutputSchema>;

export type SafeAskLessonQuestionsOutput = 
  | { success: true; data: AskLessonQuestionsOutput }
  | { success: false; error: string };

export async function askLessonQuestions(input: AskLessonQuestionsInput): Promise<SafeAskLessonQuestionsOutput> {
  try {
    const data = await askLessonQuestionsFlow(input);
    return { success: true, data };
  } catch (error: any) {
    console.error("AI Q&A Error:", error);
    return { success: false, error: error.message || 'Error al procesar tu pregunta.' };
  }
}


const prompt = ai.definePrompt({
  name: 'askLessonQuestionsPrompt',
  input: {schema: z.object({ 
    question: z.string(), 
    context: z.string(),
    instructorName: z.string().optional(),
    instructorBio: z.string().optional()
  })},
  output: {schema: AskLessonQuestionsOutputSchema},
  prompt: `You are an AI lesson assistant. 
{{#if instructorName}}
You are the official assistant of the instructor **{{instructorName}}**.
{{#if instructorBio}}
Their background and expertise: "{{instructorBio}}"
{{/if}}
Please stay aligned with their expertise and persona while answering.
{{/if}}

Your task is to answer a student's question based *only* on the provided context retrieved from the database or lesson.
Do not use any outside knowledge.
If the answer is not present in the context, state that you cannot find the answer in the provided material.

Retrieved Context:
---
{{{context}}}
---

Student's Question: "{{{question}}}"

Provide a concise and accurate answer in Spanish.`, 
});


const askLessonQuestionsFlow = ai.defineFlow(
  {
    name: 'askLessonQuestionsFlow',
    inputSchema: AskLessonQuestionsInputSchema,
    outputSchema: AskLessonQuestionsOutputSchema,
  },
  async (input) => {
    let contextStr = input.lessonContent || '';

    // Si el estudiante pregunta algo y no tenemos la lección explícita, usamos el Motor RAG
    if (!contextStr || contextStr.length < 10) {
      try {
        const docs = await ai.retrieve({
          retriever: lessonRetriever,
          query: input.question,
          options: { k: 3 }
        });
        contextStr = docs.map(d => d.text).join('\n\n');
      } catch (error) {
        console.warn("Fallo en la recuperación RAG", error);
      }
    }

    const {output} = await prompt({ 
      question: input.question, 
      context: contextStr,
      instructorName: input.instructorName,
      instructorBio: input.instructorBio
    });
    return output!;
  }
);
