'use server';
/**
 * @fileOverview Flujo para indexar lecciones nuevas en la Base de Datos Vectorial (RAG).
 */

import { ai } from '@/ai/genkit';
import { z, Document } from 'genkit';

export const indexLessonsFlow = ai.defineFlow(
  {
    name: 'indexLessonsFlow',
    inputSchema: z.object({
      lessonId: z.string(),
      title: z.string(),
      content: z.string(),
    }),
    outputSchema: z.string(),
  },
  async (input) => {
    console.log(`Simulando la indexación RAG de la lección: ${input.title}`);
    
    // Cuando Cloud Vector Search esté activo, se calcularán embeddings aquí:
    // const doc = Document.fromText(input.content, { id: input.lessonId, title: input.title });
    // await ai.index({ indexer: firestoreIndexer, documents: [doc] });

    return `Lección ${input.lessonId} preparada para el índice Vectorial.`;
  }
);
