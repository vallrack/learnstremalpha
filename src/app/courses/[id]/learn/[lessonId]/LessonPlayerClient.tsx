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
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUser, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy, serverTimestamp, setDoc, where, updateDoc, arrayUnion, getDoc, getDocs, addDoc, increment, deleteDoc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
  const [surveyName, setSurveyName] = useState('');
  const [surveySubmitting, setSurveySubmitting] = useState(false);

  const courseId = params.id as string;
  const lessonId = params.lessonId as string;
  const moduleId = searchParams.get('moduleId') ?? '';

  useEffect(() => {
    if (profile?.displayName) {
      setSurveyName(profile.displayName);
    }
  }, [profile]);

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
  const [totalAccessibleLessons, setTotalAccessibleLessons] = useState(0);

  const instructorRef = useMemoFirebase(() => {
    if (!db || !course?.instructorId) return null;
    return doc(db, 'users', course.instructorId);
  }, [db, course?.instructorId]);
  const { data: instructorProfile } = useDoc(instructorRef);

  // Calcular total de lecciones del curso para la barra de progreso
  useEffect(() => {
    if (!db || !courseId || !modules || isUserLoading) return;
    const fetchCounts = async () => {
      if (!db) return;
      let totalGlobal = 0;
      let totalAccessible = 0;
      
      for (const mod of modules) {
        const q = query(collection(db, 'courses', courseId, 'modules', mod.id, 'lessons'));
        const snap = await getDocs(q);
        const lessonsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        totalGlobal += lessonsData.length;
        
        for (const lesson of lessonsData) {
          const isLessonPremium = !!(lesson as any).isPremium;
          const isModulePremium = !!mod.isPremium;
          const isPaidActivity = (isLessonPremium && ((lesson as any).price || 0) > 0) || (isModulePremium && (mod.price || 0) > 0);
          
          let hasAccess = false;
          if (profile?.role === 'admin' || user?.uid === course?.instructorId) {
            hasAccess = true;
          } else if (isPaidActivity) {
            const hasPurchased = (profile?.purchasedCourses?.includes(courseId)) || (profile?.purchasedModules?.includes(mod.id)) || (profile?.purchasedLessons?.includes(lesson.id));
            hasAccess = hasPurchased || profile?.isPremiumSubscriber;
          } else {
            hasAccess = course?.isFree || (profile?.purchasedCourses?.includes(courseId)) || profile?.isPremiumSubscriber || progress?.status === 'enrolled';
          }

          if (hasAccess) {
            totalAccessible++;
          }
        }
      }
      setTotalLessons(totalGlobal);
      setTotalAccessibleLessons(totalAccessible);
    };
    fetchCounts();
  }, [db, courseId, modules, profile, user?.uid, course?.instructorId, course?.isFree, isUserLoading, progress?.status]);

  const handleMarkAsCompleted = async () => {
    if (!db || !user || user.isAnonymous || !courseId || !lessonId) {
      if (user?.isAnonymous) toast({ variant: "destructive", title: "Inicia sesión", description: "Debes estar registrado para guardar tu progreso." });
      return;
    }
    
    const currentCompleted = progress?.completedLessons || [];
    const isAlreadyCompleted = currentCompleted.includes(lessonId);

    if (!isAlreadyCompleted) {
      const total = totalAccessibleLessons || course?.totalLessons || totalLessons;
      const newCount = currentCompleted.length + 1;
      const percentage = total > 0 ? Math.min(100, Math.round((newCount / total) * 100)) : 0;

      await setDoc(progressRef!, {
        courseId,
        completedLessons: arrayUnion(lessonId),
        lastLessonId: lessonId,
        progressPercentage: percentage,
        updatedAt: serverTimestamp(),
        status: 'in-progress'
      }, { merge: true });
      
      toast({ title: "¡Lección completada!", description: `Progreso: ${percentage}%` });
      router.refresh();
    }
  };

  const handleFinalizeCourse = async () => {
      if (!db || !user || !progressRef) return;
      
      await updateDoc(progressRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        progressPercentage: 100
      });

      updateDocumentNonBlocking(doc(db, 'users', user.uid), {
        xp: increment(500)
      });

      const certRef = doc(db, 'certificates', `${user.uid}_${courseId}`);
      const isFullCertificate = (progress?.completedLessons?.length || 0) >= totalLessons && totalLessons > 0;
      
      await setDoc(certRef, {
        userId: user.uid,
        courseId,
        studentName: profile?.displayName || user.email?.split('@')[0] || 'Estudiante',
        courseTitle: course?.title || 'Curso',
        technology: course?.technology || 'General',
        instructorName: course?.instructorName || 'Instructor',
        issuedAt: serverTimestamp(),
        isValid: true,
        type: isFullCertificate ? 'full' : 'basic',
        totalLessons: totalLessons,
        completedLessonsCount: progress?.completedLessons?.length || 0,
      }, { merge: true });

      const { sendCertificateAction } = await import('@/app/actions/email');
      await sendCertificateAction(user!.uid, courseId);

      toast({ 
        title: "¡Felicidades!", 
        description: "Has finalizado el curso y tu certificado está listo.",
        action: (
          <Button variant="outline" size="sm" onClick={() => router.push(`/courses/${courseId}/certificate`)}>
            Ver Certificado
          </Button>
        )
      });
      
      setTimeout(() => {
        setShowSurvey(true);
      }, 1500);
  };

  const handleSubmitSurvey = async () => {
    if (!db || !user || surveyRating === 0) return;
    setSurveySubmitting(true);
    try {
      // Actualizar el displayName del usuario si lo cambió en la encuesta
      if (surveyName.trim() && surveyName !== profile?.displayName) {
        await updateDoc(doc(db, 'users', user.uid), {
          displayName: surveyName.trim()
        });
      }

      await setDoc(doc(db, 'reviews', courseId, 'ratings', user.uid), {
        userId: user.uid,
        courseId,
        rating: surveyRating,
        comment: surveyComment.trim(),
        displayName: surveyName.trim() || profile?.displayName || user.email?.split('@')[0] || 'Estudiante',
        profileImageUrl: profile?.profileImageUrl || profile?.photoURL || null,
        createdAt: serverTimestamp(),
      });
      toast({ title: '¡Gracias por tu reseña!', description: 'Tu opinión ayuda a mejorar la calidad del curso.' });
      router.refresh();
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar tu reseña. Intenta más tarde.' });
    } finally {
      setSurveySubmitting(false);
      setShowSurvey(false);
      setSurveyRating(0);
      setSurveyComment('');
    }
  };

  const isAcademy = profile?.role === 'academy' || false;
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
    const isEnrolledInCollection = progress?.status === 'enrolled';
    return (courseId && profile.purchasedCourses?.includes(courseId)) || profile.isPremiumSubscriber || isEnrolledInCollection;
  }, [user, profile, courseId, isUserLoading, progress]);

  const isPaidActivity = useMemo(() => {
    return (isLessonPremium && (currentLesson?.price || 0) > 0) || (isModulePremium && (currentModule?.price || 0) > 0);
  }, [isLessonPremium, currentLesson, isModulePremium, currentModule]);

  const hasValidAccess = useMemo(() => {
    if (isUserLoading || isCourseLoading) return true;
    if (profile?.role === 'admin' || isAuthor) return true;
    if (!course) return false;
    if (isPaidActivity) {
      return hasPurchased || profile?.isPremiumSubscriber || profile?.role === 'admin';
    }
    return isFreeCourse || isEnrolled || isPremium;
  }, [course, isEnrolled, isPremium, profile, isUserLoading, isCourseLoading, isFreeCourse, isAuthor, isPaidActivity, hasPurchased]);

  const finalizedAccess = useMemo(() => {
    if (isUserLoading || isCourseLoading) return true; 
    if (profile?.role === 'admin') return true;
    return hasValidAccess;
  }, [hasValidAccess, isUserLoading, isCourseLoading, profile]);

  const isClosed = useMemo(() => {
    if (!course) return false;
    if (profile?.role === 'admin') return false; 
    if (course.isArchived) return true;
    if (course.closingDate) {
      const closing = course.closingDate?.toDate?.() || new Date(course.closingDate);
      return closing < new Date();
    }
    return false;
  }, [course, profile]);

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
          <div className="flex flex-col sm:flex-row gap-4">
            {!user ? (
              <Button onClick={() => router.push('/login')} className="rounded-2xl h-14 px-8 bg-primary hover:bg-primary/90 font-bold shadow-xl shadow-primary/10">Iniciar Sesión Gratis</Button>
            ) : (
              <Button variant="outline" onClick={() => router.push(`/courses/${courseId}`)} className="rounded-2xl h-14 px-8 text-lg font-bold">Ver Contenido Libre</Button>
            )}
            <Button onClick={() => router.push(`/checkout?courseId=${courseId}`)} className="rounded-2xl h-14 px-8 bg-amber-500 hover:bg-amber-600 font-bold shadow-lg shadow-amber-200">Obtener Acceso</Button>
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
                    {totalAccessibleLessons > 0 ? Math.round(((progress?.completedLessons?.length || 0) / totalAccessibleLessons) * 100) : 0}%
                </span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
                <div 
                    className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                    style={{ width: `${totalAccessibleLessons > 0 ? Math.min(100, Math.round(((progress?.completedLessons?.length || 0) / totalAccessibleLessons) * 100)) : 0}%` }}
                />
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                {progress?.completedLessons?.length || 0} de {totalAccessibleLessons} lecciones completadas
            </p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {modules?.map((module, i) => (
              <ModuleInSidebar key={module.id} module={module} courseId={courseId} activeLessonId={lessonId} index={i} completedLessons={progress?.completedLessons || []} />
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 bg-[#F1F0F4]/30">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {currentLesson.type === 'challenge' ? (
                 <EmbeddedChallenge 
                    challengeId={effectiveChallengeId}
                    onComplete={() => { if (!isClosed) handleMarkAsCompleted(); }}
                 />
              ) : currentLesson.type === 'quiz' ? (
                 <QuizPlayer questions={effectiveQuestions || []} onComplete={isClosed ? () => {} : handleMarkAsCompleted} />
              ) : currentLesson.type === 'podcast' ? (
                 <div className="max-w-4xl mx-auto">
                    {podcastData && <PodcastPlayer podcast={{...podcastData, id: effectivePodcastId}} hasAccess={true} />}
                    <div className="mt-8 flex justify-center"><Button onClick={handleMarkAsCompleted} className="rounded-2xl h-14 px-8 font-bold gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"><CheckCircle className="h-5 w-5" /> Marcar como Completada</Button></div>
                 </div>
              ) : (
                <>
                  {videoSource ? (
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative group">
                      <iframe width="100%" height="100%" src={formatVideoUrl(videoSource)} title={currentLesson.title} frameBorder="0" allowFullScreen></iframe>
                    </div>
                  ) : <div className="aspect-video bg-muted rounded-2xl flex flex-col items-center justify-center gap-4 text-muted-foreground border-2 border-dashed"><PlayCircle className="h-12 w-12 opacity-20" /><p>Sin video.</p></div>}
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
                  {!isGuest && (
                    <>
                      {totalAccessibleLessons > 0 && (progress?.completedLessons?.length || 0) >= totalAccessibleLessons ? (
                        <Button 
                          onClick={handleFinalizeCourse}
                          disabled={progress?.status === 'completed'}
                          className="rounded-xl h-12 px-8 bg-amber-500 hover:bg-amber-600 font-bold shadow-xl shadow-amber-200 gap-2 border-2 border-white/20 animate-bounce"
                        >
                          <Award className="h-5 w-5" /> {progress?.status === 'completed' ? 'Curso Finalizado' : 'Obtener Diploma'}
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleMarkAsCompleted}
                          disabled={isClosed || progress?.completedLessons?.includes(lessonId)}
                          className={`rounded-xl h-10 px-6 font-bold shadow-lg ${progress?.completedLessons?.includes(lessonId) ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-primary hover:bg-primary/90 shadow-primary/20'}`}
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
      <FloatingAITutor lessonTitle={currentLesson.title} lessonContent={effectiveDescription || ''} instructorName={instructorProfile?.displayName || course.instructorName} />

      <Dialog open={showSurvey} onOpenChange={setShowSurvey}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-0 overflow-hidden">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8 text-center space-y-2">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary/20 mb-4"><Award className="h-8 w-8 text-primary" /></div>
            <DialogTitle className="text-2xl font-headline font-bold">¡Felicitaciones!</DialogTitle>
            <DialogDescription className="text-slate-600">¿Cómo fue tu experiencia en <span className="font-bold text-slate-800">{course?.title}</span>?</DialogDescription>
          </div>
          <div className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Calificación</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onMouseEnter={() => setSurveyHover(star)} onMouseLeave={() => setSurveyHover(0)} onClick={() => setSurveyRating(star)} className="transition-transform hover:scale-125 focus:outline-none">
                    <Star className={`h-10 w-10 transition-colors ${star <= (surveyHover || surveyRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Tu Nombre Completo</Label>
                <Input placeholder="Ingresa tu nombre" value={surveyName} onChange={(e) => setSurveyName(e.target.value)} className="rounded-2xl text-sm border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Reseña Pública (opcional)</Label>
                <Textarea placeholder="Cuéntanos qué te pareció el curso..." value={surveyComment} onChange={(e) => setSurveyComment(e.target.value)} className="rounded-2xl resize-none min-h-[80px] text-sm border-slate-200" maxLength={500} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 rounded-2xl h-12 text-slate-500" onClick={() => setShowSurvey(false)}>Omitir</Button>
              <Button className="flex-1 rounded-2xl h-12 font-bold gap-2 shadow-lg shadow-primary/20" disabled={surveyRating === 0 || surveySubmitting} onClick={handleSubmitSurvey}>
                {surveySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModuleInSidebar({ module, courseId, activeLessonId, index, completedLessons }: { module: any, courseId: string, activeLessonId: string, index: number, completedLessons: string[] }) {
  const db = useFirestore();
  const lessonsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'courses', courseId, 'modules', module.id, 'lessons'), orderBy('orderIndex', 'asc'));
  }, [db, courseId, module.id]);
  const { data: lessons } = useCollection(lessonsQuery);

  return (
    <div className="border-b last:border-b-0">
      <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulo {index + 1}</span>
        {module.isPremium && <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-none text-[8px] font-black uppercase tracking-tighter h-4 px-1.5">Premium</Badge>}
      </div>
      <div className="p-2 space-y-1">
        {lessons?.map((lesson) => (
          <Link key={lesson.id} href={`/courses/${courseId}/learn/${lesson.id}?moduleId=${module.id}`}>
            <div className={`group flex items-center gap-3 p-3 rounded-2xl transition-all ${lesson.id === activeLessonId ? 'bg-primary/5 text-primary' : 'hover:bg-slate-50 text-slate-600'}`}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border-2 transition-colors ${lesson.id === activeLessonId ? 'bg-primary border-primary text-white' : completedLessons.includes(lesson.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-100 group-hover:border-slate-200'}`}>
                {completedLessons.includes(lesson.id) ? <CheckCircle className="h-4 w-4" /> : lesson.type === 'challenge' ? <Code2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate leading-none mb-1">{lesson.title}</p>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{lesson.duration || '5 min'}</span>
                    {lesson.isPremium && <Lock className="h-2.5 w-2.5 text-amber-500" />}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LessonResources({ courseId, moduleId, lessonId }: { courseId: string, moduleId: string, lessonId: string }) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isGuest = !user || user.isAnonymous;

  const resourcesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId, 'resources'), orderBy('orderIndex', 'asc'));
  }, [db, courseId, moduleId, lessonId]);
  const { data: resources, isLoading } = useCollection(resourcesQuery);

  if (isLoading || !resources || resources.length === 0) return null;

  return (
    <>
      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-muted/20"><h3 className="font-headline font-bold text-sm flex items-center gap-2"><Paperclip className="h-4 w-4 text-primary" /> Material</h3></div>
        <div className="p-3 space-y-2">
          {resources.map((res) => (
            <div key={res.id} className="flex items-center justify-between p-3 rounded-2xl border hover:bg-muted/50 cursor-pointer" onClick={() => !isGuest ? window.open(res.contentUrl, '_blank') : toast({ variant: "destructive", title: "Inicia sesión" })}>
              <div className="flex items-center gap-3"><div className="bg-background p-2 rounded-xl border"><FileDown className="h-4 w-4 text-red-500" /></div><p className="text-xs font-semibold truncate">{res.title}</p></div>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function LessonDiscussion({ courseId, lessonId }: { courseId: string, lessonId: string }) {
  const db = useFirestore();
  const { user, profile } = useUser();
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const discussionsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'lesson_discussions'), where('lessonId', '==', lessonId), orderBy('createdAt', 'desc'));
  }, [db, lessonId]);
  const { data: discussions } = useCollection(discussionsQuery);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'lesson_discussions'), {
        courseId,
        lessonId,
        userId: user.uid,
        userName: profile?.displayName || user.email?.split('@')[0] || 'Estudiante',
        userPhoto: profile?.profileImageUrl || profile?.photoURL || null,
        content: newComment.trim(),
        createdAt: serverTimestamp(),
      });
      setNewComment('');
      toast({ title: "Comentario publicado" });
    } catch {
      toast({ variant: 'destructive', title: "Error al publicar" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-headline font-bold flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary" /> Foro de la lección</h3>
        <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-bold">{discussions?.length || 0} dudas</Badge>
      </div>
      <form onSubmit={handleSubmitComment} className="space-y-4 bg-white p-6 rounded-3xl border shadow-sm">
        <Textarea placeholder="¿Tienes alguna duda sobre este tema? Escribe aquí..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="rounded-2xl resize-none min-h-[100px] border-slate-200 focus:ring-primary" />
        <div className="flex justify-end"><Button type="submit" disabled={!newComment.trim() || isSubmitting} className="rounded-xl font-bold">{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar duda"}</Button></div>
      </form>
      <div className="space-y-6">
        {discussions?.map((disc) => (
          <div key={disc.id} className="flex gap-4 p-6 bg-white rounded-3xl border shadow-sm transition-all hover:shadow-md">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0">
                {disc.userPhoto ? <img src={disc.userPhoto} alt={disc.userName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">{disc.userName?.[0]}</div>}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2"><p className="text-sm font-bold text-slate-900">{disc.userName}</p><p className="text-[10px] text-slate-400 font-medium">Hace un momento</p></div>
              <p className="text-slate-600 text-sm leading-relaxed">{disc.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmbeddedChallenge({ challengeId, onComplete }: { challengeId: string, onComplete: () => void }) {
  const db = useFirestore();
  const challengeRef = useMemoFirebase(() => {
    if (!db || !challengeId) return null;
    return doc(db, 'coding_challenges', challengeId);
  }, [db, challengeId]);
  const { data: challenge } = useDoc(challengeRef);
  const router = useRouter();

  if (!challenge) return <div className="h-64 flex items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
       <div className="bg-slate-900 rounded-[3rem] p-8 text-white flex flex-col md:flex-row items-center gap-8 border-b-8 border-slate-800">
          <div className="w-20 h-20 bg-primary/20 rounded-[2rem] flex items-center justify-center shrink-0 border border-primary/30"><Code2 className="h-10 w-10 text-primary" /></div>
          <div className="text-center md:text-left flex-1">
             <h2 className="text-2xl md:text-3xl font-headline font-bold mb-2">Desafío: {challenge.title}</h2>
             <p className="text-slate-400 text-sm">{challenge.description}</p>
          </div>
          <Button onClick={() => router.push(`/challenges/${challengeId}`)} className="rounded-2xl h-14 px-8 bg-primary hover:bg-primary/90 font-bold shadow-xl shadow-primary/40 gap-2">Abrir Laboratorio <ArrowRight className="h-5 w-5" /></Button>
       </div>
    </div>
  );
}
