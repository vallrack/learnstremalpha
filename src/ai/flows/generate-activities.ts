'use server';
/**
 * @fileOverview AI flow to auto-generate H5P-style activity content from lesson text.
 * 
 * Given a lesson's content, title, and technology, the AI generates ready-to-use
 * JSON configs for activities like flashcards, swipe cards, quizzes, and sortable code blocks.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateActivitiesInputSchema = z.object({
  lessonTitle: z.string().describe('Título de la lección.'),
  lessonContent: z.string().describe('El texto completo de la lección de la cual se generarán actividades.'),
  technology: z.string().describe('Tecnología principal de la lección, ej: JavaScript, Python, React.'),
  activityType: z.enum(['flashcard', 'swipe', 'sortable', 'quiz', 'dragdrop', 'interactive-video']).describe('El tipo de actividad H5P a generar.'),
});
export type GenerateActivitiesInput = z.infer<typeof GenerateActivitiesInputSchema>;

const FlashcardSchema = z.object({
  cards: z.array(z.object({
    front: z.string().describe('Término, concepto o pregunta corta.'),
    back: z.string().describe('Definición, explicación o respuesta.'),
  })).min(4).max(10).describe('Array de tarjetas educativas.'),
});

const SwipeSchema = z.object({
  deck: z.array(z.object({
    statement: z.string().describe('Una afirmación técnica que puede ser verdadera o falsa.'),
    isTrue: z.boolean().describe('Si la afirmación es verdadera o falsa.'),
  })).min(6).max(12).describe('Mazo de declaraciones verdadero/falso.'),
});

const SortableSchema = z.object({
  lines: z.array(z.object({
    id: z.string().describe('Un ID único corto para la línea, ej: L1, L2.'),
    text: z.string().describe('El contenido de la línea de código.'),
  })).min(4).max(8).describe('Líneas de código para ordenar.'),
  correctOrder: z.array(z.string()).describe('Array de IDs en el orden correcto.'),
});

const QuizSchema = z.object({
  questions: z.array(z.object({
    question: z.string().describe('La pregunta del quiz.'),
    options: z.array(z.string()).length(4).describe('Exactamente 4 opciones de respuesta.'),
    correctIndex: z.number().min(0).max(3).describe('Índice (0-3) de la opción correcta.'),
  })).min(5).max(10).describe('Array de preguntas de opción múltiple.'),
});

const DragDropSchema = z.object({
  template: z.string().describe('Código con huecos marcados como {{{s1}}}, {{{s2}}}, etc.'),
  snippets: z.array(z.object({
    id: z.string().describe('ID del snippet, ej: s1, s2.'),
    text: z.string().describe('El texto del fragmento de código.'),
  })).describe('Los fragmentos que se arrastran.'),
  correctMapping: z.record(z.string()).describe('Mapa de hueco a snippet: { "s1": "s1" }.'),
});

const InteractiveVideoSchema = z.object({
  videoUrl: z.string().describe('URL de YouTube sugerida o placeholder.'),
  checkpoints: z.array(z.object({
    seconds: z.number().describe('Segundo exacto de la pausa.'),
    question: z.string().describe('Pregunta que aparece.'),
    options: z.array(z.string()).length(4).describe('4 opciones.'),
    correctIndex: z.number().describe('Índice correcto.'),
  })).describe('Momentos de pausa en el video.'),
});

const GenerateActivitiesOutputSchema = z.object({
  activityConfig: z.string().describe('JSON stringificado con la configuración de la actividad generada, listo para usar en el builder.'),
  activityTitle: z.string().describe('Un título sugerido para la actividad, creativo y relativo al tema.'),
  activityDescription: z.string().describe('Una descripción breve de lo que evalúa la actividad.'),
});
export type GenerateActivitiesOutput = z.infer<typeof GenerateActivitiesOutputSchema>;

export async function generateActivities(input: GenerateActivitiesInput): Promise<GenerateActivitiesOutput> {
  return generateActivitiesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateActivitiesPrompt',
  input: { schema: GenerateActivitiesInputSchema },
  output: { schema: GenerateActivitiesOutputSchema },
  prompt: `Eres un diseñador instruccional experto. Tu tarea es generar contenido para una actividad interactiva educativa a partir del texto de una lección.

LECCIÓN:
---
Título: {{{lessonTitle}}}
Tecnología: {{{technology}}}
Contenido:
{{{lessonContent}}}
---

TIPO DE ACTIVIDAD A GENERAR: {{{activityType}}}

REGLAS POR TIPO:

1. SI activityType = "flashcard":
   - Genera entre 4-10 tarjetas con término frontal y definición trasera.
   - Los términos deben ser conceptos clave de la lección.
   - Las definiciones deben ser claras y concisas.
   - El JSON debe tener la forma: { "cards": [{ "front": "...", "back": "..." }] }

2. SI activityType = "swipe":
   - Genera entre 6-12 afirmaciones verdaderas o falsas sobre la lección.
   - Mezcla verdaderas y falsas en proporción equilibrada (~50/50).
   - Las afirmaciones deben requerir comprensión, no solo memorización.
   - El JSON debe tener la forma: { "deck": [{ "statement": "...", "isTrue": true/false }] }

3. SI activityType = "sortable":
   - Genera un bloque de código de 4-8 líneas (de la tecnología indicada) que el estudiante deba ordenar.
   - Usa IDs como L1, L2, L3...
   - El JSON debe tener la forma: { "lines": [{ "id": "L1", "text": "..." }], "correctOrder": ["L1", "L2", ...] }

4. SI activityType = "quiz":
   - Genera 5-10 preguntas de opción múltiple con exactamente 4 opciones cada una.
   - Las preguntas deben evaluar comprensión profunda de la lección.
   - El JSON debe tener la forma: { "questions": [{ "question": "...", "options": ["A","B","C","D"], "correctIndex": 0 }] }

5. SI activityType = "dragdrop":
   - Genera una plantilla de código con 2-4 "huecos" usando la sintaxis {{{s1}}}, {{{s2}}}, etc.
   - Crea un banco de "snippets" que encajen en esos huecos.
   - Proporciona el mapping correcto.
   - Ejemplo: "const [state, setState] = {{{s1}}}({{{s2}}});" con snippets id:s1 text:useState y id:s2 text:initialValue.

6. SI activityType = "interactive-video":
   - Analiza la lección y propón 3-5 puntos de pausa lógicos (en segundos progresivos, ej: 10, 45, 120).
   - Genera una pregunta desafiante para cada punto.
   - Usa un videoUrl de YouTube genérico de la tecnología si no se provee uno (ej: de un canal oficial).

IMPORTANTE:
- El campo "activityConfig" DEBE ser un STRING de JSON válido (usa JSON.stringify mentally).  
- Todo el contenido debe estar en ESPAÑOL.
- Genera un título creativo y una descripción que motive al estudiante.
- El contenido debe ser educativamente valioso y basado SOLO en la lección proporcionada.`,
});

const generateActivitiesFlow = ai.defineFlow(
  {
    name: 'generateActivitiesFlow',
    inputSchema: GenerateActivitiesInputSchema,
    outputSchema: GenerateActivitiesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    if (!output) throw new Error('La generación de actividades falló.');
    
    // Validate the activityConfig is valid JSON
    try {
      JSON.parse(output.activityConfig);
    } catch {
      // If the AI returned an object instead of a string, stringify it
      if (typeof output.activityConfig === 'object') {
        output.activityConfig = JSON.stringify(output.activityConfig, null, 2);
      }
    }
    
    return output;
  }
);
