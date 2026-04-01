'use server';

import { callExternalAI, parseAIJson } from '@/lib/ai-providers';

export async function generateWithExternalAI(prompt: string, provider: 'deepseek' | 'qwen') {
  try {
    const messages = [
      { role: 'system', content: 'Eres un diseñador instruccional experto y arquitecto de software.' },
      { role: 'user', content: prompt },
    ];
    
    const response = await callExternalAI(provider, messages as any, { temperature: 0.3 });
    return { success: true, data: parseAIJson(response) };
  } catch (error: any) {
    console.error(`Error generating with ${provider}:`, error);
    return { success: false, error: error.message || 'Error desconocido en la generación externa.' };
  }
}

export async function evaluateWithExternalAI(prompt: string, provider: 'deepseek' | 'qwen') {
  try {
    const messages = [
      { role: 'system', content: 'Eres un reclutador técnico senior y evaluador de código experto.' },
      { role: 'user', content: prompt },
    ];
    
    const response = await callExternalAI(provider, messages as any, { temperature: 0.1 });
    return { success: true, data: parseAIJson(response) };
  } catch (error: any) {
    console.error(`Error evaluating with ${provider}:`, error);
    return { success: false, error: error.message || 'Error desconocido en la evaluación externa.' };
  }
}
