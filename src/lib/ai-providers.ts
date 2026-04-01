/**
 * AI Providers with Extreme Resilience Fallback
 * This module manages multiple AI providers (Gemini, Claude, OpenAI, DeepSeek, Qwen)
 * and automatically tries the next one if the current one fails.
 */

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'deepseek' | 'qwen' | 'auto';

interface ProviderConfig {
  name: AIProvider;
  call: (prompt: string) => Promise<string>;
}

// --- Individual Provider Implementation ---

/**
 * Enhanced Gemini call with internal model fallback (Downgrade 2.0 -> 1.5)
 */
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Key de Gemini no configurada");

  // Lista de modelos a intentar en orden de preferencia/cuota
  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];
  let lastError = "";

  for (const model of models) {
    try {
      console.log(`[Gemini] Probando modelo: ${model}...`);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[Gemini] ${model} falló: ${res.status}`);
        // Si es error de cuota (429), intentamos con el siguiente modelo más ligero
        if (res.status === 429 || res.status === 404 || res.status === 400) {
          lastError = `Gemini ${model} error: ${res.status} ${errorText}`;
          continue; 
        }
        throw new Error(`Gemini ${model} error: ${res.status} ${errorText}`);
      }

      const data = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error("Respuesta vacía de Gemini");
      
      console.log(`[Gemini] ✅ Éxito con ${model}`);
      return content;
    } catch (err: any) {
      lastError = err.message;
      if (model === models[models.length - 1]) throw new Error(lastError);
    }
  }
  throw new Error(lastError || "No se pudo conectar con Gemini");
}

async function callOpenAICompatible(
  prompt: string,
  provider: 'deepseek' | 'qwen'
): Promise<string> {
  const configs = {
    deepseek: {
      url: 'https://api.deepseek.com/v1/chat/completions',
      models: ['deepseek-chat'],
      key: process.env.DEEPSEEK_API_KEY,
    },
    qwen: {
      url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      models: ['qwen-plus', 'qwen-max', 'qwen-turbo'], // qwen-plus suele ser el más estable para cuentas nuevas
      key: process.env.QWEN_API_KEY,
    },
  };

  const config = configs[provider];
  if (!config.key) throw new Error(`API Key de ${provider} no configurada`);

  let lastError = "";
  for (const model of config.models) {
    try {
      console.log(`[${provider}] Probando modelo: ${model}...`);
      const res = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.key.trim()}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (res.status === 401) throw new Error(`API Key de ${provider} inválida`);
      if (res.status === 402) throw new Error(`Saldo insuficiente en ${provider}`);
      
      if (!res.ok) {
        const errTxt = await res.text();
        lastError = `${provider} ${model} error: ${res.status} ${errTxt}`;
        continue;
      }

      const data = await res.json();
      console.log(`[${provider}] ✅ Éxito con ${model}`);
      return data.choices[0].message.content;
    } catch (err: any) {
      lastError = err.message;
      // Si el error es 401 o 402 (auth/billing), no tiene sentido reintentar con otro modelo
      if (err.message.includes('inválida') || err.message.includes('Saldo')) throw err;
      if (model === config.models[config.models.length - 1]) throw err;
    }
  }
  throw new Error(lastError);
}

// Fallbacks para Claude y OpenAI (Standard)
async function callStandard(prompt: string, provider: 'claude' | 'openai'): Promise<string> {
  const config = provider === 'claude' 
    ? { url: 'https://api.anthropic.com/v1/messages', key: process.env.ANTHROPIC_API_KEY, model: 'claude-3-5-sonnet-20240620' }
    : { url: 'https://api.openai.com/v1/chat/completions', key: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' };

  if (!config.key) throw new Error(`Key de ${provider} no configurada`);

  const headers: any = { 'Content-Type': 'application/json' };
  let body: any = { model: config.model, messages: [{ role: 'user', content: prompt }] };

  if (provider === 'claude') {
    headers['x-api-key'] = config.key;
    headers['anthropic-version'] = '2023-06-01';
    body.max_tokens = 2048;
  } else {
    headers['Authorization'] = `Bearer ${config.key}`;
  }

  const res = await fetch(config.url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${provider} error: ${res.status}`);
  
  const data = await res.json();
  return provider === 'claude' ? data.content[0].text : data.choices[0].message.content;
}

// --- Provider Chain ---

const PROVIDER_CHAIN: ProviderConfig[] = [
  { name: 'gemini',   call: (p) => callGemini(p) },
  { name: 'qwen',     call: (p) => callOpenAICompatible(p, 'qwen') },
  { name: 'deepseek', call: (p) => callOpenAICompatible(p, 'deepseek') },
  { name: 'claude',   call: (p) => callStandard(p, 'claude') },
  { name: 'openai',   call: (p) => callStandard(p, 'openai') },
];

/**
 * Main AI Generation logic with fallback.
 */
export async function generateWithAI(
  prompt: string,
  preferredProvider?: AIProvider
): Promise<{ result: string; usedProvider: AIProvider }> {
  const chain = (preferredProvider && preferredProvider !== 'auto')
    ? [
        ...PROVIDER_CHAIN.filter((p) => p.name === preferredProvider),
        ...PROVIDER_CHAIN.filter((p) => p.name !== preferredProvider),
      ]
    : PROVIDER_CHAIN;

  const errors: string[] = [];

  for (const provider of chain) {
    try {
      console.log(`[AI Chain] Intentando con ${provider.name}...`);
      const result = await provider.call(prompt);
      return { result, usedProvider: provider.name };
    } catch (err: any) {
      console.warn(`[AI Chain] ❌ ${provider.name} falló: ${err.message}`);
      errors.push(`${provider.name}: ${err.message}`);
    }
  }

  throw new Error(`Todos los proveedores fallaron. Errores:\n${errors.join('\n')}`);
}

/**
 * Utility to parse JSON
 */
export function parseAIJson(content: string) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Failed to parse AI JSON:", content);
    throw new Error("La respuesta de la IA no tiene un formato JSON válido.");
  }
}
