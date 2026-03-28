'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  CheckCircle2, 
  Search, 
  Rocket, 
  BookOpen, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export function WaitingHall() {
  const router = useRouter();

  const steps = [
    { 
      icon: CheckCircle2, 
      title: "Pago Recibido", 
      desc: "Tu licencia de creador ha sido procesada exitosamente.",
      done: true 
    },
    { 
      icon: Search, 
      title: "Revisión de Perfil", 
      desc: "Nuestro equipo académico está validando tu especialidad y bio.",
      current: true 
    },
    { 
      icon: Rocket, 
      title: "Activación de Panel", 
      desc: "Una vez aprobado, podrás crear tu primer curso y desafíos IA.",
      locked: true 
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="text-center mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-bold animate-bounce">
          <Clock className="h-4 w-4" />
          Solicitud en Proceso
        </div>
        <h1 className="text-4xl md:text-5xl font-headline font-bold text-slate-900">
          Tu camino como <span className="text-primary">Instructor</span> está iniciando
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Estamos revisando tu postulación. Mientras tanto, puedes seguir disfrutando de la plataforma como estudiante.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 relative">
        {/* Progress Line */}
        <div className="hidden md:block absolute top-[44px] left-[15%] right-[15%] h-0.5 bg-slate-100 z-0" />
        
        {steps.map((step, i) => (
          <div key={i} className="relative z-10 flex flex-col items-center text-center space-y-4 group">
            <div className={`h-20 w-20 rounded-[1.5rem] flex items-center justify-center transition-all shadow-lg ${
              step.done ? 'bg-emerald-500 text-white shadow-emerald-200' : 
              step.current ? 'bg-primary text-white shadow-primary/20 ring-8 ring-primary/5' : 
              'bg-white text-slate-300 border border-slate-100'
            }`}>
              <step.icon className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h4 className={`font-bold ${step.locked ? 'text-slate-400' : 'text-slate-900'}`}>{step.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed px-4">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="rounded-[2.5rem] border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
          <CardContent className="p-10 space-y-6">
            <div className="bg-white/10 p-3 rounded-2xl w-fit">
              <Zap className="h-6 w-6 text-amber-400" />
            </div>
            <h3 className="text-2xl font-bold font-headline">¿Qué puedes hacer ahora?</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              No detengas tu aprendizaje. Explora nuevos cursos, compite en el ranking o resuelve desafíos diarios para subir de nivel.
            </p>
            <Button 
              onClick={() => router.push('/dashboard')}
              className="w-full h-12 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold gap-2"
            >
              <BookOpen className="h-4 w-4" /> Mis Cursos Estudiante
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-dashed border-2 bg-transparent overflow-hidden">
          <CardContent className="p-10 space-y-6 flex flex-col justify-center h-full">
            <div className="bg-primary/10 p-3 rounded-2xl w-fit">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-2xl font-bold font-headline text-slate-900">Seguridad Garantizada</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Si por alguna razón tu solicitud es rechazada, el valor de la licencia será reembolsado íntegramente a tu medio de pago.
            </p>
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <CheckCircle2 className="h-4 w-4" /> Soporte prioritario activo
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-16 text-center">
        <p className="text-xs text-muted-foreground font-medium flex items-center justify-center gap-2">
          Tiempo estimado de respuesta: <span className="text-slate-900 font-bold">24h - 48h hábiles</span>
        </p>
      </div>
    </div>
  );
}
