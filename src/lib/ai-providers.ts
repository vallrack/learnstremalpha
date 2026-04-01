/**
 * @fileOverview External AI providers (DeepSeek & Qwen) compatible with OpenAI API.
 * Used as high-reliability fallbacks when Gemini/Claude are unavailable.
 */

export type AIProvider = 'deepseek' | 'qwen' | 'gemini' | 'claude';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export async function callExternalAI(
  provider: 'deepseek' | 'qwen',
  messages: ChatMessage[],
  options: ChatOptions = {}
) {
  const apiKey = provider === 'deepseek' 
    ? process.env.DEEPSEEK_API_KEY 
    : process.env.QWEN_API_KEY;

  const baseUrl = provider === 'deepseek'
    ? 'https://api.deepseek.com/chat/completions'
    : 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';

  const model = options.model || (provider === 'deepseek' ? 'deepseek-chat' : 'qwen-plus');

  if (!apiKey) {
    throw new Error(`API Key para ${provider} no configurada en el servidor.`);
  }

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 2000,
        response_format: provider === 'deepseek' ? { type: 'json_object' } : undefined
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const statusCode = response.status;
      
      if (statusCode === 402) {
        throw new Error(`Saldo insuficiente en tu cuenta de ${provider}.`);
      }
      if (statusCode === 401) {
        throw new Error(`La API Key de ${provider} es inválida o ha expirado. (ID: ${apiKey.slice(0, 5)}...${apiKey.slice(-4)})`);
      }
      
      throw new Error(`${provider} API Error: ${statusCode} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error: any) {
    console.error(`Fetch error for ${provider}:`, error);
    throw error;
  }
}

/**
 * Utility to parse JSON from AI response safely, handling markdown blocks if present.
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
