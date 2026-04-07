'use client';

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Menu, 
  PlayCircle,
  Paperclip,
  FileDown,
  FileText,
  Presentation,
  Link as LinkIcon,
  Eye,
  ExternalLink,
  Award,
  Code2,
  ArrowRight,
  HelpCircle,
  Lock,
  Star,
  Send,
  Download, 
  MessageSquare, 
  ThumbsUp, 
  MessageCircleMore, 
  Trash2, 
  History, 
  UserCircle2, 
  Map as MapIcon,
  ShieldAlert,
  Mic2,
  ExternalLink as ExternalLinkIcon
} from 'lucide-react';
import { PodcastPlayer } from "@/components/podcasts/PodcastPlayer";
import Link from 'next/link';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy, serverTimestamp, setDoc, where, updateDoc, arrayUnion, getDoc, getDocs, addDoc, increment, deleteDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { FloatingAITutor } from '@/components/ai/FloatingAITutor';

import { Navbar } from '@/components/layout/Navbar';
import { QuizPlayer } from '@/components/challenges/QuizPlayer';
import { FlipFlashcards } from '@/components/challenges/FlipFlashcards';
import { SortableCodeBlocks } from '@/components/challenges/SortableCodeBlocks';
import { WordSearchGame } from '@/components/challenges/WordSearchGame';
import { InteractiveVideo } from '@/components/challenges/InteractiveVideo';
import { DragDropSnippets } from '@/components/challenges/DragDropSnippets';
import { SwipeCards } from '@/components/challenges/SwipeCards';

export default function LessonPlayerClient() {
  return <LessonPlayerContent />;
}

function LessonPlayerContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const { user, profile, isUserLoading } = useUser();
  const { toast } = useToast();
  
  // --- Encuesta de satisfacción ---
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyRating, setSurveyRating] = useState(0);
  const [surveyHover, setSurveyHover] = useState(0);
  const [surveyComment, setSurveyComment] = useState('');
  const [surveySubmitting, setSurveySubmitting] = useState(false);

  const courseId = params.id as string;
  const lessonId = params.lessonId as string;
  const moduleId = searchParams.get('moduleId') ?? '';

  const courseRef = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return doc(db, 'courses', courseId);
  }, [db, courseId]);
  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);

  const lessonRef = useMemoFirebase(() => {
    if (!db || !courseId || !moduleId || !lessonId) return null;
    if (moduleId.length === 0) return null;
    return doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId);
  }, [db, courseId, moduleId, lessonId]);
  const { data: currentLesson, isLoading: isLessonLoading } = useDoc(lessonRef);
  
  const moduleRef = useMemoFirebase(() => {
    if (!db || !courseId || !moduleId) return null;
    if (moduleId.length === 0) return null;
    return doc(db, 'courses', courseId, 'modules', moduleId);
  }, [db, courseId, moduleId]);
  const { data: currentModule, isLoading: isModuleLoading } = useDoc(moduleRef);

  const modulesQuery = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return query(collection(db, 'courses', courseId, 'modules'), orderBy('orderIndex', 'asc'));
  }, [db, courseId]);
  const { data: modules, isLoading: isModulesLoading } = useCollection(modulesQuery);

  const progressRef = useMemoFirebase(() => {
    if (!db || !user?.uid || !courseId) return null;
    return doc(db, 'users', user.uid, 'courseProgress', courseId);
  }, [db, user?.uid, courseId]);
  const { data: progress } = useDoc(progressRef);
  
  const [premiumData, setPremiumData] = useState<any>(null);
  const [isLoadingPremium, setIsLoadingPremium] = useState(false);
  const [totalLessons, setTotalLessons] = useState(0);

  const instructorRef = useMemoFirebase(() => {
    if (!db || !course?.instructorId) return null;
    return doc(db, 'users', course.instructorId);
  }, [db, course?.instructorId]);
  const { data: instructorProfile } = useDoc(instructorRef);

  // Calcular total de lecciones del curso para la barra de progreso
  useEffect(() => {
    if (!db || !courseId || !modules) return;
    const fetchCounts = async () => {
      if (!db) return;
      let count = 0;
      for (const mod of modules) {
        const q = query(collection(db, 'courses', courseId, 'modules', mod.id, 'lessons'));
        const snap = await getDocs(q);
        count += snap.size;
      }
      setTotalLessons(count);
    };
    fetchCounts();
  }, [db, courseId, modules]);

  const handleMarkAsCompleted = async () => {
    if (!db || !user || user.isAnonymous || !courseId || !lessonId) {
      if (user?.isAnonymous) toast({ variant: "destructive", title: "Inicia sesión", description: "Debes estar registrado para guardar tu progreso." });
      return;
    }
    
    const currentCompleted = progress?.completedLessons || [];
    const isAlreadyCompleted = currentCompleted.includes(lessonId);

    if (!isAlreadyCompleted) {
      await setDoc(progressRef!, {
        courseId,
        completedLessons: arrayUnion(lessonId),
        lastLessonId: lessonId,
        updatedAt: serverTimestamp(),
        status: 'in-progress'
      }, { merge: true });
      
      toast({ title: "¡Lección completada!", description: "Tu progreso se ha guardado." });
      router.refresh();
    }
  };

  // Función de certificación (Separada)
  const handleFinalizeCourse = async () => {
      if (!db || !user || !progressRef) return;
      
      await updateDoc(progressRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        progressPercentage: 100
      });

      // Crear Certificado Verificable Oficial
      const certRef = doc(db, 'certificates', `${user.uid}_${courseId}`);
      await setDoc(certRef, {
        userId: user.uid,
        courseId,
        studentName: profile?.displayName || user.email?.split('@')[0] || 'Estudiante',
        courseTitle: course?.title || 'Curso',
        technology: course?.technology || 'General',
        instructorName: course?.instructorName || 'Instructor',
        issuedAt: serverTimestamp(),
        isValid: true,
      }, { merge: true });

      const { sendCertificateAction } = await import('@/app/actions/email');
      await sendCertificateAction(user!.uid, courseId);

      setShowSurvey(true);
      router.refresh();
      toast({ title: "¡Felicidades!", description: "Has finalizado el curso. Revisa tu correo para el diploma." });
  };

  const handleSubmitSurvey = async () => {
    if (!db || !user || surveyRating === 0) return;
    setSurveySubmitting(true);
    try {
      const userProfileData = (await getDoc(doc(db, 'users', user.uid))).data();
      await setDoc(doc(db, 'reviews', courseId, 'ratings', user.uid), {
        userId: user.uid,
        courseId,
        rating: surveyRating,
        comment: surveyComment.trim(),
        displayName: userProfileData?.displayName || user.email?.split('@')[0] || 'Estudiante',
        profileImageUrl: userProfileData?.profileImageUrl || userProfileData?.photoURL || null,
        createdAt: serverTimestamp(),
      });
      toast({ title: '¡Gracias por tu reseña!', description: 'Tu opinión ayuda a mejorar la calidad del curso.' });
      router.refresh();
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar tu reseña. Intenta más tarde.' });
    } finally {
      setSurveySubmitting(false);
      setShowSurvey(false);
      setSurveyRating(0);
      setSurveyComment('');
    }
  };

  const isAcademy = profile?.role === 'academy' || false;
  const isAcademyActive = (isAcademy && profile?.subscription?.status === 'active') || false;
  const isAuthor = (user && course && user.uid === course.instructorId) || false;
  const hasPurchasedCourse = (profile?.purchasedCourses?.includes(courseId)) || false;
  const hasPurchasedModule = (moduleId && profile?.purchasedModules?.includes(moduleId)) || false;
  const hasPurchasedLesson = (profile?.purchasedLessons?.includes(lessonId)) || false;
  
  const hasPurchased = hasPurchasedCourse || hasPurchasedModule || hasPurchasedLesson;
  const isFreeCourse = course?.isFree === true;
  const isLessonPremium = !!currentLesson?.isPremium;
  const isModulePremium = !!currentModule?.isPremium;
  const isGuest = !user || user.isAnonymous;

  const isPremium = useMemo(() => {
     if (isUserLoading || !profile) return false;
     return profile?.role === 'admin' || profile?.isPremiumSubscriber || (courseId && profile?.purchasedCourses?.includes(courseId));
  }, [profile, courseId, isUserLoading]);

  const isEnrolled = useMemo(() => {
    if (isUserLoading || !user || !profile) return false;
    if (profile.role === 'admin') return true;
    return (courseId && profile.purchasedCourses?.includes(courseId)) || profile.isPremiumSubscriber;
  }, [user, profile, courseId, isUserLoading]);

  const hasValidAccess = useMemo(() => {
    // Si los datos base están cargando, consideramos que tiene acceso para evitar parpadeos de bloqueo
    if (isUserLoading || isCourseLoading) return true;
    if (profile?.role === 'admin') return true;
    if (!course) return false;
    return isFreeCourse || isEnrolled || isPremium;
  }, [course, isEnrolled, isPremium, profile, isUserLoading, isCourseLoading, isFreeCourse]);

  const finalizedAccess = useMemo(() => {
    if (isUserLoading || isCourseLoading) return true; // Mantener true durante carga
    if (profile?.role === 'admin') return true;
    return hasValidAccess;
  }, [hasValidAccess, isUserLoading, isCourseLoading, profile]);

  useEffect(() => {
    async function fetchPremiumData() {
      if (!db || !finalizedAccess || !courseId || !moduleId || !lessonId || isUserLoading || isCourseLoading || isLessonLoading) return;
      
      setIsLoadingPremium(true);
      try {
        const premiumRef = doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId, 'premium', 'data');
        const snap = await getDoc(premiumRef);
        if (snap.exists()) {
          setPremiumData(snap.data());
        }
      } catch (err) {
        console.error("Error fetching premium lesson data:", err);
      } finally {
        setIsLoadingPremium(false);
      }
    }

    fetchPremiumData();
  }, [db, finalizedAccess, courseId, moduleId, lessonId, isUserLoading, isCourseLoading, isLessonLoading]);

  const effectiveDescription = premiumData?.description || currentLesson?.description;
  const effectiveChallengeId = premiumData?.challengeId || currentLesson?.challengeId;
  const effectivePodcastId = premiumData?.podcastId || currentLesson?.podcastId;
  const effectiveQuestions = premiumData?.questions || currentLesson?.questions;

  const podcastRef = useMemoFirebase(() => {
    if (!db || !effectivePodcastId || currentLesson?.type !== 'podcast') return null;
    return doc(db, 'podcasts', effectivePodcastId);
  }, [db, effectivePodcastId, currentLesson?.type]);
  const { data: podcastData } = useDoc(podcastRef);

  const effectiveVideoUrl = premiumData?.videoUrl || currentLesson?.videoUrl;

  const formatVideoUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
    if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('/').pop()?.split('?')[0]}`;
    return url;
  };

  const videoSource = effectiveVideoUrl || (currentLesson?.title?.startsWith('http') ? currentLesson.title : null);

  if (isCourseLoading || isLessonLoading || isModulesLoading || isModuleLoading || isUserLoading) {
    return <div className="h-screen flex flex-col items-center justify-center gap-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-muted-foreground animate-pulse font-medium">Cargando lección...</p></div>;
  }

  if (!course || !currentLesson) return <div className="h-screen flex items-center justify-center">No encontrado</div>;

  if (!finalizedAccess) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-rose-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-rose-500/10">
            <Lock className="h-10 w-10 text-rose-600" />
          </div>
          <h1 className="text-4xl font-headline font-bold mb-4">Acceso Restringido</h1>
          <p className="text-muted-foreground max-w-md mb-8 text-lg">
            {isModulePremium ? 'Este módulo es Premium. ' : isLessonPremium ? 'Esta lección es Premium. ' : 'Este curso requiere acceso. '}
            Debes adquirir este contenido o tener una suscripción activa para continuar aprendiendo.
          </p>

          {(isModulePremium || isLessonPremium) && isFreeCourse && (
            <div className="mb-8 p-6 bg-amber-50 border-2 border-amber-200 rounded-[2.5rem] max-w-sm w-full shadow-lg shadow-amber-500/5">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-2">Desbloqueo Individual</p>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-slate-700">Inversión vitalicia:</span>
                <span className="text-2xl font-black text-amber-600">
                  {isLessonPremium ? formatPrice(currentLesson.price || 0, currentLesson.currency || 'COP') : formatPrice(currentModule?.price || 0, currentModule?.currency || 'COP')}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            {!user ? (
              <Button onClick={() => router.push('/login')} className="rounded-2xl h-14 px-8 bg-primary hover:bg-primary/90 font-bold shadow-xl shadow-primary/10">
                Iniciar Sesión Gratis
              </Button>
            ) : isAcademy ? (
              <Button onClick={() => router.push('/admin/academy')} className="rounded-2xl h-14 px-8 bg-amber-500 hover:bg-amber-600 font-bold shadow-lg shadow-amber-200">
                Renovar Suscripción Academia
              </Button>
            ) : (
              <Button variant="outline" onClick={() => router.push(`/courses/${courseId}`)} className="rounded-2xl h-14 px-8 text-lg font-bold">
                Ver Contenido Libre
              </Button>
            )}
            {!isAcademy && (
              <Button 
                onClick={() => {
                  let url = `/checkout?courseId=${courseId}`;
                  if (isLessonPremium && isFreeCourse) url += `&moduleId=${moduleId}&lessonId=${lessonId}`;
                  else if (isModulePremium && isFreeCourse) url += `&moduleId=${moduleId}`;
                  router.push(url);
                }} 
                className="rounded-2xl h-14 px-8 bg-amber-500 hover:bg-amber-600 font-bold shadow-lg shadow-amber-200"
              >
                {isFreeCourse ? (isModulePremium || isLessonPremium ? 'Desbloquear Contenido' : 'Suscripción Premium') : 'Obtener Acceso'} 
              </Button>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden relative">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <aside className="hidden lg:flex w-80 bg-white border-r flex-col shrink-0 overflow-hidden shadow-sm">
          <div className="p-6 border-b bg-slate-50/30 space-y-4">
            <div className="flex items-center justify-between mb-1">
                <h3 className="font-headline font-bold text-slate-800 text-sm italic">Tu progreso</h3>
                <span className="text-primary font-black text-xs bg-primary/10 px-2 py-1 rounded-lg">
                    {totalLessons > 0 ? Math.round(((progress?.completedLessons?.length || 0) / totalLessons) * 100) : 0}%
                </span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                <div 
                    className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                    style={{ width: `${totalLessons > 0 ? Math.min(100, Math.round(((progress?.completedLessons?.length || 0) / totalLessons) * 100)) : 0}%` }}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                {progress?.completedLessons?.length || 0} de {totalLessons} lecciones completadas
            </p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {modules?.map((module, i) => (
              <ModuleInSidebar key={module.id} module={module} courseId={courseId} activeLessonId={lessonId} index={i} completedLessons={progress?.completedLessons || []} />
            ))}
          </div>
        </aside>

        {/* Floating Mobile Progress & Navigation */}
        {!isGuest && (
            <div className="lg:hidden fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button className="rounded-full h-14 w-14 shadow-2xl shadow-primary/40 flex flex-col gap-0 p-0 overflow-hidden group">
                            <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/20 transition-colors" />
                            <MapIcon className="h-5 w-5 mb-0.5 relative z-10" />
                            <span className="text-[8px] font-black uppercase relative z-10">Mapa</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[85vw] p-0 flex flex-col bg-white border-l shadow-2xl">
                        <SheetHeader className="p-6 border-b bg-slate-50/50">
                            <div className="flex items-center justify-between mb-4">
                                <SheetTitle className="font-headline font-bold text-slate-800 text-lg">Progreso del Curso</SheetTitle>
                                <span className="text-primary font-black text-xs bg-primary/10 px-2 py-1 rounded-lg">
                                    {totalLessons > 0 ? Math.round(((progress?.completedLessons?.length || 0) / totalLessons) * 100) : 0}%
                                </span>
                            </div>
                            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner mb-2">
                                <div 
                                    className="h-full bg-primary transition-all duration-700" 
                                    style={{ width: `${totalLessons > 0 ? Math.round(((progress?.completedLessons?.length || 0) / totalLessons) * 100) : 0}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {progress?.completedLessons?.length || 0} de {totalLessons} lecciones completadas
                            </p>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {modules?.map((module, i) => (
                                <ModuleInSidebar key={module.id} module={module} courseId={courseId} activeLessonId={lessonId} index={i} completedLessons={progress?.completedLessons || []} />
                            ))}
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        )}

        <main className="flex-1 flex flex-col min-w-0 bg-[#F1F0F4]/30">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {currentLesson.type === 'challenge' ? (
                 <EmbeddedChallenge 
                    challengeId={effectiveChallengeId}
                    onComplete={() => {
                       toast({ title: '¡Actividad Superada!', description: 'Has demostrado dominio del tema. Avanzando progreso...' });
                       handleMarkAsCompleted();
                    }}
                 />
              ) : currentLesson.type === 'quiz' ? (
                <div className="max-w-2xl mx-auto"><QuizPlayer questions={effectiveQuestions || []} onComplete={handleMarkAsCompleted} /></div>
              ) : currentLesson.type === 'podcast' ? (
                <div className="max-w-4xl mx-auto">
                    {podcastData ? (
                        <PodcastPlayer 
                            podcast={{...podcastData, id: effectivePodcastId}} 
                            hasAccess={true} 
                        />
                    ) : (
                        <div className="h-64 flex items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando Podcast...</p>
                            </div>
                        </div>
                    )}
                    <div className="mt-8 flex justify-center">
                        <Button 
                            onClick={handleMarkAsCompleted}
                            className="rounded-2xl h-14 px-8 font-bold gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-100"
                        >
                            <CheckCircle className="h-5 w-5" />
                            Marcar como Completada
                        </Button>
                    </div>
                </div>
              ) : (
                <>
                  {videoSource ? (
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative group">
                      <iframe width="100%" height="100%" src={formatVideoUrl(videoSource)} title={currentLesson.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
                    </div>
                  ) : <div className="aspect-video bg-muted rounded-2xl flex flex-col items-center justify-center gap-4 text-muted-foreground border-2 border-dashed"><PlayCircle className="h-12 w-12 opacity-20" /><p>Esta lección no incluye video.</p></div>}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                      <article className="prose prose-slate max-w-none bg-card p-8 md:p-10 rounded-3xl border shadow-sm">
                        <h1 className="text-3xl font-headline font-bold mb-6">{currentLesson.title}</h1>
                        <div className="text-lg leading-relaxed text-muted-foreground space-y-6 whitespace-pre-wrap">{effectiveDescription || "Sin descripción."}</div>
                      </article>
                      
                      <LessonDiscussion courseId={courseId} lessonId={lessonId} />
                    </div>
                    <div className="space-y-6"><LessonResources courseId={courseId} moduleId={moduleId!} lessonId={lessonId} /></div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-8 pb-20 border-t">
                <Link href={`/courses/${courseId}`}><Button variant="outline" className="gap-2 h-12 rounded-xl"><ChevronLeft className="h-5 w-5" /> Volver al curso</Button></Link>
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex items-center gap-1 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-md">
                    <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-[10px] font-black tracking-widest uppercase">Premium</span>
                  </div>
                  {!isGuest && (
                    <>
                      {totalLessons > 0 && (progress?.completedLessons?.length || 0) >= totalLessons ? (
                        <Button 
                          onClick={handleFinalizeCourse}
                          disabled={progress?.status === 'completed'}
                          className="rounded-xl h-12 px-8 bg-amber-500 hover:bg-amber-600 font-bold shadow-xl shadow-amber-200 gap-2 border-2 border-white/20 animate-bounce"
                        >
                          <Award className="h-5 w-5" /> 
                          {progress?.status === 'completed' ? 'Curso Finalizado' : 'Obtener Diploma'}
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleMarkAsCompleted}
                          className={`rounded-xl h-10 px-6 font-bold shadow-lg transition-all ${progress?.completedLessons?.includes(lessonId) ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}
                        >
                          {progress?.completedLessons?.includes(lessonId) ? <><CheckCircle className="h-4 w-4 mr-2" /> Completada</> : "Marcar lección"}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <FloatingAITutor 
        lessonTitle={currentLesson.title} 
        lessonContent={effectiveDescription || ''} 
        instructorName={instructorProfile?.displayName || course.instructorName}
        instructorBio={instructorProfile?.bio}
        isDisabled={isAcademy && profile?.permissions?.canUseAI === false}
      />

      {/* Modal de Encuesta de Satisfacción */}
      <Dialog open={showSurvey} onOpenChange={setShowSurvey}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 text-center space-y-2">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary/20 mb-4">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-headline font-bold">¡Felicitaciones!</DialogTitle>
            <DialogDescription className="text-slate-600">
              Completaste <span className="font-bold text-slate-800">{course?.title}</span>. ¿Cómo fue tu experiencia?
            </DialogDescription>
          </div>
          <div className="p-8 space-y-6">
            {/* Stars */}
            <div className="text-center space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Tu calificación</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setSurveyHover(star)}
                    onMouseLeave={() => setSurveyHover(0)}
                    onClick={() => setSurveyRating(star)}
                    className="transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`h-10 w-10 transition-colors ${
                        star <= (surveyHover || surveyRating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {surveyRating > 0 && (
                <p className="text-sm font-bold text-primary animate-in fade-in">
                  {['', '😞 Muy malo', '😐 Regular', '🙂 Bien', '😊 Muy bien', '🤩 ¡Excelente!'][surveyRating]}
                </p>
              )}
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Comentario (opcional)</Label>
              <Textarea
                placeholder="¿Qué fue lo que más te gustó? ¿Qué mejorarías?"
                value={surveyComment}
                onChange={(e) => setSurveyComment(e.target.value)}
                className="rounded-2xl resize-none min-h-[80px] text-sm border-slate-200"
                maxLength={500}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1 rounded-2xl h-12 text-slate-500"
                onClick={() => setShowSurvey(false)}
              >
                Omitir
              </Button>
              <Button
                className="flex-1 rounded-2xl h-12 font-bold gap-2 shadow-lg shadow-primary/20"
                disabled={surveyRating === 0 || surveySubmitting}
                onClick={handleSubmitSurvey}
              >
                {surveySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar reseña
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LessonResources({ courseId, moduleId, lessonId }: { courseId: string, moduleId: string, lessonId: string }) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [previewResource, setPreviewResource] = useState<any>(null);
  const isGuest = !user || user.isAnonymous;

  const resourcesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId, 'resources'), orderBy('orderIndex', 'asc'));
  }, [db, courseId, moduleId, lessonId]);
  const { data: resources, isLoading } = useCollection(resourcesQuery);

  const getEmbedUrl = (url: string, type: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      let embedUrl = url;
      if (url.includes('/view')) embedUrl = url.replace(/\/view.*$/, '/preview');
      else if (url.includes('/edit')) embedUrl = url.replace(/\/edit.*$/, '/preview');
      else if (url.includes('uc?export=download&id=')) {
          const id = url.split('id=')[1]?.split('&')[0];
          embedUrl = `https://drive.google.com/file/d/${id}/preview`;
      } else if (!url.endsWith('/preview')) {
        embedUrl = url.split('?')[0].replace(/\/$/, '') + '/preview';
      }
      return embedUrl;
    }
    if (type === 'podcast' || url.includes('spotify.com') || url.includes('anchor.fm')) {
        if (url.includes('embed')) return url;
        return url
            .replace('open.spotify.com/episode/', 'open.spotify.com/embed/episode/')
            .replace('/episodes/', '/embed/episodes/');
    }
    if (type === 'word' || type === 'ppt') {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }
    return url;
  };

  if (isLoading || !resources || resources.length === 0) return null;

  return (
    <>
      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-muted/20"><h3 className="font-headline font-bold text-sm flex items-center gap-2"><Paperclip className="h-4 w-4 text-primary" /> Material de Apoyo</h3></div>
        <div className="p-3 space-y-2">
          {resources.map((res) => (
            <div key={res.id} className={`flex items-center justify-between p-3 rounded-2xl border border-transparent cursor-pointer ${!isGuest ? 'hover:bg-muted/50 hover:border-border' : 'opacity-60 grayscale'}`} onClick={() => !isGuest ? setPreviewResource(res) : toast({ variant: "destructive", title: "Acceso denegado", description: "Inicia sesión para descargar material." })}>
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-background p-2 rounded-xl shadow-sm border">
                    {res.type === 'pdf' ? <FileDown className="h-4 w-4 text-red-500" /> : res.type === 'ppt' ? <Presentation className="h-4 w-4 text-amber-500" /> : res.type === 'word' ? <FileText className="h-4 w-4 text-blue-500" /> : res.type === 'podcast' ? <Mic2 className="h-4 w-4 text-indigo-500" /> : <LinkIcon className="h-4 w-4 text-slate-500" />}
                </div>
                <p className="text-xs font-semibold truncate">{res.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={(e) => { e.stopPropagation(); window.open(res.contentUrl, '_blank'); }}><ExternalLink className="h-3 w-3" /></Button>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Dialog open={!!previewResource} onOpenChange={(open) => !open && setPreviewResource(null)}>
        <DialogContent className="max-w-[95vw] lg:max-w-6xl h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <DialogHeader className="p-4 border-b bg-white flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" /> {previewResource?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-slate-900 relative">
            <iframe 
                src={getEmbedUrl(previewResource?.contentUrl, previewResource?.type)} 
                className="w-full h-full border-none bg-white shadow-inner" 
                title={previewResource?.title} 
                allow="autoplay; encrypted-media"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModuleInSidebar({ module, courseId, activeLessonId, index, completedLessons }: { module: any, courseId: string, activeLessonId: string, index: number, completedLessons: string[] }) {
  const db = useFirestore();
  const lessonsQuery = useMemoFirebase(() => {
    if (!db || !courseId || !module.id) return null;
    return query(collection(db, 'courses', courseId, 'modules', module.id, 'lessons'), orderBy('orderIndex', 'asc'));
  }, [db, courseId, module.id]);
  const { data: lessons } = useCollection(lessonsQuery);

  return (
    <div className="border-b last:border-0 border-slate-100">
      <div className="bg-slate-50/50 px-5 py-4 font-bold text-[10px] text-slate-400 uppercase tracking-widest flex items-center justify-between">
        <span>Módulo {index + 1}: {module.title}</span>
      </div>
      <div className="divide-y divide-slate-50">
        {lessons?.map(lesson => {
          const isActive = lesson.id === activeLessonId;
          const isCompleted = completedLessons?.includes(lesson.id);
          
          return (
            <Link key={lesson.id} href={`/courses/${courseId}/learn/${lesson.id}?moduleId=${module.id}`} 
              className={`block px-5 py-4 text-sm transition-all relative ${isActive ? 'bg-primary/5 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isCompleted ? 'bg-emerald-100 text-emerald-600' : isActive ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : lesson.type === 'challenge' ? <Code2 className="h-3.5 w-3.5" /> : lesson.type === 'quiz' ? <HelpCircle className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
                  </div>
                  <span className={`truncate ${isActive ? 'font-bold' : 'font-medium'}`}>{lesson.title}</span>
                </div>
                {isCompleted && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm" />}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function LessonDiscussion({ courseId, lessonId }: { courseId: string, lessonId: string }) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  const discussionsQuery = useMemoFirebase(() => {
    if (!db || !courseId || !lessonId) return null;
    return query(
      collection(db, 'lesson_discussions'),
      where('courseId', '==', courseId),
      where('lessonId', '==', lessonId)
    );
  }, [db, courseId, lessonId]);
  
  const { data: discussions, isLoading, error } = useCollection(discussionsQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !newComment.trim()) return;
    if (user.isAnonymous) {
      toast({ variant: "destructive", title: "Acceso denegado", description: "Inicia sesión para participar." });
      return;
    }
    setIsSubmitting(true);
    try {
      const userName = profile?.displayName || user.displayName || user.email?.split('@')[0] || "Estudiante";
      const userPhotoUrl = profile?.profileImageUrl || profile?.photoURL || user.photoURL || null;
      await addDoc(collection(db, 'lesson_discussions'), {
        courseId, lessonId, userId: user.uid, userName, userPhotoUrl,
        isInstructor: profile?.role === 'instructor' || profile?.role === 'admin',
        content: newComment.trim(), upvotes: 0, replies: [], createdAt: serverTimestamp()
      });
      setNewComment("");
      toast({ title: "Publicado" });
    } catch (err) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (discussionId: string) => {
    if (!db || !user || !replyText.trim()) return;
    setIsSubmitting(true);
    try {
      const userName = profile?.displayName || user.displayName || user.email?.split('@')[0] || "Estudiante";
      const userPhotoUrl = profile?.profileImageUrl || profile?.photoURL || user.photoURL || null;
      await updateDoc(doc(db, 'lesson_discussions', discussionId), {
        replies: arrayUnion({
          content: replyText.trim(), userName, userPhotoUrl, userId: user.uid,
          isInstructor: profile?.role === 'instructor' || profile?.role === 'admin',
          createdAt: new Date().toISOString()
        })
      });
      setReplyText("");
      setReplyingToId(null);
      toast({ title: "Respuesta publicada" });
    } catch (err) {
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (discussionId: string) => {
    if (!db || !window.confirm("¿Estás seguro de eliminar este mensaje?")) return;
    try {
      await deleteDoc(doc(db, 'lesson_discussions', discussionId));
      toast({ title: "Mensaje eliminado correctamente." });
    } catch (err) {
      console.error("Error deleting discussion:", err);
      toast({ variant: "destructive", title: "Error al eliminar" });
    }
  };

  const sortedDiscussions = useMemo(() => {
    if (!discussions) return [];
    return [...discussions].sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });
  }, [discussions]);

  const visibleDiscussions = showAllHistory ? sortedDiscussions : sortedDiscussions.slice(0, 5);

  if (isLoading) return <div className="p-8 text-center animate-pulse"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;

  if (error) return (
      <div className="bg-rose-50 p-8 rounded-3xl border-2 border-rose-100 text-center space-y-4">
        <ShieldAlert className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="font-bold text-rose-900">Error de Conexión</h3>
        <p className="text-sm text-rose-600">Revisa los índices de Firestore en la consola.</p>
      </div>
  );

  return (
    <div className="bg-card p-8 md:p-10 rounded-3xl border shadow-sm space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary"><MessageSquare className="h-6 w-6" /></div>
        <div>
          <h2 className="text-2xl font-headline font-bold">Comunidad y Dudas</h2>
          <p className="text-sm text-muted-foreground">{discussions?.length || 0} mensajes</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea placeholder="¿Dudas con el código? Pregunta aquí..." className="rounded-2xl bg-slate-50/50" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
        <div className="flex justify-end"><Button type="submit" disabled={!newComment.trim() || isSubmitting} className="rounded-xl font-bold">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar duda"}</Button></div>
      </form>

      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {discussions?.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-3xl"><p className="text-slate-400">Sin comentarios aún.</p></div>
        ) : (
          visibleDiscussions?.map((d: any) => (
            <div key={d.id} className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  {d.userPhotoUrl ? <img src={d.userPhotoUrl} className="w-10 h-10 rounded-full border" /> : <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center"><UserCircle2 className="h-6 w-6 text-slate-400" /></div>}
                  <div>
                    <div className="flex items-center gap-2"><span className="font-bold text-sm text-slate-900">{d.userName}</span>{d.isInstructor && <Badge className="text-[8px] px-1 h-4">Instructor</Badge>}</div>
                    <p className="text-slate-600 text-sm mt-1">{d.content}</p>
                  </div>
                </div>
                {(user?.uid === d.userId || profile?.role === 'admin') && <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500" onClick={() => handleDelete(d.id)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
              
              <div className="flex gap-4 pl-14">
                <button onClick={async () => { if(!db||!user||user.isAnonymous) return; await updateDoc(doc(db,'lesson_discussions',d.id),{upvotes:increment(1)}); }} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-primary"><ThumbsUp className="h-3.5 w-3.5" />{d.upvotes||0}</button>
                <button onClick={() => setReplyingToId(replyingToId === d.id ? null : d.id)} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-primary"><MessageCircleMore className="h-3.5 w-3.5" /> Responder</button>
              </div>

              {(d.replies?.length > 0 || replyingToId === d.id) && (
                <div className="pl-14 space-y-3 pt-2">
                  {d.replies?.map((r: any, idx: number) => (
                    <div key={idx} className="flex gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100 animate-in slide-in-from-left-2">
                      {r.userPhotoUrl ? <img src={r.userPhotoUrl} className="w-6 h-6 rounded-full border" /> : <UserCircle2 className="h-6 w-6 text-slate-300" />}
                      <div><div className="flex items-center gap-1.5"><span className="text-[11px] font-bold">{r.userName}</span>{r.isInstructor && <Badge className="h-3 text-[7px] px-1 bg-emerald-500">Instructor</Badge>}</div><p className="text-[11px] text-slate-600 mt-0.5">{r.content}</p></div>
                    </div>
                  ))}
                  {replyingToId === d.id && (
                    <div className="space-y-2 pt-2">
                      <Textarea placeholder="Responder..." className="min-h-[60px] text-xs p-3 rounded-xl border-primary/20" value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                      <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setReplyingToId(null)}>Cancelar</Button><Button size="sm" className="h-7 text-[10px] px-3 font-bold" disabled={!replyText.trim() || isSubmitting} onClick={() => handleReply(d.id)}>{isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Responder"}</Button></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {discussions && discussions.length > 5 && (
        <div className="text-center pt-4"><Button variant="outline" size="sm" onClick={() => setShowAllHistory(!showAllHistory)} className="rounded-xl font-bold gap-2"><History className="h-3.5 w-3.5" /> {showAllHistory ? "Ver menos" : `Ver anteriores (${discussions.length-5})`}</Button></div>
      )}
    </div>
  );
}

function EmbeddedChallenge({ challengeId, onComplete }: { challengeId: string, onComplete: () => void }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const db = useFirestore();
  const [premiumData, setPremiumData] = useState<any>(null);
  const [isLoadingPremium, setIsLoadingPremium] = useState(false);

  const challengeRef = useMemoFirebase(() => {
    if (!db || !challengeId) return null;
    return doc(db, 'coding_challenges', challengeId);
  }, [db, challengeId]);
  
  const { data: challenge, isLoading } = useDoc(challengeRef);

  useEffect(() => {
    async function fetchPremiumData() {
      if (!db || !challengeId) return;
      setIsLoadingPremium(true);
      try {
        const premiumRef = doc(db, 'coding_challenges', challengeId, 'premium', 'data');
        const snap = await getDoc(premiumRef);
        if (snap.exists()) {
          setPremiumData(snap.data());
        }
      } catch (err) {
        console.error("Error fetching premium challenge data in course context:", err);
      } finally {
        setIsLoadingPremium(false);
      }
    }
    fetchPremiumData();
  }, [db, challengeId]);

  if (isLoading || isLoadingPremium) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!challenge) return <div className="p-12 text-center text-slate-500">No se encontró la actividad.</div>;

  const h5pTypes = ['flashcard', 'sortable', 'dragdrop', 'interactive-video', 'swipe', 'wordsearch'];
  
  // Fusionamos la metadata con los datos técnicos (premium)
  const fullChallenge = { ...challenge, ...premiumData };

  if (h5pTypes.includes(challenge.type)) {
     return (
       <div className="max-w-4xl mx-auto w-full animate-in zoom-in-95 duration-500">
         <div className="mb-8 text-center space-y-2">
            <Badge variant="secondary" className="bg-fuchsia-100 text-fuchsia-700 font-bold border-fuchsia-200">Actividad Interactiva Gamificada</Badge>
            <h2 className="text-3xl font-headline font-bold text-slate-900">{challenge.title}</h2>
            {challenge.description && <p className="text-muted-foreground">{challenge.description}</p>}
         </div>
         <div className="bg-white rounded-[3rem] p-6 shadow-sm border border-slate-100">
           {challenge.type === 'flashcard' && <FlipFlashcards cards={fullChallenge.cards || []} onComplete={onComplete} />}
           {challenge.type === 'sortable' && (
             <SortableCodeBlocks 
               lines={[...(fullChallenge.lines||[])].sort(()=>Math.random()-0.5)} 
               correctOrder={fullChallenge.correctOrder || []} 
               onComplete={(score) => {
                 if (score === 5) onComplete();
                 else toast({ title: "Algoritmo Incorrecto", description: "Revisa el orden de las líneas e intenta de nuevo.", variant: "destructive" });
               }} 
             />
           )}
           {challenge.type === 'dragdrop' && (
             <DragDropSnippets 
               template={fullChallenge.template || ""} 
               snippets={fullChallenge.snippets||[]} 
               correctMapping={fullChallenge.correctMapping||{}} 
               onComplete={(score) => {
                 if (score === 5) onComplete();
                 else toast({ title: "Código Incompleto", description: "Asegúrate de llenar todos los espacios correctamente.", variant: "destructive" });
               }} 
             />
           )}
           {challenge.type === 'interactive-video' && <InteractiveVideo url={fullChallenge.videoUrl || ""} checkpoints={fullChallenge.checkpoints||[]} onComplete={onComplete} />}
           {challenge.type === 'swipe' && <SwipeCards deck={fullChallenge.deck||[]} onComplete={onComplete}/>}
           {challenge.type === 'wordsearch' && <WordSearchGame words={fullChallenge.words||[]} onComplete={onComplete}/>}
         </div>
       </div>
     );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-[3rem] border shadow-sm text-center space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="bg-primary/10 p-8 rounded-[2rem] shadow-inner"><Code2 className="h-16 w-16 text-primary" /></div>
      <div className="space-y-3 max-w-lg">
        <Badge variant="secondary" className="px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-primary/5 text-primary">Desafío con Editor / Entrevista IA</Badge>
        <h2 className="text-3xl font-headline font-bold text-slate-900">{challenge.title}</h2>
        <p className="text-muted-foreground leading-relaxed">Esta lección consiste en un reto de programación o entrevista con IA en vivo.</p>
      </div>
      <Link href={`/challenges/${challenge.id}?courseId=${params.id}&lessonId=${params.lessonId}&moduleId=${searchParams.get('moduleId')}`}>
        <Button className="h-16 px-12 rounded-[1.5rem] text-xl font-bold gap-3 shadow-2xl shadow-primary/30 group">
          <PlayCircle className="h-6 w-6 group-hover:scale-110 transition-transform" /> 
          Aceptar Desafío 
          <ArrowRight className="h-5 w-5 ml-1" />
        </Button>
      </Link>
    </div>
  );
}
