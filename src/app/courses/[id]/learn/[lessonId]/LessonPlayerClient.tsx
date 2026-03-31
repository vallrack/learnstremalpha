
'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { QuizPlayer } from '@/components/challenges/QuizPlayer';
import { FlipFlashcards } from '@/components/challenges/FlipFlashcards';
import { SortableCodeBlocks } from '@/components/challenges/SortableCodeBlocks';
import { WordSearchGame } from '@/components/challenges/WordSearchGame';
import { InteractiveVideo } from '@/components/challenges/InteractiveVideo';
import { DragDropSnippets } from '@/components/challenges/DragDropSnippets';
import { SwipeCards } from '@/components/challenges/SwipeCards';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  CheckCircle, 
  Menu, 
  Loader2, 
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
  MessageSquare,
  ThumbsUp,
  UserCircle2,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { useState, Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/currency';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';
import { FloatingAITutor } from '@/components/ai/FloatingAITutor';

export default function LessonPlayerClient() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <LessonPlayerContent />
    </Suspense>
  );
}

function LessonPlayerContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  // --- Encuesta de satisfacción ---
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyRating, setSurveyRating] = useState(0);
  const [surveyHover, setSurveyHover] = useState(0);
  const [surveyComment, setSurveyComment] = useState('');
  const [surveySubmitting, setSurveySubmitting] = useState(false);

  const courseId = params.id as string;
  const lessonId = params.lessonId as string;
  const moduleId = searchParams.get('moduleId');

  const courseRef = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return doc(db, 'courses', courseId);
  }, [db, courseId]);
  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);

  const lessonRef = useMemoFirebase(() => {
    if (!db || !courseId || !moduleId || !lessonId) return null;
    return doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId);
  }, [db, courseId, moduleId, lessonId]);
  const { data: currentLesson, isLoading: isLessonLoading } = useDoc(lessonRef);
  
  const moduleRef = useMemoFirebase(() => {
    if (!db || !courseId || !moduleId) return null;
    return doc(db, 'courses', courseId, 'modules', moduleId);
  }, [db, courseId, moduleId]);
  const { data: currentModule, isLoading: isModuleLoading } = useDoc(moduleRef);

  const modulesQuery = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return query(collection(db, 'courses', courseId, 'modules'), orderBy('orderIndex', 'asc'));
  }, [db, courseId]);
  const { data: modules, isLoading: isModulesLoading } = useCollection(modulesQuery);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  const handleMarkAsCompleted = async () => {
    if (!db || !user || user.isAnonymous || !courseId) return;
    const progressRef = doc(db, 'users', user.uid, 'courseProgress', courseId);
    setDocumentNonBlocking(progressRef, {
      courseId,
      status: 'completed',
      completedAt: serverTimestamp(),
      progressPercentage: 100,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Crear Certificado Verificable Oficial
    const certRef = doc(db, 'certificates', `${user.uid}_${courseId}`);
    setDocumentNonBlocking(certRef, {
      userId: user.uid,
      courseId,
      studentName: profile?.displayName || user.email?.split('@')[0] || 'Estudiante',
      courseTitle: course?.title || 'Curso',
      technology: course?.technology || 'General',
      instructorName: course?.instructorName || 'Instructor',
      issuedAt: serverTimestamp(),
      isValid: true,
    }, { merge: true });

    // Enviar certificado por correo
    const { sendCertificateAction } = await import('@/app/actions/email');
    sendCertificateAction(user.uid, courseId);

    toast({
      title: "¡Lección completada!",
      description: "Tu progreso ha sido guardado.",
      action: <Button size="sm" className="gap-2" onClick={() => router.push(`/courses/${courseId}/certificate`)}><Award className="h-4 w-4" /> Certificado</Button>,
    });

    // Abrir encuesta de satisfacción
    setShowSurvey(true);
  };

  const handleSubmitSurvey = async () => {
    if (!db || !user || surveyRating === 0) return;
    setSurveySubmitting(true);
    try {
      const profile = (await import('firebase/firestore').then(m => m.getDoc(doc(db, 'users', user.uid)))).data();
      await setDoc(doc(db, 'reviews', courseId, 'ratings', user.uid), {
        userId: user.uid,
        courseId,
        rating: surveyRating,
        comment: surveyComment.trim(),
        displayName: profile?.displayName || user.email?.split('@')[0] || 'Estudiante',
        profileImageUrl: profile?.profileImageUrl || profile?.photoURL || null,
        createdAt: serverTimestamp(),
      });
      toast({ title: '¡Gracias por tu reseña!', description: 'Tu opinión ayuda a mejorar la calidad del curso.' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar tu reseña. Intenta más tarde.' });
    } finally {
      setSurveySubmitting(false);
      setShowSurvey(false);
      setSurveyRating(0);
      setSurveyComment('');
    }
  };

  if (isCourseLoading || isLessonLoading || isModulesLoading || isModuleLoading) {
    return <div className="h-screen flex flex-col items-center justify-center gap-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-muted-foreground animate-pulse font-medium">Cargando lección...</p></div>;
  }

  if (!course || !currentLesson) return <div className="h-screen flex items-center justify-center">No encontrado</div>;

  const isAcademy = profile?.role === 'academy';
  const isAcademyActive = isAcademy && profile?.subscription?.status === 'active';
  const isPremium = profile?.role === 'admin' || !!profile?.isPremiumSubscriber || isAcademyActive;
  const isAuthor = user?.uid === course.instructorId;
  const hasPurchasedCourse = profile?.purchasedCourses?.includes(courseId);
  const hasPurchasedModule = profile?.purchasedModules?.includes(moduleId || '');
  const hasPurchasedLesson = profile?.purchasedLessons?.includes(lessonId);
  
  const hasPurchased = hasPurchasedCourse || hasPurchasedModule || hasPurchasedLesson;
  const isFreeCourse = course.isFree === true;
  const isLessonPremium = !!currentLesson.isPremium;
  const isModulePremium = !!currentModule?.isPremium;
  const isGuest = !user || user.isAnonymous;

  // Acceso permitido si:
  // 1. Eres Administrador o el Autor del curso.
  // 2. Tienes una suscripción Premium activa o ya compraste este curso específico.
  // 3. Es un curso Gratis Y la lección/módulo NO es Premium.
  const hasValidAccess = isPremium || isAuthor || hasPurchased || (isFreeCourse && !isLessonPremium && !isModulePremium);

  // Bloqueo total si es Premium (lección o módulo) y no tienes acceso especial
  const finalizedAccess = (isLessonPremium || isModulePremium) ? (isPremium || isAuthor || hasPurchased) : hasValidAccess;

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

  const videoSource = currentLesson.videoUrl || (currentLesson.title.startsWith('http') ? currentLesson.title : null);

  const formatVideoUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
    if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('/').pop()?.split('?')[0]}`;
    return url;
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden relative">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <aside className="hidden lg:flex w-80 border-r bg-card flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b flex items-center justify-between bg-muted/20">
            <h2 className="font-headline font-bold text-sm truncate">{course.title}</h2>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Menu className="h-4 w-4" /></Button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {modules?.map((module, i) => (
              <ModuleInSidebar key={module.id} module={module} courseId={courseId} activeLessonId={lessonId} index={i} />
            ))}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 bg-[#F1F0F4]/30">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {currentLesson.type === 'challenge' ? (
                 <EmbeddedChallenge 
                    challengeId={currentLesson.challengeId}
                    onComplete={() => {
                       toast({ title: '¡Actividad Superada!', description: 'Has demostrado dominio del tema. Avanzando progreso...' });
                       handleMarkAsCompleted();
                    }}
                 />
              ) : currentLesson.type === 'quiz' ? (
                <div className="max-w-2xl mx-auto"><QuizPlayer questions={currentLesson.questions || []} onComplete={handleMarkAsCompleted} /></div>
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
                        <div className="text-lg leading-relaxed text-muted-foreground space-y-6 whitespace-pre-wrap">{currentLesson.description || "Sin descripción."}</div>
                      </article>
                      
                      <LessonDiscussion courseId={courseId} lessonId={lessonId} />
                    </div>
                    <div className="space-y-6"><LessonResources courseId={courseId} moduleId={moduleId!} lessonId={lessonId} /></div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-8 pb-20 border-t">
                <Link href={`/courses/${courseId}`}><Button variant="outline" className="gap-2 h-12 rounded-xl"><ChevronLeft className="h-5 w-5" /> Volver al curso</Button></Link>
                {currentLesson.type !== 'challenge' && currentLesson.type !== 'quiz' && (
                  <Button className="h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 gap-2 font-bold shadow-lg shadow-emerald-100" onClick={handleMarkAsCompleted}><CheckCircle className="h-5 w-5" /> Marcar como completada</Button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      <FloatingAITutor 
        lessonTitle={currentLesson.title} 
        lessonContent={currentLesson.description || ''} 
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
      else if (!url.endsWith('/preview')) {
        embedUrl = url.split('?')[0].replace(/\/$/, '') + '/preview';
      }
      return embedUrl;
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
                    {res.type === 'pdf' ? <FileDown className="h-4 w-4 text-red-500" /> : res.type === 'ppt' ? <Presentation className="h-4 w-4 text-amber-500" /> : res.type === 'word' ? <FileText className="h-4 w-4 text-blue-500" /> : <LinkIcon className="h-4 w-4 text-slate-500" />}
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
                allow="autoplay"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ModuleInSidebar({ module, courseId, activeLessonId, index }: { module: any, courseId: string, activeLessonId: string, index: number }) {
  const db = useFirestore();
  const lessonsQuery = useMemoFirebase(() => {
    if (!db || !courseId || !module.id) return null;
    return query(collection(db, 'courses', courseId, 'modules', module.id, 'lessons'), orderBy('orderIndex', 'asc'));
  }, [db, courseId, module.id]);
  const { data: lessons } = useCollection(lessonsQuery);

  return (
    <div className="border-b last:border-0">
      <div className="bg-muted/10 px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">Módulo {index + 1}: {module.title}</div>
      <div className="divide-y divide-border/50">
        {lessons?.map(lesson => {
          const isActive = lesson.id === activeLessonId;
          return (
            <Link key={lesson.id} href={`/courses/${courseId}/learn/${lesson.id}?moduleId=${module.id}`} className={`block px-4 py-3 text-sm transition-colors hover:bg-muted/20 ${isActive ? 'bg-primary/5 text-primary border-l-2 border-primary font-medium' : ''}`}>
              <div className="flex items-center gap-3">
                {lesson.type === 'challenge' ? <Code2 className="h-4 w-4" /> : lesson.type === 'quiz' ? <HelpCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                <span className="truncate">{lesson.title}</span>
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
      where('lessonId', '==', lessonId),
      orderBy('createdAt', 'desc')
    );
  }, [db, courseId, lessonId]);
  
  const { data: discussions, isLoading, error } = useCollection(discussionsQuery);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !newComment.trim()) return;

    if (user.isAnonymous) {
      toast({ variant: "destructive", title: "Acceso denegado", description: "Inicia sesión para participar en las discusiones." });
      return;
    }

    setIsSubmitting(true);
    try {
      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      
      // Fallbacks para datos del usuario para evitar comentarios "vacíos" o anónimos
      const userName = profile?.displayName || user.displayName || user.email?.split('@')[0] || "Estudiante";
      const userPhotoUrl = profile?.profileImageUrl || profile?.photoURL || user.photoURL || null;

      await addDoc(collection(db, 'lesson_discussions'), {
        courseId,
        lessonId,
        userId: user.uid,
        userName,
        userPhotoUrl,
        isInstructor: profile?.role === 'instructor' || profile?.role === 'admin',
        content: newComment.trim(),
        upvotes: 0,
        replies: [],
        createdAt: serverTimestamp()
      });
      
      setNewComment("");
      toast({ title: "Comentario publicado", description: "Tu pregunta o aporte ya es visible para toda la comunidad." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo publicar el comentario." });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card p-8 rounded-3xl border shadow-sm animate-pulse flex flex-col items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground text-sm font-medium">Cargando comunidad...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border-2 border-rose-200 p-8 rounded-3xl shadow-sm text-center space-y-4">
        <div className="bg-rose-100 h-12 w-12 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-rose-900">Error de Conexión</h3>
          <p className="text-sm text-rose-600 max-w-sm mx-auto">
            No se pudieron cargar las dudas. Esto suele ocurrir por falta de <b>Índices en Firestore</b>. 
            Por favor, revisa la consola del navegador para activar el índice necesario.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card p-8 md:p-10 rounded-3xl border shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <MessageSquare className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-headline font-bold">Comunidad y Dudas</h2>
          <p className="text-sm text-muted-foreground">{discussions?.length || 0} contribuciones en esta clase</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-10 relative">
        <Textarea 
          placeholder="¿Tienes alguna duda con el código o quieres aportar un consejo?..." 
          className="resize-none min-h-[120px] rounded-2xl p-4 text-base border-slate-200 focus-visible:ring-primary/20 bg-slate-50/50"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          maxLength={1000}
        />
        <div className="flex justify-between items-center mt-3">
          <p className="text-xs text-slate-400 font-medium">Soporta formato Markdown (``para código``)</p>
          <Button 
            type="submit" 
            disabled={!newComment.trim() || isSubmitting} 
            className="rounded-xl px-6 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 transition-all"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar"}
          </Button>
        </div>
      </form>

      <div className="space-y-6">
        {discussions?.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
            <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">Sé el primero en comentar</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">Rompe el hielo. Inicia un debate, comparte un tip o hazle una pregunta al instructor.</p>
          </div>
        ) : (
          discussions?.map((d: any) => (
            <div key={d.id} className="flex gap-4 p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
              {d.userPhotoUrl ? (
                <img src={d.userPhotoUrl} alt={d.userName} className="w-12 h-12 rounded-full object-cover shrink-0 border border-slate-100" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                  <UserCircle2 className="h-7 w-7 text-slate-400" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-slate-900">{d.userName}</span>
                  {d.isInstructor && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] uppercase font-black tracking-widest px-2 py-0 h-5">Instructor Oficial</Badge>
                  )}
                  <span className="text-xs text-slate-400">
                    {d.createdAt ? new Date(d.createdAt.toDate()).toLocaleDateString() : 'Justo ahora'}
                  </span>
                </div>
                
                <p className="text-slate-600 text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words">
                  {d.content}
                </p>
                
                <div className="flex items-center gap-4 mt-4">
                  <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-primary transition-colors">
                    <ThumbsUp className="h-4 w-4" /> {d.upvotes || 0}
                  </button>
                  <button className="text-xs font-semibold text-slate-400 hover:text-primary transition-colors">
                    Responder
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
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
  
  const { data: challenge, isLoading } = useDoc(challengeRef);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!challenge) return <div className="p-12 text-center text-slate-500">No se encontró la actividad.</div>;

  const h5pTypes = ['flashcard', 'sortable', 'dragdrop', 'interactive-video', 'swipe', 'wordsearch'];

  if (h5pTypes.includes(challenge.type)) {
     return (
       <div className="max-w-4xl mx-auto w-full animate-in zoom-in-95 duration-500">
         <div className="mb-8 text-center space-y-2">
            <Badge variant="secondary" className="bg-fuchsia-100 text-fuchsia-700 font-bold border-fuchsia-200">Actividad Interactiva Gamificada</Badge>
            <h2 className="text-3xl font-headline font-bold text-slate-900">{challenge.title}</h2>
            {challenge.description && <p className="text-muted-foreground">{challenge.description}</p>}
         </div>
         <div className="bg-white rounded-[3rem] p-6 shadow-sm border border-slate-100">
           {challenge.type === 'flashcard' && <FlipFlashcards cards={challenge.cards || []} onComplete={onComplete} />}
           {challenge.type === 'sortable' && <SortableCodeBlocks lines={[...(challenge.lines||[])].sort(()=>Math.random()-0.5)} correctOrder={challenge.correctOrder || []} onComplete={(score) => score === 5 ? onComplete() : alert('Algoritmo Incorrecto')} />}
           {challenge.type === 'dragdrop' && <DragDropSnippets template={challenge.template} snippets={challenge.snippets||[]} correctMapping={challenge.correctMapping||{}} onComplete={(score) => score === 5 ? onComplete() : null} />}
           {challenge.type === 'interactive-video' && <InteractiveVideo url={challenge.videoUrl} checkpoints={challenge.checkpoints||[]} onComplete={onComplete} />}
           {challenge.type === 'swipe' && <SwipeCards deck={challenge.deck||[]} onComplete={onComplete}/>}
           {challenge.type === 'wordsearch' && <WordSearchGame words={challenge.words||[]} onComplete={onComplete}/>}
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
      <Link href={`/challenges/${challenge.id}`}><Button className="h-16 px-12 rounded-[1.5rem] text-xl font-bold gap-3 shadow-2xl shadow-primary/30 group"><PlayCircle className="h-6 w-6 group-hover:scale-110 transition-transform" /> Aceptar Desafío <ArrowRight className="h-5 w-5 ml-1" /></Button></Link>
    </div>
  );
}
