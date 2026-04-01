import { NextRequest, NextResponse } from 'next/server';
import { generateWithAI } from '@/lib/ai-providers';

export async function POST(req: NextRequest) {
  try {
    const { prompt, provider } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt requerido' }, 
        { status: 400 }
      );
    }

    // Llama a la lógica de fallback en el servidor
    const { result, usedProvider } = await generateWithAI(prompt, provider);

    return NextResponse.json({ 
      success: true, 
      result, 
      usedProvider 
    });
  } catch (error: any) {
    console.error('[API AI Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    );
  }
}
