/**
 * AI Providers with Automatic Fallback Chain
 * This module manages multiple AI providers (Gemini, Claude, OpenAI, DeepSeek, Qwen)
 * and automatically tries the next one if the current one fails.
 */

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'deepseek' | 'qwen' | 'auto';

interface ProviderConfig {
  name: AIProvider;
  call: (prompt: string) => Promise<string>;
}

// --- Individual Provider Implementation ---

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Key de Gemini no configurada");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini error: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Key de OpenAI no configurada");

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Key de Anthropic no configurada");

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

async function callOpenAICompatible(
  prompt: string,
  provider: 'deepseek' | 'qwen'
): Promise<string> {
  const configs = {
    deepseek: {
      url: 'https://api.deepseek.com/v1/chat/completions',
      model: 'deepseek-chat',
      key: process.env.DEEPSEEK_API_KEY,
    },
    qwen: {
      url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      model: 'qwen-max',
      key: process.env.QWEN_API_KEY,
    },
  };

  const { url, model, key } = configs[provider];
  if (!key) throw new Error(`API Key de ${provider} no configurada`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key.trim()}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (res.status === 401) throw new Error(`API Key de ${provider} inválida`);
  if (res.status === 402) throw new Error(`Saldo insuficiente en ${provider}`);
  if (!res.ok) throw new Error(`${provider} error: ${res.status}`);

  const data = await res.json();
  return data.choices[0].message.content;
}

// --- Provider Chain ---

const PROVIDER_CHAIN: ProviderConfig[] = [
  { name: 'gemini',   call: (p) => callGemini(p) },
  { name: 'deepseek', call: (p) => callOpenAICompatible(p, 'deepseek') },
  { name: 'qwen',     call: (p) => callOpenAICompatible(p, 'qwen') },
  { name: 'claude',   call: (p) => callClaude(p) },
  { name: 'openai',   call: (p) => callOpenAI(p) },
];

/**
 * Main AI Generation logic with fallback.
 */
export async function generateWithAI(
  prompt: string,
  preferredProvider?: AIProvider
): Promise<{ result: string; usedProvider: AIProvider }> {
  // Reorder chain based on preference
  const chain = (preferredProvider && preferredProvider !== 'auto')
    ? [
        ...PROVIDER_CHAIN.filter((p) => p.name === preferredProvider),
        ...PROVIDER_CHAIN.filter((p) => p.name !== preferredProvider),
      ]
    : PROVIDER_CHAIN;

  const errors: string[] = [];

  for (const provider of chain) {
    try {
      console.log(`[AI] Intentando con ${provider.name}...`);
      const result = await provider.call(prompt);
      console.log(`[AI] ✅ Éxito con ${provider.name}`);
      return { result, usedProvider: provider.name };
    } catch (err: any) {
      console.warn(`[AI] ❌ ${provider.name} falló: ${err.message}`);
      errors.push(`${provider.name}: ${err.message}`);
    }
  }

  throw new Error(`Todos los proveedores fallaron. Errores:\n${errors.join('\n')}`);
}

/**
 * Utility to parse JSON from AI response safely.
 */
export function parseAIJson(content: string) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Failed to parse AI JSON:", content);
    throw new Error("La respuesta de la IA no tiene un formato JSON válido.");
  }
}
