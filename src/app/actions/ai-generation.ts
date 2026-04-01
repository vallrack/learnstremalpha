'use server';

import { generateWithAI, parseAIJson } from '@/lib/ai-providers';

export async function generateWithExternalAI(prompt: string, provider: 'deepseek' | 'qwen') {
  try {
    const { result } = await generateWithAI(prompt, provider);
    return { success: true, data: parseAIJson(result) };
  } catch (error: any) {
    console.error(`Error generating with ${provider}:`, error);
    return { success: false, error: error.message || 'Error en la generación externa.' };
  }
}

export async function evaluateWithExternalAI(prompt: string, provider: 'deepseek' | 'qwen') {
  try {
    const { result } = await generateWithAI(prompt, provider);
    return { success: true, data: parseAIJson(result) };
  } catch (error: any) {
    console.error(`Error evaluating with ${provider}:`, error);
    return { success: false, error: error.message || 'Error en la evaluación externa.' };
  }
}
