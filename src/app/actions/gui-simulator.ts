 'use server';
 
 import { generateWithAI, parseAIJson } from '@/lib/ai-providers';
 
 /**
  * Función para simular visualmente una interfaz gráfica en Python (Tkinter, Pygame, etc.)
  * utilizando IA para interpretar el código y devolver una estructura JSON de componentes.
  */
 export async function simulatePythonGUI(code: string, technology: string = 'Python') {
   try {
     const prompt = `
  Eres un experto en desarrollo de GUIs en Python (especialmente Tkinter, CustomTkinter y Pygame).
  
  Tu tarea es leer el siguiente código y extraer una lista de componentes de la interfaz de usuario que se crearía.
  
  CÓDIGO DEL ESTUDIANTE:
  \`\`\`${technology.toLowerCase()}
  ${code}
  \`\`\`
  
  REGLAS:
  1. Traduce la interfaz a una lista plana de componentes JSON.
  2. Soporta: 'button', 'label', 'input', 'checkbox', 'window', 'radio'.
  3. Incluye: 'text', 'id', 'x', 'y' (aproximados en % del 0 al 100), 'color', 'background' (si se especifica).
  4. Si el código no tiene GUI definida, devuelve una lista vacía.
  5. El JSON debe ser: { "components": [...], "windowTitle": "Título de la Ventana", "width": 400, "height": 300 }
  
  RETORNA UN OBJETO JSON VÁLIDO SIN TEXTO ADICIONAL.
     `;
 
     const { result } = await generateWithAI(prompt, 'gemini'); // Utilizamos Gemini para rapidez y precisión
     const data = parseAIJson(result);
     
     return { success: true, data };
   } catch (error: any) {
     console.error("Error simulating GUI:", error);
     return { success: false, error: error.message || 'Error en la simulación visual.' };
   }
 }
