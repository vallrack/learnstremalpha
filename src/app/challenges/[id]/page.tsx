
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
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

export default function ChallengeExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();

  const challengeRef = useMemoFirebase(() => {
    if (!db || !challengeId) return null;
    return doc(db, 'coding_challenges', challengeId);
  }, [db, challengeId]);
  const { data: challenge, isLoading: isChallengeLoading } = useDoc(challengeRef);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  const [code, setCode] = useState('');
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluateChallengeOutput | null>(null);
  const [showXPReward, setShowXPReward] = useState<{ xpGained: number; newTotalXP: number; badge?: { title: string; description: string } | null } | null>(null);

  useEffect(() => {
    if (challenge) setCode(challenge.initialCode || '');
  }, [challenge]);

  const isPremiumLocked = useMemo(() => {
    if (!challenge || profile?.role === 'admin') return false;
    return !challenge.isFree && !profile?.isPremiumSubscriber;
  }, [challenge, profile]);

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
      const evaluation = await evaluateChallenge({
        challengeTitle: challenge.title,
        challengeDescription: challenge.description,
        technology: challenge.technology,
        studentCode: code,
        solutionReference: challenge.solution,
      });
      processResult(evaluation);
    } catch (error) {
      toast({ variant: "destructive", title: "Error de IA", description: "No pudimos evaluar tu actividad en este momento." });
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

  if (isUserLoading || isChallengeLoading || (user && !profile)) {
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
          <p className="text-muted-foreground max-w-md mb-10 text-lg">Este reto requiere una suscripción activa para ser evaluado por IA y obtener XP en tu portfolio.</p>
          <Link href="/checkout"><Button className="rounded-2xl h-14 px-10 font-bold bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-200">Mejorar a Premium Ahora</Button></Link>
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
            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              {challenge.type === 'quiz' ? <HelpCircle className="h-3 w-3" /> : challenge.type === 'interview' ? <MessageSquare className="h-3 w-3" /> : challenge.type === 'wordsearch' ? <Gamepad2 className="h-3 w-3" /> : <Terminal className="h-3 w-3" />}
              {challenge.type === 'quiz' ? 'Prueba de Conocimientos' : challenge.type === 'interview' ? 'Simulador de Entrevista' : challenge.type === 'wordsearch' ? 'Juego de Vocabulario' : 'Entorno de Programación'}
            </div>
            {challenge.type !== 'quiz' && (challenge.type !== 'wordsearch' || isGameComplete) && (
              <Button onClick={() => handleSubmit()} disabled={isEvaluating || !code.trim()} className="h-8 rounded-lg bg-primary hover:bg-primary/90 text-xs font-bold gap-2 px-4">
                {isEvaluating ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Sparkles className="h-3 w-3" /> Enviar para Evaluación</>}
              </Button>
            )}
          </div>
          
          <div className="flex-1 relative overflow-y-auto p-8">
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
                <QuizPlayer questions={challenge.questions || []} onComplete={(s) => handleSubmit(s)} />
              </div>
            ) : challenge.type === 'interview' ? (
              <div className="h-full flex flex-col gap-6 animate-in fade-in duration-700">
                <VoiceInterview 
                  role={challenge.targetRole || challenge.title} 
                  initialLanguage={challenge.targetLanguage || 'es'} 
                  instructions={challenge.solution}
                  isPremiumChallenge={!challenge.isFree}
                  isAdmin={profile?.role === 'admin'}
                  onComplete={(transcript) => {
                    setCode(transcript);
                  }} 
                />
              </div>
            ) : challenge.type === 'interactive-video' ? (
              <div className="max-w-4xl mx-auto py-12 px-6 w-full animate-in fade-in zoom-in duration-500">
                 <InteractiveVideo url={challenge.videoUrl as string} checkpoints={challenge.checkpoints || []} onComplete={(score) => handleSubmit(score)} />
              </div>
            ) : challenge.type === 'dragdrop' ? (
              <div className="max-w-5xl mx-auto py-12 px-6 w-full animate-in slide-in-from-bottom-8 duration-500">
                 <DragDropSnippets template={challenge.template as string} snippets={challenge.snippets || []} correctMapping={challenge.correctMapping || {}} onComplete={(score) => handleSubmit(score)} />
              </div>
            ) : challenge.type === 'sortable' ? (
              <div className="max-w-4xl mx-auto py-12 px-6 w-full animate-in slide-in-from-right-8 duration-500">
                 <SortableCodeBlocks lines={challenge.lines || []} correctOrder={challenge.correctOrder || []} onComplete={(score) => handleSubmit(score)} />
              </div>
            ) : challenge.type === 'flashcard' ? (
              <div className="max-w-2xl mx-auto py-6 px-4 w-full h-[700px] flex items-center justify-center animate-in zoom-in-90 duration-500">
                 <FlipFlashcards cards={challenge.cards || []} onComplete={(score) => handleSubmit(score)} />
              </div>
            ) : challenge.type === 'swipe' ? (
              <div className="max-w-xl mx-auto py-6 px-4 w-full h-[700px] flex items-center justify-center animate-in slide-in-from-bottom-20 duration-500">
                 <SwipeCards deck={challenge.deck || []} onComplete={(score) => handleSubmit(score)} />
              </div>
            ) : (
              <div className="h-full bg-[#1e1e1e] rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl border-4 border-[#1e1e1e]">
                <div className="bg-[#1e1e1e] px-6 py-4 flex items-center gap-2 border-b border-white/5 shrink-0">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="ml-4 text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest">learnstream_ide_v2.0</span>
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
    </div>
  );
}
