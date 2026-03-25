'use client';

import { Navbar } from '@/components/layout/Navbar';
import { VoiceInterview } from '@/components/ai/VoiceInterview';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';

export default function InterviewPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <Link href="/challenges">
              <Button variant="ghost" size="sm" className="pl-0 gap-2 text-slate-500 hover:text-slate-900 font-bold mb-2">
                <ChevronLeft className="h-4 w-4" />
                Volver a Catálogo
              </Button>
            </Link>
            <div className="flex items-center gap-3">
               <div className="bg-primary/10 p-2.5 rounded-2xl">
                 <Sparkles className="h-6 w-6 text-primary" />
               </div>
               <h1 className="text-4xl font-headline font-bold text-slate-900 tracking-tight">Entrenador de Entrevistas de IA</h1>
            </div>
            <p className="text-muted-foreground text-lg max-w-2xl font-medium">
              Practica en tiempo real con nuestra IA. Mejora tu fluidez, confianza y habilidades técnicas en segundos.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
             <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 text-xs font-bold">
                <ShieldCheck className="h-4 w-4" />
                Evaluado por Gemini
             </div>
             <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-100 text-xs font-bold">
                <Zap className="h-4 w-4" />
                +100 XP por sesión
             </div>
          </div>
        </header>

        <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
           <VoiceInterview role="Senior Frontend Engineer" initialLanguage="es" />
        </section>

        <footer className="mt-20 max-w-3xl mx-auto text-center space-y-8">
           <div className="h-px bg-slate-200 w-full" />
           <p className="text-sm text-slate-400 font-medium leading-relaxed">
             Nota: Esta herramienta utiliza el reconocimiento de voz de tu navegador. 
             Para una mejor experiencia, utiliza <b>Google Chrome</b> y asegúrate de estar en un lugar tranquilo sin ruido ambiental.
           </p>
        </footer >
      </main>
    </div>
  );
}
