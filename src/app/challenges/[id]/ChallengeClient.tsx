
'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
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
  Stars,
  Monitor
} from 'lucide-react';
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeEditor,
  SandpackPreview,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useDoc, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, serverTimestamp, increment, setDoc, arrayUnion } from 'firebase/firestore';
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

function SandpackSubmitter({ isEvaluating, onSubmit }: { isEvaluating: boolean, onSubmit: (code: string) => void }) {
  const { sandpack } = useSandpack();
  const { files } = sandpack;
  
  return (
    <Button 
      onClick={() => {
        let combined = "";
        for (const [path, fileObj] of Object.entries(files)) {
           if (path.includes('node_modules') || path.includes('package-lock.json')) continue;
           combined += `\n--- ARCHIVO: ${path} ---\n${fileObj.code}`;
        }
        onSubmit(combined);
      }} 
      disabled={isEvaluating} 
      className="h-8 rounded-lg bg-primary hover:bg-primary/90 text-xs font-bold gap-2 px-4 shadow-sm"
    >
      {isEvaluating ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Sparkles className="h-3 w-3" /> Evaluar Proyecto Automáticamente</>}
    </Button>
  );
}

const getSandpackTemplate = (tech: string): string | null => {
  const t = tech?.toLowerCase() || '';
  if (t.includes('next')) return 'nextjs';
  if (t === 'react' || t.includes('react')) return 'react-ts';
  if (t === 'angular' || t.includes('angular')) return 'angular';
  if (t === 'vue' || t.includes('vue')) return 'vue';
  if (t === 'node' || t.includes('node') || t.includes('express')) return 'node';
  if (t === 'svelte' || t.includes('svelte')) return 'svelte';
  if (t === 'solid' || t.includes('solid')) return 'solid';
  return null;
};

const getMonacoLanguage = (techString?: string, titleString?: string): string => {
  let t = (techString || '').toLowerCase().trim();
  if (!t && titleString) t = titleString.toLowerCase().trim();
  if (!t) return 'plaintext';
  
  if (t.includes('python')) return 'python';
  if (t.includes('html')) return 'html';
  if (t.includes('css')) return 'css';
  if (t.includes('javascript') || t.includes('js') || t.includes('node')) return 'javascript';
  if (t.includes('typescript') || t.includes('ts') || t.includes('react') || t.includes('angular') || t.includes('next') || t.includes('vue')) return 'typescript';
  if (t.includes('java ') || t === 'java' || t.includes('spring')) return 'java';
  if (t.includes('c++') || t.includes('cpp')) return 'cpp';
  if (t.includes('c#') || t.includes('csharp') || t.includes('.net')) return 'csharp';
  if (t === 'c') return 'c';
  if (t.includes('php') || t.includes('laravel')) return 'php';
  if (t.includes('ruby') || t.includes('rails')) return 'ruby';
  if (t === 'go' || t.includes('golang')) return 'go';
  if (t.includes('sql') || t.includes('mysql') || t.includes('postgres') || t.includes('oracle')) return 'sql';
  if (t.includes('rust')) return 'rust';
  if (t.includes('swift') || t.includes('ios')) return 'swift';
  if (t.includes('kotlin') || t.includes('android')) return 'kotlin';
  if (t.includes('dart') || t.includes('flutter')) return 'dart';
  if (t.includes('json')) return 'json';
  if (t.includes('xml')) return 'xml';
  if (t.includes('yaml') || t.includes('yml')) return 'yaml';
  if (t.includes('bash') || t.includes('shell') || t.includes('sh') || t.includes('linux')) return 'shell';
  
  return 'plaintext';
};

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
  const searchParams = useSearchParams();
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
  const [guiData, setGUIData] = useState<{ components: any[], windowTitle: string, width?: number, height?: number } | null>(null);
  const [guiTheme, setGUITheme] = useState<'retro' | 'modern'>('modern');
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);

  const h5pTypes = ['quiz', 'dragdrop', 'sortable', 'flashcard', 'swipe', 'wordsearch', 'interactive-video'];
  
  const courseId = searchParams.get('courseId');
  const lessonId = searchParams.get('lessonId');

  const courseRef = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return doc(db, 'courses', courseId);
  }, [db, courseId]);
  const { data: course } = useDoc(courseRef);

  const progressSnapRef = useMemoFirebase(() => {
    if (!db || !user?.uid || !courseId) return null;
    return doc(db, 'users', user.uid, 'courseProgress', courseId);
  }, [db, user?.uid, courseId]);
  const { data: currentProgress } = useDoc(progressSnapRef);

  const sandpackTemplate = challenge ? getSandpackTemplate(challenge.technology) : null;

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
      // Permitimos descargar datos si el usuario es Admin, Suscriptor, Comprador 
      // O si el reto es gratuito (esto permite a invitados ver el contenido técnico).
      const isActuallyFree = challenge?.isFree === true;
      const isAuthorized = isActuallyFree || profile?.role === 'admin' || profile?.isPremiumSubscriber || profile?.purchasedChallenges?.includes(challengeId);
      
      if (!db || !isAuthorized || !challengeId || isUserLoading || isChallengeLoading) return;
      
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
  }, [db, isPremiumLocked, challengeId, isUserLoading, isChallengeLoading, challenge?.isFree]);

  const effectiveSolution = premiumData?.solution || challenge?.solution;
  const effectiveQuestions = premiumData?.questions || challenge?.questions;
  const effectiveJsonConfig = premiumData || challenge; // For types that use spreading

  const handleClaudeFallback = async (submissionCode: string) => {
    const puter = (window as any).puter;
    if (!puter) throw new Error("Motor de respaldo (Puter) no disponible.");

    const prompt = `Eres un evaluador y mentor experto. Evalúa cualquier tipo de entrega (código, texto, ensayo, teórica, pseudocódigo) de acuerdo al objetivo del reto. ¡NO te niegues a evaluar argumentando que no es código funcional!
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

  const handleSubmit = async (quizScore?: number, forceCode?: string) => {
    if (!challenge || !db || isPremiumLocked) return;
    
    if (h5pTypes.includes(challenge.type) && quizScore !== undefined) {
      processResult({
        score: quizScore,
        passed: quizScore >= 3,
        feedback: quizScore === 5 
          ? "¡Excelente trabajo! Has demostrado un dominio perfecto de los conceptos evaluados en esta actividad técnica." 
          : quizScore >= 3 
            ? "Buen intento. Has superado el desafío con éxito, aunque hay pequeños detalles que podrías seguir puliendo." 
            : "No te desanimes. Sigue practicando estos conceptos; la constancia es la clave para alcanzar el nivel profesional.",
        awardedBadge: quizScore >= 4.5 ? { 
          title: challenge.type === 'quiz' ? "Teórico Maestro" : "Lógica Impecable", 
          description: "Dominio perfecto de la actividad interactiva.", 
          iconType: "logic" 
        } : undefined
      });
      return;
    }

    setIsEvaluating(true);
    setResult(null);
    try {
      const currentCode = forceCode || code;
      // Para retos interactivos que no usan el editor de código, enviamos el reporte de puntos a la IA
      let submissionCode = currentCode;
      
      if (challenge.type === 'wordsearch' && isGameComplete) {
        const foundWordsList = (premiumData?.words || challenge.words || []).join(', ');
        submissionCode = `[REPORTE DE SOPA DE LETRAS]
           Reto: ${challenge.title}
           Materia: ${challenge.technology}
           Estado: ¡Todas las palabras encontradas con éxito!
           Palabras que el estudiante debió encontrar: ${foundWordsList}
           
           REFLEXIÓN TÉCNICA DEL ESTUDIANTE:
           ${currentCode}`;
      } else if (quizScore !== undefined && !currentCode.trim()) {
        submissionCode = `[REPORTE DE DESEMPEÑO INTERACTIVO]
           Reto: ${challenge.title}
           Materia: ${challenge.technology}
           Puntaje Alcanzado: ${quizScore.toFixed(1)}/5.0. 
           El estudiante ha demostrado su conocimiento validando correctamente las sentencias en la interfaz interactiva.`;
      }

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
        const currentCode = forceCode || code;
        const submissionCode = quizScore !== undefined && !currentCode.trim()
          ? `[REPORTE DE DESEMPEÑO INTERACTIVO]
             Reto: ${challenge.title}
             Materia: ${challenge.technology}
             Puntaje Alcanzado: ${quizScore.toFixed(1)}/5.0. 
             El estudiante ha demostrado su conocimiento validando correctamente las sentencias en la interfaz interactiva.`
          : currentCode;

      const fallbackResult = await handleClaudeFallback(submissionCode);
      processResult(fallbackResult);
    } catch (fallbackError) {
      console.warn("Claude fallback failed, trying DeepSeek...");
      try {
        const currentCode = forceCode || code;
        const submissionCode = quizScore !== undefined && !currentCode.trim()
          ? `[REPORTE DE DESEMPEÑO INTERACTIVO]
             Reto: ${challenge.title}
             Materia: ${challenge.technology}
             Puntaje Alcanzado: ${quizScore.toFixed(1)}/5.0. 
             El estudiante ha demostrado su conocimiento validando correctamente las sentencias en la interfaz interactiva.`
          : currentCode;
        
        const prompt = `Evalúa críticamente esta entrega (puede ser código, texto, teoría o ensayo). ¡No la rechaces por no contener código ejecutable!:
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

      // Actualizar XP (100 por completar/pasar para coincidir con la fórmula del Dashboard)
      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        xp: increment(100)
      });

      if (evaluation.awardedBadge) {
        // Bono adicional por insignia (250 XP) para Ranking automático
        updateDocumentNonBlocking(doc(db, 'users', user.uid), {
          xp: increment(250)
        });
        
        addDocumentNonBlocking(collection(db, 'users', user.uid, 'achievements'), {
          ...evaluation.awardedBadge,
          challengeId: challenge!.id,
          unlockedAt: serverTimestamp(),
        });
        toast({ title: "¡Insignia Desbloqueada!", description: `${evaluation.awardedBadge.title} (+250 XP Ranking)` });
      }

      // --- LOGICA DE CURSO: Marcar lección completada ---
      if (courseId && lessonId && evaluation.passed) {
        const currentCompleted = currentProgress?.completedLessons || [];
        const isAlreadyCompleted = currentCompleted.includes(lessonId);
        
        const total = course?.totalLessons || 0;
        const newCount = isAlreadyCompleted ? currentCompleted.length : currentCompleted.length + 1;
        const percentage = total > 0 ? Math.min(100, Math.round((newCount / total) * 100)) : 0;

        const progressRef = doc(db, 'users', user.uid, 'courseProgress', courseId);
        setDoc(progressRef, {
          courseId,
          completedLessons: arrayUnion(lessonId),
          lastLessonId: lessonId,
          progressPercentage: percentage,
          updatedAt: serverTimestamp(),
          status: 'in-progress'
        }, { merge: true }).then(() => {
          toast({ title: "¡Lección completada!", description: `Progreso: ${percentage}%` });
        }).catch(err => console.error("Error saving course progress from challenge:", err));
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
                <Badge variant="outline" className="rounded-xl border-primary/20 bg-primary/5 text-primary font-bold">
                  {challenge.technology || (challenge.title.toLowerCase().includes('html') ? 'HTML5' : challenge.title.toLowerCase().includes('python') ? 'Python' : 'Código')}
                </Badge>
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

        {sandpackTemplate ? (
          <SandpackProvider 
            template={sandpackTemplate as any} 
            theme="dark" 
            files={code ? { [sandpackTemplate==='react-ts'?'/App.tsx':sandpackTemplate==='nextjs'?'/app/page.tsx':'/src/index.js']: code } : {}}
          >
            <section className="flex-1 flex flex-col bg-slate-100 relative min-w-0">
              <div className="h-12 bg-white border-b flex items-center justify-between px-6 shrink-0">
                <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="h-3 w-3" />
                  Entorno de Proyecto Completo ({challenge.technology})
                </div>
                <SandpackSubmitter isEvaluating={isEvaluating} onSubmit={(c) => { setCode(c); handleSubmit(undefined, c); }} />
              </div>
              <div className="flex-1 p-4 lg:p-8 [&_.sp-layout]:!rounded-3xl [&_.sp-layout]:overflow-hidden [&_.sp-layout]:shadow-2xl [&_.sp-wrapper]:h-full [&_.sp-layout]:h-full border-none">
                <SandpackLayout>
                  <SandpackCodeEditor showTabs showLineNumbers />
                  <SandpackPreview showRefreshButton />
                </SandpackLayout>
              </div>
              {isEvaluating && (
                <div className="absolute inset-0 bg-slate-100/60 backdrop-blur-xl flex items-center justify-center z-20">
                  <div className="flex flex-col items-center gap-6 p-16 bg-white rounded-[4rem] border shadow-2xl animate-in zoom-in duration-300">
                    <div className="relative">
                      <Sparkles className="h-20 w-20 text-primary animate-pulse" />
                      <Stars className="absolute -top-2 -right-2 h-8 w-8 text-amber-400 animate-bounce" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-3xl font-headline font-bold text-slate-900">IA Procesando Proyecto...</h3>
                      <p className="text-muted-foreground font-medium">Examinando arquitectura, componentes y lógica.</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </SandpackProvider>
        ) : (
        <section className="flex-1 flex flex-col bg-slate-100 relative min-w-0">
          <div className="h-12 bg-white border-b flex items-center justify-between px-6 shrink-0">
            {challenge.type !== 'interview' && (
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                {challenge.type === 'quiz' ? <HelpCircle className="h-3 w-3" /> : challenge.type === 'interview' ? <MessageSquare className="h-3 w-3" /> : challenge.type === 'wordsearch' ? <Gamepad2 className="h-3 w-3" /> : <Terminal className="h-3 w-3" />}
                {challenge.type === 'quiz' ? 'Prueba de Conocimientos' : challenge.type === 'interview' ? 'Simulador de Entrevista' : challenge.type === 'wordsearch' ? 'Juego de Vocabulario' : 'Entorno de Programación'}
              </div>
            )}
            {!h5pTypes.includes(challenge.type) && (challenge.type !== 'wordsearch' || isGameComplete) && (
              <Button onClick={() => handleSubmit()} disabled={isEvaluating || !code.trim()} className="h-8 rounded-lg bg-primary hover:bg-primary/90 text-xs font-bold gap-2 px-4">
                {isEvaluating ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Sparkles className="h-3 w-3" /> Enviar para Evaluación</>}
              </Button>
            )}
          </div>
          
          <div className={`flex-1 relative overflow-y-auto ${challenge.type === 'interview' ? 'p-4 lg:p-12' : 'p-8'}`}>
            {challenge.type === 'wordsearch' ? (
              <div className="space-y-12">
                <WordSearchGame words={premiumData?.words || challenge.words || []} onComplete={() => setIsGameComplete(true)} />
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
                 <InteractiveVideo url={(effectiveJsonConfig.videoUrl as string) || ""} checkpoints={effectiveJsonConfig.checkpoints || []} onComplete={(score) => handleSubmit(score)} />
              </div>
            ) : challenge.type === 'dragdrop' ? (
              <div className="max-w-5xl mx-auto py-12 px-6 w-full animate-in slide-in-from-bottom-8 duration-500">
                 <DragDropSnippets template={(effectiveJsonConfig.template as string) || ""} snippets={effectiveJsonConfig.snippets || []} correctMapping={effectiveJsonConfig.correctMapping || {}} onComplete={(score) => handleSubmit(score)} />
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
                   {((challenge.technology || '') || (challenge.title || '')).toLowerCase().includes('python') && (
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
                        {isSimulatingGUI ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Sparkles className="h-3 w-3" /> Preview GUI IA</>}
                     </Button>
                   )}
                   {/* HTML Preview Toggle */}
                   {((challenge.technology || '') || (challenge.title || '')).toLowerCase().includes('html') && (
                     <Button 
                       onClick={() => setShowHtmlPreview(!showHtmlPreview)}
                       variant="ghost" 
                       size="sm" 
                       className={`h-8 rounded-lg gap-2 px-3 transition-all ${showHtmlPreview ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                     >
                        <Monitor className="h-3 w-3" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">
                          {showHtmlPreview ? 'Cerrar Vista Web' : 'Vista Web (Live)'}
                        </span>
                     </Button>
                   )}
                 </div>
                <div className="flex-1 min-h-[400px] flex relative overflow-hidden">
                  <div className={`relative transition-all duration-300 ${showHtmlPreview ? 'w-1/2 border-r-4 border-slate-900' : 'w-full'}`}>
                    <Editor
                      height="100%"
                      theme="vs-dark"
                      language={getMonacoLanguage(challenge.technology)}
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
                      beforeMount={(monaco) => {
                        const currentLang = getMonacoLanguage(challenge.technology, challenge.title);
                        
                        if (currentLang === 'html') {
                          // Habilitar configuraciones HTML nativas de Monaco
                          monaco.languages.html.htmlDefaults.setOptions({
                            suggest: { html5: true },
                            format: { tabSize: 2, insertSpaces: true }
                          });

                          // Registrar snippets Emmet personalizados como CompletionItemProvider
                          const regKey = '__learnstream_emmet_html_registered';
                          if (!(window as any)[regKey]) {
                            (window as any)[regKey] = true;
                            monaco.languages.registerCompletionItemProvider('html', {
                              triggerCharacters: ['!', '<', '.', '#', '>', '+', '*'],
                              provideCompletionItems: (_model: any, position: any, _ctx?: any, _token?: any) => {
                                const lineContent = _model.getLineContent(position.lineNumber);
                                const textUntilPosition = lineContent.substring(0, position.column - 1);
                                const match = textUntilPosition.match(/([a-zA-Z0-9_!]+)$/);
                                const word = match ? match[1] : '';
                                
                                const range = {
                                  startLineNumber: position.lineNumber,
                                  endLineNumber: position.lineNumber,
                                  startColumn: position.column - word.length,
                                  endColumn: position.column,
                                };
                                const snips = [
                                  { l: '!', e: '<!DOCTYPE html>\n<html lang="en">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1.0">\n\t<title>${1:Document}</title>\n</head>\n<body>\n\t$0\n</body>\n</html>', d: 'HTML5 Boilerplate' },
                                  { l: 'table', e: '<table>\n\t$0\n</table>', d: 'Table' },
                                  { l: 'form', e: '<form action="${1}" method="${2|post,get|}">\n\t$0\n</form>', d: 'Form' },
                                  { l: 'input', e: '<input type="${1|text,email,password,number|}" name="${2}" id="${3}">', d: 'Input' },
                                  { l: 'button', e: '<button type="${1|button,submit,reset|}">$0</button>', d: 'Button' },
                                  { l: 'nav', e: '<nav>\n\t$0\n</nav>', d: 'Nav' },
                                  { l: 'ul', e: '<ul>\n\t<li>$0</li>\n</ul>', d: 'Unordered List' },
                                  { l: 'ol', e: '<ol>\n\t<li>$0</li>\n</ol>', d: 'Ordered List' },
                                  { l: 'img', e: '<img src="${1}" alt="${2}">', d: 'Image' },
                                  { l: 'a', e: '<a href="${1:#}">$0</a>', d: 'Anchor' },
                                  { l: 'section', e: '<section>\n\t$0\n</section>', d: 'Section' },
                                  { l: 'article', e: '<article>\n\t$0\n</article>', d: 'Article' },
                                  { l: 'header', e: '<header>\n\t$0\n</header>', d: 'Header' },
                                  { l: 'footer', e: '<footer>\n\t$0\n</footer>', d: 'Footer' },
                                  { l: 'main', e: '<main>\n\t$0\n</main>', d: 'Main' },
                                  { l: 'div', e: '<div class="${1}">\n\t$0\n</div>', d: 'Div con clase' },
                                  { l: 'span', e: '<span class="${1}">${2}</span>', d: 'Span con clase' },
                                  { l: 'link', e: '<link rel="stylesheet" href="${1:styles.css}">', d: 'CSS externo' },
                                  { l: 'script', e: '<script src="${1:main.js}"></script>', d: 'Script externo' },
                                  { l: 'meta', e: '<meta name="${1:description}" content="${2}">', d: 'Meta tag' },
                                  { l: 'style', e: '<style>\n\t${1}\n</style>', d: 'Estilo interno' },
                                  { l: 'select', e: '<select name="${1}">\n\t<option value="${2}">${3}</option>\n</select>', d: 'Select' },
                                  { l: 'textarea', e: '<textarea name="${1}" rows="${2:4}" placeholder="${3}">${4}</textarea>', d: 'Textarea' },
                                  { l: 'label', e: '<label for="${1}">${2}</label>', d: 'Label' },
                                  { l: 'h1', e: '<h1>${1}</h1>', d: 'Título h1' },
                                  { l: 'h2', e: '<h2>${1}</h2>', d: 'Título h2' },
                                  { l: 'h3', e: '<h3>${1}</h3>', d: 'Título h3' },
                                  { l: 'p', e: '<p>${1}</p>', d: 'Párrafo' },
                                ];
                                return {
                                  suggestions: snips.map(({ l, e, d }) => ({
                                    label: l,
                                    kind: monaco.languages.CompletionItemKind.Snippet,
                                    documentation: d,
                                    insertText: e,
                                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                    detail: `✦ Emmet: ${d}`,
                                    sortText: '0' + l,
                                    range,
                                  }))
                                };
                              }
                            });
                          }
                        }

                        if (currentLang === 'css') {
                          monaco.languages.css.cssDefaults.setOptions({
                            validate: true,
                            lint: { unknownProperties: 'warning' }
                          });
                        }
                      }}
                      options={{
                        minimap: { enabled: false },
                        fontSize: 16,
                        padding: { top: 24, bottom: 24 },
                        scrollBeyondLastLine: false,
                        roundedSelection: false,
                        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                        wordWrap: 'on',
                        quickSuggestions: { other: true, comments: false, strings: true },
                        suggestOnTriggerCharacters: true,
                        acceptSuggestionOnEnter: 'on',
                        tabCompletion: 'on',
                        snippetSuggestions: 'top',
                      }}
                      className="absolute inset-0"
                    />
                  </div>
                  {showHtmlPreview && (
                     <div className="w-1/2 relative bg-white animate-in slide-in-from-right-8 duration-300">
                        <iframe 
                           className="w-full h-full border-none" 
                           srcDoc={code} 
                           sandbox="allow-scripts allow-modals" 
                           title="HTML Preview"
                        />
                     </div>
                  )}
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
        )}
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
         <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[85vh] bg-slate-900/80 backdrop-blur-3xl border-white/10 p-0 overflow-hidden rounded-[2rem] sm:rounded-[3rem] shadow-2xl flex flex-col transition-all duration-300">
            <div className="p-6 sm:p-10 space-y-6 sm:space-y-8 flex-1 flex flex-col overflow-y-auto">
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <DialogTitle className="text-xl sm:text-2xl font-headline font-bold text-white flex items-center gap-3">
                      <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-orange-400" />
                      Visual Laboratory
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-[10px] sm:text-xs font-medium uppercase tracking-widest">Interpretación inteligente de interfaces Python</DialogDescription>
                  </div>
                  
                  {/* Theme Switcher Toggle - Responsive Layout */}
                  <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 self-start lg:self-center">
                     <button 
                        onClick={() => setGUITheme('retro')}
                        className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black tracking-widest uppercase transition-all ${guiTheme === 'retro' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                     >
                        📜 RETO 95
                     </button>
                     <button 
                        onClick={() => setGUITheme('modern')}
                        className={`px-4 sm:px-6 py-2 rounded-xl text-[10px] sm:text-xs font-black tracking-widest uppercase transition-all ${guiTheme === 'modern' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                     >
                        ✨ MODERN LS
                     </button>
                  </div>
               </div>
               
               <div className="flex-1 min-h-[400px] flex items-center justify-center bg-black/40 rounded-[2.5rem] border border-white/5 p-4 sm:p-10 relative overflow-hidden">
                  {/* Decorative background for the simulator area */}
                  <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent)] pointer-events-none" />
                  
                  {isSimulatingGUI ? (
                    <div className="flex flex-col items-center gap-6 animate-pulse">
                       <div className="relative">
                          <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
                          <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-orange-300" />
                       </div>
                       <span className="text-orange-200 font-bold text-[9px] uppercase tracking-[0.4em] text-center">El Genio está interpretando el código...</span>
                    </div>
                  ) : guiData ? (
                    <div className="w-full flex justify-center items-center">
                       <GUIMimicWindow 
                          components={guiData.components} 
                          title={guiData.windowTitle} 
                          theme={guiTheme} 
                          onClose={() => setIsGUIPortalOpen(false)}
                          width={guiData.width}
                          height={guiData.height}
                       />
                    </div>
                  ) : (
                    <div className="text-center space-y-4 opacity-40 py-10">
                       <ShieldAlert className="h-12 w-12 text-slate-500 mx-auto" />
                       <div className="space-y-1">
                          <p className="text-white font-bold text-sm uppercase tracking-wider">No se detectó GUI</p>
                          <p className="text-slate-400 text-[10px] max-w-[200px] mx-auto leading-relaxed">Usa librerías como Tkinter o Pygame para previsualizar tu creación.</p>
                       </div>
                    </div>
                  )}
               </div>
               
               {/* Footer Warning */}
               {guiData && !isSimulatingGUI && (
                  <p className="text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] opacity-50 pb-2">
                     Simulation Mode - Non Executable UI
                  </p>
               )}
            </div>
         </DialogContent>
       </Dialog>
    </div>
  );
}
