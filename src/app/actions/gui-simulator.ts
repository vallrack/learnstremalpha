'use server';

import { generateWithAI, parseAIJson } from '@/lib/ai-providers';

/**
 * FunciÃ³n para simular visualmente una interfaz grÃ¡fica en Python (Tkinter, Pygame, etc.)
 * utilizando IA para interpretar el cÃ³digo y devolver una estructura JSON de componentes.
 */
export async function simulatePythonGUI(code: string, technology: string = 'Python') {
  try {
    const prompt = `
 Eres un experto en desarrollo de GUIs en Python (especialmente Tkinter, CustomTkinter y Pygame).
 
 Tu tarea es leer el siguiente cÃ³digo y extraer una lista de componentes de la interfaz de usuario que se crearÃ­a.
 
 CÃ“DIGO DEL ESTUDIANTE:
 \`\`\`${technology.toLowerCase()}
 ${code}
 \`\`\`
 
 REGLAS:
 1. Traduce la interfaz a una lista plana de componentes JSON.
 2. Soporta: 'button', 'label', 'input', 'checkbox', 'window', 'radio'.
 3. Incluye: 'text', 'id', 'x', 'y' (aproximados en % del 0 al 100), 'color', 'background' (si se especifica).
 4. Si el cÃ³digo no tiene GUI definida, devuelve una lista vacÃ­a.
 5. El JSON debe ser: { "components": [...], "windowTitle": "TÃ­tulo de la Ventana", "width": 400, "height": 300 }
 
 RETORNA UN OBJETO JSON VÃLIDO SIN TEXTO ADICIONAL.
    `;

    const { result } = await generateWithAI(prompt, 'gemini'); // Utilizamos Gemini para rapidez y precisiÃ³n
    const data = parseAIJson(result);
    
    return { success: true, data };
  } catch (error: any) {
    console.error("Error simulating GUI:", error);
    return { success: false, error: error.message || 'Error en la simulaciÃ³n visual.' };
  }
}
