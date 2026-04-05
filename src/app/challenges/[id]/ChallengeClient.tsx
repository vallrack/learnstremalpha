
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Code2, 
  ChevronLeft, 
  Loader2, 
  Trophy, 
  Sparkles, 
  Terminal, 
  Lock, 
  Award, 
  Medal, 
  ShieldAlert, 
  BookOpen, 
  Gamepad2, 
  BrainCircuit,
  ArrowRight,
  MessageSquare,
  HelpCircle,
  Stars
} from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, serverTimestamp, increment } from 'firebase/firestore';
import { evaluateChallenge, type EvaluateChallengeOutput } from '@/ai/flows/evaluate-challenge';
import { evaluateWithExternalAI } from '@/app/actions/ai-generation';
import { WordSearchGame } from '@/components/challenges/WordSearchGame';
import { QuizPlayer } from '@/components/challenges/QuizPlayer';
import { InteractiveVideo } from '@/components/challenges/InteractiveVideo';
import { DragDropSnippets } from '@/components/challenges/DragDropSnippets';
import { SortableCodeBlocks } from '@/components/challenges/SortableCodeBlocks';
import { FlipFlashcards } from '@/components/challenges/FlipFlashcards';
import { SwipeCards } from '@/components/challenges/SwipeCards';
import { VoiceInterview } from '@/components/ai/VoiceInterview';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { XPRewardAnimation } from '@/components/gamification/XPRewardAnimation';
import { formatPrice } from '@/lib/currency';
import { robustJSONParse } from '@/lib/robust-parse';
import { simulatePythonGUI } from '@/app/actions/gui-simulator';
import { GUIMimicWindow } from '@/components/challenges/GUIMimicWindow';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';

export default function ChallengeClient() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <ChallengeContent />
    </Suspense>
  );
}

function ChallengeContent() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;
  const db = useFirestore();
  const { user, profile, isUserLoading } = useUser();
  const { toast } = useToast();

  const challengeRef = useMemoFirebase(() => {
    if (!db || !challengeId) return null;
    return doc(db, 'coding_challenges', challengeId);
  }, [db, challengeId]);
  const { data: challenge, isLoading: isChallengeLoading } = useDoc(challengeRef);

  const [code, setCode] = useState('');
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluateChallengeOutput | null>(null);
  const [showXPReward, setShowXPReward] = useState<{ xpGained: number; newTotalXP: number; badge?: { title: string; description: string } | null } | null>(null);
  const [premiumData, setPremiumData] = useState<any>(null);
  const [isLoadingPremium, setIsLoadingPremium] = useState(false);
  
  // GUI Simulation State
  const [isGUIPortalOpen, setIsGUIPortalOpen] = useState(false);
  const [isSimulatingGUI, setIsSimulatingGUI] = useState(false);
  const [guiData, setGUIData] = useState<{ components: any[], windowTitle: string } | null>(null);
  const [guiTheme, setGUITheme] = useState<'retro' | 'modern'>('modern');

  useEffect(() => {
    if (challenge) setCode(challenge.initialCode || '');
  }, [challenge]);

  const isPremiumLocked = useMemo(() => {
    // Si los datos base están cargando, no bloqueamos aún para evitar parpadeos
    if (!challenge || isUserLoading) return false;
    
    // Bypass total para administradores
    if (profile?.role === 'admin') return false;
    
    // Si NO es gratis y NO tienes suscripción ni compra individual, bloqueado.
    const isActuallyFree = challenge.isFree === true;
    const isSubscriber = !!profile?.isPremiumSubscriber;
    const hasPurchased = profile?.purchasedChallenges?.includes(challengeId);

    return !isActuallyFree && !isSubscriber && !hasPurchased;
  }, [challenge, profile, challengeId, isUserLoading]);

  useEffect(() => {
    async function fetchPremiumData() {
      // Solo intentamos descargar datos premium si el usuario tiene los permisos rígidamente (Admin, Suscriptor o Compra)
      // Esto evita errores de "Permission Denied" en la consola para usuarios gratuitos o invitados.
      const isAuthorized = profile?.role === 'admin' || profile?.isPremiumSubscriber || profile?.purchasedChallenges?.includes(challengeId);
      
      if (!db || !isAuthorized || !challengeId || isUserLoading || isChallengeLoading || !user) return;
      
      setIsLoadingPremium(true);
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const premiumRef = doc(db, 'coding_challenges', challengeId, 'premium', 'data');
        const snap = await getDoc(premiumRef);
        if (snap.exists()) {
          setPremiumData(snap.data());
        }
      } catch (err) {
        console.error("Error fetching premium challenge data:", err);
      } finally {
        setIsLoadingPremium(false);
      }
    }

    fetchPremiumData();
  }, [db, isPremiumLocked, challengeId, isUserLoading, isChallengeLoading]);

  const effectiveSolution = premiumData?.solution || challenge?.solution;
  const effectiveQuestions = premiumData?.questions || challenge?.questions;
  const effectiveJsonConfig = premiumData || challenge; // For types that use spreading

  const handleClaudeFallback = async (submissionCode: string) => {
    const puter = (window as any).puter;
    if (!puter) throw new Error("Motor de respaldo (Puter) no disponible.");

    const prompt = `Eres un evaluador técnico senior. Evalúa críticamente esta entrega de estudiante.
    RETO: ${challenge?.title}
    DESCRIPCIÓN: ${challenge?.description}
    TECNOLOGÍA: ${challenge?.technology}
    SOLUCIÓN REFERENCIA: ${effectiveSolution || ""}
    
    ENTREGA DEL ESTUDIANTE O REPORTE DE DESEMPEÑO:
    ${submissionCode}
    
    REGLA DE ORO:
    - Responde UNICAMENTE con un objeto JSON válido.
    - Si recibes un [REPORTE DE DESEMPEÑO INTERACTIVO], usa el puntaje indicado en él (score).
    - No pidas código si el reporte indica que fue un desafío interactivo.
    - El feedback DEBE SER EN ESPAÑOL y motivador.
    
    ESTRUCTURA JSON:
    {
      "score": 0.0 a 5.0,
      "passed": true/false,
      "feedback": "español",
      "awardedBadge": { "title": "...", "description": "...", "iconType": "logic/style/data/architecture/speed/communication" } 
    }
    
    IMPORTANTE: La calificación NUNCA debe superar los 5.0 puntos. Si crees que merece un 8.5/10, pon 4.25.`;

    // Asegurarse que Puter esté inicializado
    if (puter.init) await puter.init();

    const response = await puter.ai.chat(prompt, { model: 'claude-sonnet-4-6' });
    const content = response?.message?.content?.[0]?.text || response?.message?.content || "";
    
    const cleanedContent = content.match(/\{[\s\S]*\}/)?.[0] || content;
    const result = robustJSONParse(cleanedContent) as EvaluateChallengeOutput;
    
    // Clamp result
    if (result && typeof result.score === 'number') {
      result.score = Math.min(Math.max(result.score, 0), 5);
    }
    return result;
  };

  const handleSubmit = async (quizScore?: number) => {
    if (!challenge || !db || isPremiumLocked) return;
    
    if (challenge.type === 'quiz' && quizScore !== undefined) {
      processResult({
        score: quizScore,
        passed: quizScore >= 3,
        feedback: quizScore >= 4 ? "Excelente dominio teórico de los conceptos." : "Buen intento, revisa los temas en los que fallaste.",
        awardedBadge: quizScore >= 4.5 ? { title: "Teórico Maestro", description: "Dominio perfecto de la trivia técnica.", iconType: "logic" } : undefined
      });
      return;
    }

    setIsEvaluating(true);
    setResult(null);
    try {
      // Para retos interactivos que no usan el editor de código, enviamos el reporte de puntos a la IA
      const submissionCode = quizScore !== undefined && !code.trim()
        ? `[REPORTE DE DESEMPEÑO INTERACTIVO]
           Reto: ${challenge.title}
           Materia: ${challenge.technology}
           Puntaje Alcanzado: ${quizScore.toFixed(1)}/5.0. 
           El estudiante ha demostrado su conocimiento validando correctamente las sentencias en la interfaz interactiva.`
        : code;

      const res = await evaluateChallenge({
        challengeId: challenge.id,
        studentCode: submissionCode,
      });

      if (res.success) {
        processResult(res.data);
      } else {
        // DETECTANDO ERROR DE INFRAESTRUCTURA PARA FALLBACK
        if (res.error.includes("AI_SYSTEM_ERROR") || res.error.includes("403") || res.error.includes("404")) {
          toast({ 
            title: "Recuperación de IA", 
            description: "Gemini se encuentra saturado. Activando motor de respaldo (Claude)...",
          });
          
          const fallbackResult = await handleClaudeFallback(submissionCode);
          processResult(fallbackResult);
        } else {
          toast({ 
            variant: "destructive", 
            title: "Error de Evaluación", 
            description: res.error
          });
        }
      }
    } catch (error: any) {
      console.error("Evaluation Error catching:", error);
      // Intento de rescate si el servidor de plano falló
      try {
        const submissionCode = quizScore !== undefined && !code.trim()
          ? `[REPORTE DE DESEMPEÑO INTERACTIVO]
             Reto: ${challenge.title}
             Materia: ${challenge.technology}
             Puntaje Alcanzado: ${quizScore.toFixed(1)}/5.0. 
             El estudiante ha demostrado su conocimiento validando correctamente las sentencias en la interfaz interactiva.`
          : code;

      const fallbackResult = await handleClaudeFallback(submissionCode);
      processResult(fallbackResult);
    } catch (fallbackError) {
      console.warn("Claude fallback failed, trying DeepSeek...");
      try {
        const submissionCode = quizScore !== undefined && !code.trim()
          ? `[REPORTE DE DESEMPEÑO INTERACTIVO]
             Reto: ${challenge.title}
             Materia: ${challenge.technology}
             Puntaje Alcanzado: ${quizScore.toFixed(1)}/5.0. 
             El estudiante ha demostrado su conocimiento validando correctamente las sentencias en la interfaz interactiva.`
          : code;
        
        const prompt = `Evalúa esta entrega técnica:
        RETO: ${challenge.title}
        TECNOLOGÍA: ${challenge.technology}
        DESCRIPCIÓN: ${challenge.description}
        ENTREGA: ${submissionCode}
        
        Responde estrictamente en JSON: { "score": 0-5, "passed": bool, "feedback": "español", "awardedBadge": { "title": "...", "description": "...", "iconType": "logic/style/data/architecture/speed/communication" } }
        REGLA: El score es de 0.0 a 5.0 máximo.`;

        const dsResult = await evaluateWithExternalAI(prompt, 'deepseek');
        if (dsResult.success) {
          if (typeof dsResult.data.score === 'number') {
            dsResult.data.score = Math.min(Math.max(dsResult.data.score, 0), 5);
          }
          processResult(dsResult.data);
          return;
        }
        
        const qwenResult = await evaluateWithExternalAI(prompt, 'qwen');
        if (qwenResult.success) {
          processResult(qwenResult.data);
          return;
        }

        toast({ 
          variant: "destructive", 
          title: "Error Crítico", 
          description: "Ningún motor de IA (Gemini, Claude, DeepSeek, Qwen) respondió correctamente." 
        });
      } catch (lastError) {
        toast({ 
          variant: "destructive", 
          title: "Fallo General de IA", 
          description: "Todos los motores de evaluación están fuera de línea." 
        });
      }
    }
    } finally {
      setIsEvaluating(false);
    }
  };

  const processResult = (evaluation: EvaluateChallengeOutput) => {
    setResult(evaluation);

    // Trigger XP reward animation
    const xpGained = evaluation.passed ? 200 : 100;
    const currentXP = (profile as any)?.xp || 0;
    setShowXPReward({
      xpGained,
      newTotalXP: currentXP + xpGained,
      badge: evaluation.awardedBadge ? { title: evaluation.awardedBadge.title, description: evaluation.awardedBadge.description } : null,
    });

    if (user && !user.isAnonymous) {
      addDocumentNonBlocking(collection(db, 'users', user.uid, 'challenge_submissions'), {
        challengeId: challenge!.id,
        challengeTitle: challenge!.title,
        score: evaluation.score,
        feedback: evaluation.feedback,
        passed: evaluation.passed,
        submittedAt: serverTimestamp()
      });

      // Actualizar XP (100 por completar, 200 si pasa)
      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        xp: increment(evaluation.passed ? 200 : 100)
      });

      if (evaluation.awardedBadge) {
        addDocumentNonBlocking(collection(db, 'users', user.uid, 'achievements'), {
          ...evaluation.awardedBadge,
          challengeId: challenge!.id,
          unlockedAt: serverTimestamp(),
        });
        toast({ title: "¡Insignia Desbloqueada!", description: evaluation.awardedBadge.title });
      }
    }
  };

  if (isUserLoading || isChallengeLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (isPremiumLocked) {
    return (
      <div className="h-screen flex flex-col bg-[#F8FAFC]">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-amber-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl">
            <Lock className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-4xl font-headline font-bold mb-4 text-slate-900">Actividad Premium</h1>
          <p className="text-muted-foreground max-w-md mb-10 text-lg">
            {challenge?.price && challenge.price > 0 
              ? `Esta actividad tiene un costo de ${formatPrice(challenge.price, challenge.currency || 'COP')} para acceso permanente, o puedes obtenerla con una suscripción.`
              : "Este reto requiere una suscripción activa para ser evaluado por IA y obtener XP en tu portfolio."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {challenge?.price && challenge.price > 0 && (
              <Link href={`/checkout?challengeId=${challengeId}`}>
                <Button className="rounded-2xl h-14 px-10 font-bold bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">
                  Comprar ahora por {formatPrice(challenge.price, challenge.currency || 'COP')}
                </Button>
              </Link>
            )}
            <Link href="/checkout">
              <Button variant="outline" className="rounded-2xl h-14 px-10 font-bold border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">
                Mejorar a Premium (Todo incluido)
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!challenge) return <div className="h-screen flex items-center justify-center">Reto no encontrado</div>;

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden">
      <Navbar />
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <aside className="w-full lg:w-[400px] border-r bg-white flex flex-col overflow-hidden shrink-0">
          <div className="p-6 border-b flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8"><ChevronLeft className="h-5 w-5" /></Button>
            <h2 className="font-headline font-bold text-lg truncate">{challenge.title}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <Badge variant="outline" className="rounded-xl border-primary/20 bg-primary/5 text-primary font-bold">{challenge.technology}</Badge>
                <Badge className={challenge.difficulty === 'Principiante' ? 'bg-emerald-500/10 text-emerald-600 border-none' : 'bg-rose-500/10 text-rose-600 border-none'}>
                  {challenge.difficulty}
                </Badge>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4" />
                  Instrucciones del Reto
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{challenge.description}</p>
              </div>
            </section>

            {result && (
              <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                {result.awardedBadge && (
                  <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                    <Stars className="absolute top-0 right-0 h-20 w-20 opacity-20 -mr-4 -mt-4" />
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md shadow-inner"><Medal className="h-10 w-10" /></div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">NUEVO LOGRO IA</p>
                        <h3 className="text-xl font-headline font-bold leading-tight">{result.awardedBadge.title}</h3>
                      </div>
                    </div>
                  </div>
                )}
                <Card className={`rounded-3xl border-2 ${result.passed ? 'border-emerald-500/20 bg-emerald-50/50' : 'border-rose-500/20 bg-rose-50/50'}`}>
                  <CardHeader className="p-4 pb-0">
                    <CardTitle className="text-sm font-bold flex justify-between items-center">
                      Feedback del Reclutador IA 
                      <span className="bg-white px-2 py-1 rounded-lg border text-xs">{result.score.toFixed(1)}/5.0</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <p className="text-xs text-slate-700 leading-relaxed italic">"{result.feedback}"</p>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>
        </aside>

        <section className="flex-1 flex flex-col bg-slate-100 relative min-w-0">
          <div className="h-12 bg-white border-b flex items-center justify-between px-6 shrink-0">
            {challenge.type !== 'interview' && (
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                {challenge.type === 'quiz' ? <HelpCircle className="h-3 w-3" /> : challenge.type === 'interview' ? <MessageSquare className="h-3 w-3" /> : challenge.type === 'wordsearch' ? <Gamepad2 className="h-3 w-3" /> : <Terminal className="h-3 w-3" />}
                {challenge.type === 'quiz' ? 'Prueba de Conocimientos' : challenge.type === 'interview' ? 'Simulador de Entrevista' : challenge.type === 'wordsearch' ? 'Juego de Vocabulario' : 'Entorno de Programación'}
              </div>
            )}
            {challenge.type !== 'quiz' && (challenge.type !== 'wordsearch' || isGameComplete) && (
              <Button onClick={() => handleSubmit()} disabled={isEvaluating || !code.trim()} className="h-8 rounded-lg bg-primary hover:bg-primary/90 text-xs font-bold gap-2 px-4">
                {isEvaluating ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Sparkles className="h-3 w-3" /> Enviar para Evaluación</>}
              </Button>
            )}
          </div>
          
          <div className={`flex-1 relative overflow-y-auto ${challenge.type === 'interview' ? 'p-4 lg:p-12' : 'p-8'}`}>
            {challenge.type === 'wordsearch' ? (
              <div className="space-y-12">
                <WordSearchGame words={challenge.words || []} onComplete={() => setIsGameComplete(true)} />
                {isGameComplete && (
                  <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-10 duration-700">
                    <div className="text-center space-y-2">
                       <h3 className="text-2xl font-headline font-bold text-slate-900">¡Fase de Juego Completada!</h3>
                       <p className="text-muted-foreground text-sm font-medium">Ahora demuestra tu conocimiento explicando cómo aplicar estos términos:</p>
                    </div>
                    <Textarea 
                      value={code} 
                      onChange={(e) => setCode(e.target.value)} 
                      className="min-h-[200px] rounded-[2.5rem] border-none shadow-2xl bg-white p-10 text-xl font-medium focus-visible:ring-primary leading-relaxed" 
                      placeholder="Escribe tu reflexión técnica aquí..." 
                    />
                  </div>
                )}
              </div>
            ) : challenge.type === 'quiz' ? (
              <div className="max-w-3xl mx-auto py-12">
                <QuizPlayer questions={effectiveQuestions || []} onComplete={(s) => handleSubmit(s)} />
              </div>
            ) : challenge.type === 'interview' ? (
              <div className="flex flex-col gap-6 animate-in fade-in duration-700">
                <VoiceInterview 
                  role={challenge.targetRole || challenge.title} 
                  initialLanguage={challenge.targetLanguage || 'es'} 
                  instructions={effectiveSolution}
                  isPremiumChallenge={!challenge.isFree}
                  isAdmin={profile?.role === 'admin'}
                  onComplete={(transcript) => {
                    setCode(transcript);
                  }} 
                />
              </div>
            ) : challenge.type === 'interactive-video' ? (
              <div className="max-w-4xl mx-auto py-12 px-6 w-full animate-in fade-in zoom-in duration-500">
                 <InteractiveVideo url={effectiveJsonConfig.videoUrl as string} checkpoints={effectiveJsonConfig.checkpoints || []} onComplete={(score) => handleSubmit(score)} />
              </div>
            ) : challenge.type === 'dragdrop' ? (
              <div className="max-w-5xl mx-auto py-12 px-6 w-full animate-in slide-in-from-bottom-8 duration-500">
                 <DragDropSnippets template={effectiveJsonConfig.template as string} snippets={effectiveJsonConfig.snippets || []} correctMapping={effectiveJsonConfig.correctMapping || {}} onComplete={(score) => handleSubmit(score)} />
              </div>
            ) : challenge.type === 'sortable' ? (
              <div className="max-w-4xl mx-auto py-12 px-6 w-full animate-in slide-in-from-right-8 duration-500">
                 <SortableCodeBlocks lines={effectiveJsonConfig.lines || []} correctOrder={effectiveJsonConfig.correctOrder || []} onComplete={(score) => handleSubmit(score)} />
              </div>
            ) : challenge.type === 'flashcard' ? (
              <div className="max-w-2xl mx-auto py-6 px-4 w-full h-[700px] flex items-center justify-center animate-in zoom-in-90 duration-500">
                 <FlipFlashcards cards={effectiveJsonConfig.cards || []} onComplete={(score) => handleSubmit(score)} />
              </div>
            ) : challenge.type === 'swipe' ? (
              <div className="max-w-xl mx-auto py-6 px-4 w-full h-[700px] flex items-center justify-center animate-in slide-in-from-bottom-20 duration-500">
                 <SwipeCards deck={effectiveJsonConfig.deck || []} onComplete={(score) => handleSubmit(score)} />
              </div>
            ) : (
              <div className="h-full bg-[#1e1e1e] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border-4 border-[#1e1e1e]">
                 <div className="bg-[#1e1e1e] px-6 py-4 flex items-center justify-between border-b border-white/5 shrink-0">
                   <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-rose-500" />
                     <div className="w-3 h-3 rounded-full bg-amber-500" />
                     <div className="w-3 h-3 rounded-full bg-emerald-500" />
                     <span className="ml-4 text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest">learnstream_ide_v3.0</span>
                   </div>
                   
                   {/* GUI Preview Button for Python */}
                   {challenge.technology?.toLowerCase() === 'python' && (
                     <Button 
                       onClick={async () => {
                         setIsSimulatingGUI(true);
                         setIsGUIPortalOpen(true);
                         const res = await simulatePythonGUI(code);
                         if (res.success) setGUIData(res.data);
                         else toast({ title: 'Simulación Fallida', description: res.error, variant: 'destructive' });
                         setIsSimulatingGUI(false);
                       }}
                       disabled={isSimulatingGUI}
                       variant="ghost" 
                       size="sm" 
                       className="h-8 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border border-orange-500/20 gap-2 px-3 transition-all"
                     >
                        {isSimulatingGUI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        <span className="text-[10px] font-bold uppercase tracking-tighter">Preview GUI IA</span>
                     </Button>
                   )}
                 </div>
                <div className="flex-1 min-h-[400px] relative">
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={challenge.technology?.toLowerCase() === 'python' ? 'python' : challenge.technology?.toLowerCase() === 'html' ? 'html' : 'javascript'}
                    value={code}
                    onChange={(val) => setCode(val || '')}
                    onMount={(editor, monaco) => {
                      // Bloqueo de atajos Ctrl+V o Cmd+V
                      editor.onKeyDown((e: any) => {
                        if ((e.ctrlKey || e.metaKey) && e.keyCode === monaco.KeyCode.KeyV) {
                           e.preventDefault();
                           e.stopPropagation();
                           toast({ title: 'Modo Estricto', description: 'Copiar y pegar código está deshabilitado para garantizar tu aprendizaje.', variant: 'destructive' });
                        }
                      });
                      
                      // Bloqueo duro a nivel DOM para menu click derecho -> Pegar
                      const domNode = editor.getDomNode();
                      if (domNode) {
                         domNode.addEventListener('paste', (e) => {
                             e.preventDefault();
                             e.stopPropagation();
                             toast({ title: 'Modo Estricto', description: 'Copiar y pegar código está deshabilitado para garantizar tu aprendizaje.', variant: 'destructive' });
                         }, true);
                      }
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 16,
                      padding: { top: 24, bottom: 24 },
                      scrollBeyondLastLine: false,
                      roundedSelection: false,
                      fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                      wordWrap: 'on'
                    }}
                    className="absolute inset-0"
                  />
                </div>
              </div>
            )}

            {isEvaluating && (
              <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-xl flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-6 p-16 bg-white rounded-[4rem] border shadow-2xl animate-in zoom-in duration-300">
                  <div className="relative">
                    <Sparkles className="h-20 w-20 text-primary animate-pulse" />
                    <Stars className="absolute -top-2 -right-2 h-8 w-8 text-amber-400 animate-bounce" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-3xl font-headline font-bold text-slate-900">IA Procesando Respuesta...</h3>
                    <p className="text-muted-foreground font-medium">Analizando vocabulario, lógica y fluidez profesional.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      {/* XP Reward Animation */}
      {showXPReward && (
        <XPRewardAnimation
          xpGained={showXPReward.xpGained}
          newTotalXP={showXPReward.newTotalXP}
          badge={showXPReward.badge}
          onDismiss={() => setShowXPReward(null)}
        />
      )}
       
       {/* GUI Simulation Portal */}
       <Dialog open={isGUIPortalOpen} onOpenChange={setIsGUIPortalOpen}>
         <DialogContent className="max-w-4xl bg-slate-900/40 backdrop-blur-3xl border-white/10 p-0 overflow-hidden rounded-[3rem] shadow-2xl">
            <div className="p-8 space-y-6">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-headline font-bold text-white flex items-center gap-3">
                      <Sparkles className="h-6 w-6 text-orange-400" />
                      Simulador Visual de Python
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Interpretación por IA de tu código gráfico.</p>
                  </div>
                  
                  {/* Theme Switcher Toggle */}
                  <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-white/5">
                     <button 
                        onClick={() => setGUITheme('retro')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${guiTheme === 'retro' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                     >
                        📜 RETO 95
                     </button>
                     <button 
                        onClick={() => setGUITheme('modern')}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${guiTheme === 'modern' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                     >
                        ✨ MODERN LS
                     </button>
                  </div>
               </div>
               
               <div className="min-h-[450px] flex items-center justify-center bg-black/20 rounded-[2rem] border border-white/5 p-4 md:p-8">
                  {isSimulatingGUI ? (
                    <div className="flex flex-col items-center gap-4 animate-pulse">
                       <Loader2 className="h-12 w-12 text-orange-500 animate-spin" />
                       <span className="text-orange-200 font-bold text-xs uppercase tracking-widest">El Genio está interpretando...</span>
                    </div>
                  ) : guiData ? (
                    <div className="w-full animate-in zoom-in-95 duration-500">
                       <GUIMimicWindow 
                          components={guiData.components} 
                          title={guiData.windowTitle} 
                          theme={guiTheme} 
                          onClose={() => setIsGUIPortalOpen(false)}
                       />
                       <p className="mt-8 text-center text-slate-500 text-[10px] font-medium uppercase tracking-[0.2em]">
                          Nota: Esta es una representación visual basada en IA. No ejecuta la lógica real de los clics.
                       </p>
                    </div>
                  ) : (
                    <div className="text-center space-y-4 opacity-50">
                       <ShieldAlert className="h-16 w-16 text-slate-400 mx-auto" />
                       <p className="text-slate-400 text-sm max-w-sm">No pudimos detectar elementos gráficos en tu código. Asegúrate de usar Tkinter o librerías similares.</p>
                    </div>
                  )}
               </div>
            </div>
         </DialogContent>
       </Dialog>
    </div>
  );
}
