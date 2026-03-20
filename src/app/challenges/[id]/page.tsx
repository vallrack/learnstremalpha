
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo } from 'react';
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
  Award,
  Medal,
  ShieldAlert,
  BookOpen,
  Gamepad2,
  BrainCircuit
} from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { evaluateChallenge, type EvaluateChallengeOutput } from '@/ai/flows/evaluate-challenge';
import { WordSearchGame } from '@/components/challenges/WordSearchGame';
import Link from 'next/link';

export default function ChallengeExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const challengeId = params.id as string;
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const progressQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, 'users', user.uid, 'courseProgress');
  }, [db, user?.uid]);
  const { data: userProgress } = useCollection(progressQuery);

  const enrolledCourseIds = useMemo(() => {
    return userProgress?.map(p => p.courseId) || [];
  }, [userProgress]);

  const [code, setCode] = useState('');
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluateChallengeOutput | null>(null);

  useEffect(() => {
    if (challenge) {
      setCode(challenge.initialCode || '');
    }
  }, [challenge]);

  const canAccessChallenge = useMemo(() => {
    if (!challenge) return false;
    if (profile?.role === 'admin') return true;
    const isLinkedToEnrolledCourse = challenge.courseId && enrolledCourseIds.includes(challenge.courseId);
    const isPublic = !challenge.visibility || challenge.visibility === 'public';
    return isLinkedToEnrolledCourse || isPublic;
  }, [challenge, profile, enrolledCourseIds]);

  const isPremiumLocked = useMemo(() => {
    if (!challenge || profile?.role === 'admin') return false;
    return !challenge.isFree && !profile?.isPremiumSubscriber;
  }, [challenge, profile]);

  const handleSubmit = async () => {
    if (!challenge || !db || !canAccessChallenge || isPremiumLocked) return;
    
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

      if (user && !user.isAnonymous) {
        addDocumentNonBlocking(collection(db, 'users', user.uid, 'challenge_submissions'), {
          challengeId: challenge.id,
          challengeTitle: challenge.title,
          score: evaluation.score,
          feedback: evaluation.feedback,
          passed: evaluation.passed,
          submittedAt: serverTimestamp()
        });

        if (evaluation.awardedBadge) {
          addDocumentNonBlocking(collection(db, 'users', user.uid, 'achievements'), {
            ...evaluation.awardedBadge,
            challengeId: challenge.id,
            unlockedAt: serverTimestamp(),
          });
          toast({ title: "¡Insignia Desbloqueada!", description: evaluation.awardedBadge.title });
        }
      }
    } catch (error) {
      console.error('Evaluation failed', error);
      toast({ variant: "destructive", title: "Error de IA", description: "No pudimos evaluar tu actividad." });
    } finally {
      setIsEvaluating(false);
    }
  };

  if (isUserLoading || isChallengeLoading) {
    return <div className="h-screen flex items-center justify-center bg-[#F8FAFC]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!challenge) {
    return <div className="h-screen flex flex-col items-center justify-center gap-4"><h1 className="text-2xl font-bold">Reto no encontrado</h1><Button onClick={() => router.back()}>Volver</Button></div>;
  }

  if (!canAccessChallenge) {
    return (
      <div className="h-screen flex flex-col bg-[#F8FAFC]">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-rose-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-rose-500/10">
            <ShieldAlert className="h-10 w-10 text-rose-600" />
          </div>
          <h1 className="text-4xl font-headline font-bold mb-4">Acceso Restringido</h1>
          <p className="text-muted-foreground max-w-md mb-10 text-lg">Inscríbete en el curso de **{challenge.technology}** para acceder.</p>
          <Link href="/courses"><Button className="rounded-2xl h-14 px-8 font-bold gap-2"><BookOpen className="h-5 w-5" /> Explorar Cursos</Button></Link>
        </main>
      </div>
    );
  }

  const isInteractive = challenge.type === 'wordsearch';

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
                <Badge variant="secondary" className="rounded-lg">{challenge.technology}</Badge>
                <Badge className={challenge.difficulty === 'Principiante' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}>
                  {challenge.difficulty}
                </Badge>
              </div>
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-primary" />
                  Tu Misión
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{challenge.description}</p>
              </div>
            </section>

            {result && (
              <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                {result.awardedBadge && (
                  <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-[2rem] text-white shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="bg-white/20 p-3 rounded-2xl"><Medal className="h-10 w-10" /></div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">NUEVA INSIGNIA</p>
                        <h3 className="text-xl font-headline font-bold leading-tight">{result.awardedBadge.title}</h3>
                      </div>
                    </div>
                  </div>
                )}
                <Card className={`rounded-3xl border-2 ${result.passed ? 'border-emerald-500/20 bg-emerald-50/50' : 'border-amber-500/20 bg-amber-50/50'}`}>
                  <CardHeader className="p-4 pb-0"><CardTitle className="text-sm font-bold flex justify-between">Feedback IA <span>{result.score}/5.0</span></CardTitle></CardHeader>
                  <CardContent className="p-4 pt-2"><p className="text-xs text-slate-700 leading-relaxed italic">"{result.feedback}"</p></CardContent>
                </Card>
              </section>
            )}
          </div>
        </aside>

        <section className="flex-1 flex flex-col bg-slate-50 relative min-w-0">
          <div className="h-12 bg-white border-b flex items-center justify-between px-6 shrink-0">
            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              {isInteractive ? <Gamepad2 className="h-3 w-3" /> : <Terminal className="h-3 w-3" />}
              {isInteractive ? 'Actividad Interactiva' : 'Editor de Código'}
            </div>
            {(!isInteractive || isGameComplete) && (
              <Button onClick={handleSubmit} disabled={isEvaluating || !code.trim()} className="h-8 rounded-lg bg-primary hover:bg-primary/90 text-xs font-bold gap-2">
                {isEvaluating ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Sparkles className="h-3 w-3" /> Enviar para Evaluación</>}
              </Button>
            )}
          </div>
          
          <div className="flex-1 relative overflow-y-auto p-8">
            {isInteractive ? (
              <div className="space-y-12">
                <WordSearchGame words={challenge.words || []} onComplete={() => setIsGameComplete(true)} />
                
                {isGameComplete && (
                  <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-10 duration-700">
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-headline font-bold text-slate-900">¡Fase 1 completada!</h3>
                      <p className="text-muted-foreground text-sm">Ahora demuestra que sabes usar estos términos. Escribe una breve reflexión o frases usándolos:</p>
                    </div>
                    <Textarea 
                      value={code} 
                      onChange={(e) => setCode(e.target.value)}
                      className="min-h-[200px] rounded-[2rem] border-2 border-primary/20 bg-white p-8 text-lg shadow-xl focus-visible:ring-primary"
                      placeholder="Escribe tu respuesta aquí para que la IA la califique..."
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full bg-slate-950 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl">
                <Textarea 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)}
                  className="flex-1 bg-slate-950 text-emerald-400 font-mono text-sm p-8 focus-visible:ring-0 border-none resize-none leading-relaxed"
                  spellCheck={false}
                />
              </div>
            )}

            {isEvaluating && (
              <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-md flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-4 p-12 bg-white rounded-[3rem] border shadow-2xl text-center">
                  <div className="relative">
                    <Sparkles className="h-16 w-16 text-primary animate-pulse" />
                    <Loader2 className="h-16 w-16 text-primary animate-spin absolute inset-0 opacity-20" />
                  </div>
                  <h3 className="text-2xl font-headline font-bold text-slate-900">Analizando tu desempeño...</h3>
                  <p className="text-muted-foreground text-sm">Nuestra IA está revisando la coherencia y gramática.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
