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
  Unlock,
  AlertTriangle,
  Crown,
  LogIn,
  UserPlus,
  Medal,
  ShieldAlert,
  BookOpen
} from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, useUser, addDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { evaluateChallenge, type EvaluateChallengeOutput } from '@/ai/flows/evaluate-challenge';
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
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluateChallengeOutput | null>(null);

  useEffect(() => {
    if (challenge) {
      setCode(challenge.initialCode || '');
    }
  }, [challenge]);

  // VERIFICACIÓN DE SEGURIDAD ESTRICTA:
  // Un estudiante solo puede acceder si el reto pertenece a un curso en el que está inscrito.
  // El administrador tiene acceso total.
  const canAccessChallenge = useMemo(() => {
    if (!challenge) return false;
    if (profile?.role === 'admin') return true;
    
    // Si el reto no tiene curso asignado, se considera restringido para estudiantes (según requerimiento)
    if (!challenge.courseId) return false;
    
    return enrolledCourseIds.includes(challenge.courseId);
  }, [challenge, profile, enrolledCourseIds]);

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
        if (target) target.selectionStart = target.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    toast({
      variant: "destructive",
      title: "Acción no permitida",
      description: "Por integridad del aprendizaje, debes escribir el código manualmente.",
    });
  };

  const handleSubmit = async () => {
    if (!challenge || !db || !canAccessChallenge) return;
    
    const isPremiumAndNoSub = !challenge.isFree && !profile?.isPremiumSubscriber;
    if (isPremiumAndNoSub) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "Este es un reto premium. Suscríbete para continuar.",
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
      toast({
        variant: "destructive",
        title: "Error de IA",
        description: "No pudimos evaluar tu código. Inténtalo de nuevo.",
      });
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

  // Vista de acceso denegado si el reto no pertenece a sus cursos
  if (!canAccessChallenge) {
    return (
      <div className="h-screen flex flex-col bg-[#F8FAFC]">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-rose-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-rose-500/10">
            <ShieldAlert className="h-10 w-10 text-rose-600" />
          </div>
          <h1 className="text-4xl font-headline font-bold mb-4">Acceso Restringido</h1>
          <p className="text-muted-foreground max-w-md mb-10 text-lg leading-relaxed">
            Este desafío es exclusivo para estudiantes inscritos en el curso asociado. Por favor, inscríbete en el programa correspondiente para desbloquear esta actividad.
          </p>
          <div className="flex gap-4">
            <Link href="/courses"><Button className="rounded-2xl h-14 px-8 font-bold gap-2"><BookOpen className="h-5 w-5" /> Explorar Cursos</Button></Link>
            <Button variant="ghost" onClick={() => router.back()} className="rounded-2xl h-14 px-8 font-bold">Volver</Button>
          </div>
        </main>
      </div>
    );
  }

  const isUIChallenge = challenge.technology.includes('HTML') || challenge.technology.includes('CSS') || challenge.technology.includes('Figma');

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
                <div className="flex gap-2">
                  <Badge variant="secondary" className="rounded-lg">{challenge.technology}</Badge>
                  <Badge className="bg-primary/10 text-primary border-none">Reto de Curso</Badge>
                </div>
                <Badge className={challenge.difficulty === 'Principiante' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}>
                  {challenge.difficulty}
                </Badge>
              </div>
              <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{challenge.description}</p>
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
                  <CardHeader className="p-4 pb-0"><CardTitle className="text-sm font-bold flex justify-between">Resultado <span>{result.score}/5.0</span></CardTitle></CardHeader>
                  <CardContent className="p-4 pt-2"><p className="text-xs text-slate-700 leading-relaxed italic">"{result.feedback}"</p></CardContent>
                </Card>
              </section>
            )}
          </div>
        </aside>

        <section className="flex-1 flex flex-col bg-slate-950 relative min-w-0">
          <div className="h-12 bg-slate-900 border-b border-white/5 flex items-center justify-between px-6 shrink-0">
            <div className="text-white/50 text-xs font-mono flex items-center gap-2">
              {isUIChallenge ? <Layout className="h-3 w-3" /> : <Terminal className="h-3 w-3" />}
              solucion.{challenge.technology.toLowerCase().includes('py') ? 'py' : 'code'}
            </div>
            <Button onClick={handleSubmit} disabled={isEvaluating || !code.trim()} className="h-8 rounded-lg bg-primary hover:bg-primary/90 text-xs font-bold gap-2">
              {isEvaluating ? <><Loader2 className="h-3 w-3 animate-spin" /> Calificando...</> : <><Play className="h-3 w-3 fill-current" /> Enviar Código</>}
            </Button>
          </div>
          <div className="flex-1 relative overflow-hidden flex flex-col">
            <Textarea 
              ref={textareaRef}
              value={code} 
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className="flex-1 bg-slate-950 text-emerald-400 font-mono text-sm p-8 focus-visible:ring-0 border-none resize-none leading-relaxed"
              spellCheck={false}
            />
            {isEvaluating && (
              <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="flex flex-col items-center gap-4 p-8 bg-slate-900 rounded-[2.5rem] border border-white/10 text-center">
                  <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                  <h3 className="text-white font-headline font-bold text-lg">La IA está evaluando...</h3>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
