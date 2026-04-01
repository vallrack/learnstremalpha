/**
 * AI Providers with Extreme Resilience Fallback
 * This module manages multiple AI providers (Groq, Gemini, OpenAI, DeepSeek, Qwen, Cohere)
 * and automatically tries the next one if the current one fails.
 */

export type AIProvider = 'groq' | 'gemini' | 'openai' | 'claude' | 'deepseek' | 'qwen' | 'cohere' | 'auto';

interface ProviderConfig {
  name: AIProvider;
  call: (prompt: string) => Promise<string>;
}

// --- Individual Provider Implementation ---

/**
 * Groq: Ultra-low latency Llama models
 */
async function callGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Key de Groq no configurada");

  const models = ['llama-3.3-70b-versatile', 'llama3-8b-8192'];
  let lastError = "";

  for (const model of models) {
    try {
      console.log(`[Groq] Intentando modelo: ${model}...`);
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        const errTxt = await res.text();
        console.warn(`[Groq] ${model} falló: ${res.status}`);
        lastError = `Groq ${model} error: ${res.status}`;
        continue;
      }

      const data = await res.json();
      console.log(`[Groq] ✅ Éxito con ${model}`);
      return data.choices[0].message.content;
    } catch (err: any) {
      lastError = err.message;
      if (model === models[models.length - 1]) throw err;
    }
  }
  throw new Error(lastError);
}

/**
 * Enhanced Gemini call with internal model fallback
 */
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Key de Gemini no configurada");

  const modelConfigs = [
    { id: 'gemini-2.0-flash', version: 'v1beta' },
    { id: 'gemini-1.5-flash', version: 'v1' },
    { id: 'gemini-1.5-flash-8b', version: 'v1' }
  ];
  
  let lastError = "";
  for (const config of modelConfigs) {
    try {
      console.log(`[Gemini] Intentando modelo: ${config.id} (${config.version})...`);
      const res = await fetch(
        `https://generativelanguage.googleapis.com/${config.version}/models/${config.id}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );

      if (!res.ok) {
        lastError = `Gemini ${config.id} error: ${res.status}`;
        continue; 
      }

      const data = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error("Respuesta vacía de Gemini");
      
      console.log(`[Gemini] ✅ Éxito con ${config.id}`);
      return content;
    } catch (err: any) {
      lastError = err.message;
      if (config.id === modelConfigs[modelConfigs.length - 1].id) throw new Error(lastError);
    }
  }
  throw new Error(lastError);
}

/**
 * OpenAI with GPT-5.4 Fallback and Parameters
 */
async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Key de OpenAI no configurada");

  const models = ['gpt-5.4', 'gpt-5.4-mini', 'gpt-4o', 'gpt-4o-mini'];
  let lastError = "";

  for (const model of models) {
    try {
      console.log(`[OpenAI] Intentando modelo: ${model}...`);
      const body: any = { model, messages: [{ role: 'user', content: prompt }] };

      if (model.startsWith('gpt-5')) {
        body.text = { verbosity: "low" };
        body.reasoning = { effort: "none" };
      } else {
        body.temperature = 0.7;
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        lastError = `OpenAI ${model} error: ${res.status}`;
        continue;
      }
      
      const data = await res.json();
      console.log(`[OpenAI] ✅ Éxito con ${model}`);
      return data.choices?.[0]?.message?.content || data.output_text || "";
    } catch (err: any) {
      lastError = err.message;
      if (model === models[models.length - 1]) throw new Error(lastError);
    }
  }
  throw new Error(lastError);
}

/**
 * Cohere: Command-R family
 */
async function callCohere(prompt: string): Promise<string> {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) throw new Error("Key de Cohere no configurada");

  const models = ['command-r-plus', 'command-r', 'command-light'];
  let lastError = "";

  for (const model of models) {
    try {
      console.log(`[Cohere] Intentando modelo: ${model}...`);
      const res = await fetch('https://api.cohere.ai/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          message: prompt,
        }),
      });

      if (!res.ok) {
        lastError = `Cohere ${model} error: ${res.status}`;
        continue;
      }

      const data = await res.json();
      console.log(`[Cohere] ✅ Éxito con ${model}`);
      return data.text;
    } catch (err: any) {
      lastError = err.message;
      if (model === models[models.length - 1]) throw err;
    }
  }
  throw new Error(lastError);
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
      models: ['qwen-plus', 'qwen-max', 'qwen-turbo'],
      key: process.env.QWEN_API_KEY,
    },
  };

  const config = configs[provider];
  if (!config.key) throw new Error(`API Key de ${provider} no configurada`);

  let lastError = "";
  for (const model of config.models) {
    try {
      console.log(`[${provider}] Intentando modelo: ${model}...`);
      const res = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.key.trim()}`,
        },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
      });

      if (res.status === 401 || res.status === 402) throw new Error(`${provider} auth/billing error`);
      
      if (!res.ok) {
        lastError = `${provider} ${model} error: ${res.status}`;
        continue;
      }

      const data = await res.json();
      console.log(`[${provider}] ✅ Éxito con ${model}`);
      return data.choices[0].message.content;
    } catch (err: any) {
      lastError = err.message;
      if (model === config.models[config.models.length - 1]) throw err;
    }
  }
  throw new Error(lastError);
}

// --- Provider Chain ---
const PROVIDER_CHAIN: ProviderConfig[] = [
  { name: 'groq',     call: (p) => callGroq(p) },
  { name: 'gemini',   call: (p) => callGemini(p) },
  { name: 'openai',   call: (p) => callOpenAI(p) },
  { name: 'cohere',   call: (p) => callCohere(p) },
  { name: 'qwen',     call: (p) => callOpenAICompatible(p, 'qwen') },
  { name: 'deepseek', call: (p) => callOpenAICompatible(p, 'deepseek') },
];

/**
 * Main AI Generation logic with fallback.
 */
export async function generateWithAI(
  prompt: string,
  preferredProvider?: AIProvider
): Promise<{ result: string; usedProvider: AIProvider }> {
  const chain = (preferredProvider && preferredProvider !== 'auto' && preferredProvider !== 'claude')
    ? [
        ...PROVIDER_CHAIN.filter((p) => p.name === preferredProvider),
        ...PROVIDER_CHAIN.filter((p) => p.name !== preferredProvider),
      ]
    : PROVIDER_CHAIN;

  const errors: string[] = [];

  for (const provider of chain) {
    try {
      console.log(`[AI Chain] Servidor intentando con ${provider.name}...`);
      const result = await provider.call(prompt);
      return { result, usedProvider: provider.name };
    } catch (err: any) {
      console.warn(`[AI Chain] ❌ ${provider.name} falló: ${err.message}`);
      errors.push(`${provider.name}: ${err.message}`);
    }
  }

  throw new Error(`Todos los proveedores del SERVIDOR fallaron:\n${errors.join('\n')}`);
}

export function parseAIJson(content: string) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    return null;
  }
}
