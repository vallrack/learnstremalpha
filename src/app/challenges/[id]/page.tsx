
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Code2, 
  ChevronLeft, 
  Play, 
  Loader2, 
  Trophy, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Terminal,
  Layout,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { evaluateChallenge, type EvaluateChallengeOutput } from '@/ai/flows/evaluate-challenge';
import Link from 'next/link';

export default function ChallengeExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const challengeRef = useMemoFirebase(() => {
    if (!db || !challengeId) return null;
    return doc(db, 'coding_challenges', challengeId);
  }, [db, challengeId]);

  const { data: challenge, isLoading } = useDoc(challengeRef);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  const [code, setCode] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluateChallengeOutput | null>(null);

  useEffect(() => {
    if (challenge) {
      setCode(challenge.initialCode || '');
    }
  }, [challenge]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const spaces = '  ';
      const newCode = code.substring(0, start) + spaces + code.substring(end);
      
      setCode(newCode);

      setTimeout(() => {
        if (target) {
          target.selectionStart = target.selectionEnd = start + spaces.length;
        }
      }, 0);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast({
      variant: "destructive",
      title: "Acción no permitida",
      description: "Por integridad del aprendizaje, debes escribir el código manualmente. ¡Tú puedes!",
    });
  };

  const handleSubmit = async () => {
    if (!challenge || !user || !db) return;
    
    // Check access
    const hasAccess = challenge.isFree || profile?.isPremiumSubscriber;
    if (!hasAccess) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "Este es un reto premium. Suscríbete para acceder.",
      });
      return;
    }

    setIsEvaluating(true);
    setResult(null);
    try {
      const evaluation = await evaluateChallenge({
        challengeTitle: challenge.title,
        challengeDescription: challenge.description,
        technology: challenge.technology,
        studentCode: code,
        solutionReference: challenge.solution,
      });
      setResult(evaluation);

      // Persist result
      addDocumentNonBlocking(collection(db, 'users', user.uid, 'challenge_submissions'), {
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        score: evaluation.score,
        feedback: evaluation.feedback,
        passed: evaluation.passed,
        submittedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Evaluation failed', error);
      toast({
        variant: "destructive",
        title: "Error de IA",
        description: "No pudimos evaluar tu código en este momento. Inténtalo de nuevo.",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[#F8FAFC]">
        <h1 className="text-2xl font-headline font-bold">Desafío no encontrado</h1>
        <Link href="/challenges">
          <Button variant="outline">Volver al catálogo</Button>
        </Link>
      </div>
    );
  }

  const isUIChallenge = challenge.technology.includes('HTML') || challenge.technology.includes('CSS') || challenge.technology.includes('Figma');
  const hasAccess = challenge.isFree || profile?.isPremiumSubscriber;

  if (!hasAccess && !isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mb-6">
          <Lock className="h-10 w-10 text-amber-600" />
        </div>
        <h1 className="text-3xl font-headline font-bold mb-2">Contenido Premium</h1>
        <p className="text-muted-foreground max-w-md mb-8">Este desafío requiere una suscripción activa para ser realizado. ¡Desbloquea todos los retos y potencia tu carrera!</p>
        <div className="flex gap-4">
          <Button onClick={() => router.back()} variant="outline" className="rounded-xl h-12 px-8">Volver</Button>
          <Button className="rounded-xl h-12 px-8 bg-amber-500 hover:bg-amber-600">Ver Planes Premium</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden">
      <Navbar />
      
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <aside className="w-full lg:w-[400px] border-r bg-white flex flex-col overflow-hidden shrink-0">
          <div className="p-6 border-b flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="font-headline font-bold text-lg truncate">{challenge.title}</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Badge variant="secondary" className="rounded-lg">{challenge.technology}</Badge>
                  {challenge.isFree ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200"><Unlock className="h-3 w-3 mr-1" /> Gratis</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-200"><Lock className="h-3 w-3 mr-1" /> Premium</Badge>
                  )}
                </div>
                <Badge className={
                  challenge.difficulty === 'Principiante' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' :
                  challenge.difficulty === 'Intermedio' ? 'bg-amber-500/10 text-amber-600 border-amber-200' :
                  'bg-rose-500/10 text-rose-600 border-rose-200'
                }>
                  {challenge.difficulty}
                </Badge>
              </div>
              <div className="prose prose-slate max-w-none">
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                  {challenge.description}
                </p>
              </div>
            </section>

            {result && (
              <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className={`rounded-2xl border-2 ${result.passed ? 'border-emerald-500/20 bg-emerald-50/50' : 'border-amber-500/20 bg-amber-50/50'}`}>
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-sm font-headline font-bold flex items-center justify-between">
                      Resultado de la Evaluación
                      <span className={`text-xl font-bold ${result.passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {result.score}/5
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="flex items-start gap-3">
                      {result.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-1" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-1" />
                      )}
                      <div className="space-y-2">
                        <p className="text-xs font-bold uppercase tracking-wider opacity-60">Feedback de la IA:</p>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {result.feedback}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>
        </aside>

        <section className="flex-1 flex flex-col bg-slate-950 relative min-w-0">
          <div className="h-12 bg-slate-900 border-b border-white/5 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-2 text-white/50 text-xs font-mono">
              {isUIChallenge ? <Layout className="h-3 w-3" /> : <Terminal className="h-3 w-3" />}
              index.{challenge.technology.toLowerCase().includes('python') ? 'py' : challenge.technology.toLowerCase().includes('javascript') ? 'js' : 'code'}
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleSubmit} 
                disabled={isEvaluating || !code.trim()}
                className="h-8 rounded-lg bg-primary hover:bg-primary/90 text-xs font-bold gap-2 px-4"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Evaluando...
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 fill-current" />
                    Enviar Solución
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex-1 relative overflow-hidden flex flex-col">
            <Textarea 
              ref={textareaRef}
              value={code} 
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className="flex-1 bg-slate-950 text-emerald-400 font-mono text-sm p-8 focus-visible:ring-0 border-none resize-none leading-relaxed selection:bg-primary/30"
              placeholder="// Escribe tu código aquí..."
              spellCheck={false}
              autoComplete="off"
            />
            
            {isEvaluating && (
              <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-4 text-center p-8 bg-slate-900 rounded-3xl border border-white/10 shadow-2xl">
                  <div className="relative">
                    <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                    <Loader2 className="absolute -top-1 -right-1 h-14 w-14 animate-spin text-primary opacity-20" />
                  </div>
                  <div>
                    <h3 className="text-white font-headline font-bold text-lg mb-1">Analizando tu código</h3>
                    <p className="text-white/50 text-xs max-w-[200px]">Nuestra IA está revisando la lógica y buenas prácticas de tu solución...</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-8 bg-primary/10 border-t border-primary/20 flex items-center justify-between px-6 shrink-0">
             <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
               <Trophy className="h-3 w-3" />
               Calificación máxima: 5.0
             </div>
             <div className="text-[10px] text-primary/60 font-medium">
               Usa la tecla Tab para indentar. El copiado de código está deshabilitado.
             </div>
          </div>
        </section>
      </main>
    </div>
  );
}
