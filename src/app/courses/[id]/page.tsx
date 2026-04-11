'use client';

import { Navbar } from '@/components/layout/Navbar';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Users, Star, Clock, Globe, BookOpen, CheckCircle2, Loader2, Zap, ChevronRight, Play, Award, Lock, ShieldAlert, Code2, ArrowRight, Video, CalendarIcon, Tag } from 'lucide-react';
import Link from 'next/link';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, orderBy, Timestamp, getDocs, limit } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useState, useEffect, Suspense } from 'react';
import { formatPrice } from '@/lib/currency';

export default function CourseDetailPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <CourseDetailContent />
    </Suspense>
  );
}

function CourseDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const db = useFirestore();
  const { user, profile, isUserLoading } = useUser();
  const [showPreview, setShowPreview] = useState(false);
  const [firstLessonPath, setFirstLessonPath] = useState<{ lessonId: string; moduleId: string } | null>(null);

  const courseRef = useMemoFirebase(() => {
    if (!db || !id) return null;
    return doc(db, 'courses', id);
  }, [db, id]);

  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);


  const progressRef = useMemoFirebase(() => {
    if (!db || !user?.uid || !id) return null;
    return doc(db, 'users', user.uid, 'courseProgress', id);
  }, [db, user?.uid, id]);
  const { data: progress } = useDoc(progressRef);
  
  const instructorRef = useMemoFirebase(() => {
    if (!db || !course?.instructorId) return null;
    return doc(db, 'users', course.instructorId);
  }, [db, course?.instructorId]);
  const { data: instructorProfile } = useDoc(instructorRef);

  // Cargar la primera lección del curso para el botón "Continuar Aprendiendo"
  useEffect(() => {
    if (!db || !id) return;
    const loadFirstLesson = async () => {
      try {
        const modulesSnap = await getDocs(query(collection(db, 'courses', id, 'modules'), orderBy('orderIndex', 'asc'), limit(1)));
        if (modulesSnap.empty) return;
        const firstModule = modulesSnap.docs[0];
        const lessonsSnap = await getDocs(query(collection(db, 'courses', id, 'modules', firstModule.id, 'lessons'), orderBy('orderIndex', 'asc'), limit(1)));
        if (lessonsSnap.empty) return;
        setFirstLessonPath({ lessonId: lessonsSnap.docs[0].id, moduleId: firstModule.id });
      } catch { /* silencioso */ }
    };
    loadFirstLesson();
  }, [db, id]);

  // --- FINAL RENDER DECISION ---
  
  if (isCourseLoading || isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  const isAccountInactive = profile?.isActive === false;

  if (isAccountInactive) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-24 h-24 bg-rose-100 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-rose-500/10">
            <ShieldAlert className="h-10 w-10 text-rose-600" />
          </div>
          <h1 className="text-4xl font-headline font-bold mb-4">Acceso Denegado</h1>
          <p className="text-muted-foreground max-w-md mb-8 text-lg">
            Tu cuenta ha sido suspendida por el administrador. Ponte en contacto con soporte si crees que esto es un error.
          </p>
          <Button variant="outline" onClick={() => router.push('/')} className="rounded-2xl h-14 px-10 text-lg font-bold">
            Volver al Inicio
          </Button>
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold font-headline">Curso no encontrado</h1>
          <Link href="/courses">
            <Button variant="outline" className="rounded-xl">Volver al catálogo</Button>
          </Link>
        </main>
      </div>
    );
  }

  const isCompleted = progress?.status === 'completed';
  const isPremium = profile?.role === 'admin' || !!profile?.isPremiumSubscriber;
  const imageSrc = course.thumbnailDataUrl || course.imageUrl || 'https://picsum.photos/seed/course/800/450';
  
  // Lógica robusta para optimización de imágenes (Base64 y fuentes no listadas deben ser unoptimized)
  const isOptimizable = imageSrc.includes('images.unsplash.com') || imageSrc.includes('picsum.photos') || imageSrc.includes('placehold.co');
  const shouldSkipOptimization = !isOptimizable || imageSrc.startsWith('data:');

  const previewVideoUrl = course.previewVideoUrl || null;

  const closingDate = course.closingDate instanceof Timestamp ? course.closingDate.toDate() : (course.closingDate ? new Date(course.closingDate) : null);
  const isExpired = closingDate && closingDate < new Date();
  
  const isAuthor = user?.uid === course.instructorId;
  const hasPurchased = profile?.purchasedCourses?.includes(id);
  const isFreeCourse = course.isFree === true;
  
  // Acceso permitido si: Eres Admin, es el autor, compraste el curso, o tiene subscripción Premium global
  const hasValidAccess = isPremium || isAuthor || hasPurchased;
  
  // Acceso denegado si no tiene acceso básico y el curso no es gratis,
  // O si el curso ha expirado y no eres personal autorizado.
  const isExpiredAndNoAccess = !!(isExpired && !isPremium && !isAuthor);
  const accessDenied = (!hasValidAccess && !isFreeCourse) || isExpiredAndNoAccess;

  const formatVideoUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
      const idStr = url.split('/').pop()?.split('?')[0];
      return `https://www.youtube.com/embed/${idStr}`;
    }
    return url;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      
      <div className="bg-slate-900 pt-16 pb-32 md:pb-40 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/10" />
        <div className="max-w-7xl mx-auto relative z-10 text-white">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Badge className="bg-primary text-white border-none rounded-lg">{course.category || 'General'}</Badge>
            {isExpired && (
              <Badge variant="destructive" className="rounded-lg gap-1">
                <Clock className="h-3 w-3" /> Curso Finalizado
              </Badge>
            )}
            <HeroCourseRating courseId={id} />
          </div>
          <h1 className="text-3xl md:text-5xl font-headline font-bold mb-6 max-w-3xl leading-tight text-white">
            {course.title}
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl leading-relaxed">
            {course.description}
          </p>
          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" /> 
              Instructor: <span className="text-white font-medium">{course.instructorName || 'Experto LearnStream'}</span>
            </div>
            {closingDate && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" /> 
                Cierre: <span className={`${isExpired ? 'text-rose-400' : 'text-white'} font-medium`}>{closingDate.toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 -mt-20 md:-mt-24 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            {accessDenied && (
              <section className="bg-rose-50 border border-rose-200 p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 shadow-sm animate-in fade-in slide-in-from-top-4">
                <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                  <Lock className="h-10 w-10 text-rose-600" />
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                  <h2 className="text-2xl font-headline font-bold text-rose-900">
                    {isExpired ? "Curso Finalizado" : "Contenido Exclusivo"}
                  </h2>
                  <p className="text-rose-700">
                    {isExpired 
                      ? "Este programa ha cerrado. Solo los estudiantes Premium mantienen el acceso vitalicio." 
                      : "Debes adquirir este curso o tener una suscripción Premium para acceder al material y obtener tu certificado."}
                  </p>
                  {!isFreeCourse && !hasPurchased && (
                    <p className="inline-block mt-2 font-bold px-3 py-1 bg-white text-rose-800 rounded-lg text-sm border border-rose-200">
                      Precio Individual: {formatPrice(course.price || 120000, course.currency || 'COP')}
                    </p>
                  )}
                </div>
                <Link href={`/checkout?courseId=${id}`}>
                  <Button className="rounded-2xl h-14 px-8 bg-amber-500 hover:bg-amber-600 font-bold shadow-lg shadow-amber-200 whitespace-nowrap">
                    Obtener Acceso
                  </Button>
                </Link>
              </section>
            )}

            {isCompleted && (
              <section className="bg-emerald-50 border border-emerald-200 p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                  <Award className="h-10 w-10 text-emerald-600" />
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                  <h2 className="text-2xl font-headline font-bold text-emerald-900">¡Curso Completado!</h2>
                  <p className="text-emerald-700">Ya puedes descargar tu certificado con tu nombre actualizado en el perfil.</p>
                </div>
                <Link href={`/courses/${id}/certificate`}>
                  <Button className="rounded-2xl h-14 px-8 bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-200 gap-2">
                    <Award className="h-5 w-5" />
                    Ver Certificado
                  </Button>
                </Link>
              </section>
            )}

            {!accessDenied && (
              <>
                <section className="bg-card p-8 rounded-[2rem] border shadow-sm bg-white">
                  <h2 className="text-2xl font-headline font-bold mb-6 text-foreground">Lo que aprenderás</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      "Dominio completo de la sintaxis y lógica",
                      "Aplicación de mejores prácticas en proyectos reales",
                      "Resolución de problemas complejos paso a paso",
                      "Preparación para certificaciones oficiales"
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3 text-sm items-start">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-foreground leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </section>

                <InstructorBioSection profile={instructorProfile} />

                <section>
                  <h2 className="text-2xl font-headline font-bold mb-6 text-foreground">Contenido del Curso</h2>
                  <CourseCurriculum courseId={id} hasValidAccess={hasValidAccess} isFreeCourse={isFreeCourse} />
                </section>
                
                <section>
                  <CourseReviews courseId={id} />
                </section>
              </>
            )}

            <LiveClassesList 
                courseId={id} 
                groupId={progress?.groupId} 
                hasValidAccess={hasValidAccess} 
                profile={profile}
            />
          </div>

          <div className="space-y-6">
            <div className="bg-card rounded-[2rem] border shadow-2xl overflow-hidden sticky top-24 bg-white">
              <div className="relative aspect-video bg-black group">
                {showPreview && previewVideoUrl ? (
                  <iframe 
                    width="100%" 
                    height="100%" 
                    src={`${formatVideoUrl(previewVideoUrl)}?autoplay=1`}
                    title="Course Preview"
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                  ></iframe>
                ) : (
                  <>
                    <Image 
                      src={imageSrc} 
                      alt={course.title}
                      fill
                      className="object-cover opacity-80"
                      unoptimized={shouldSkipOptimization}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-16 w-16 text-white rounded-full hover:scale-110 transition-transform bg-primary/20 backdrop-blur-sm"
                        onClick={() => setShowPreview(true)}
                        disabled={!previewVideoUrl}
                      >
                        <Play className="h-8 w-8 fill-current" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
              <div className="p-8">
                <div className="space-y-4">
                  {isCompleted ? (
                    <Link href={`/courses/${id}/certificate`} className="w-full">
                      <Button className="w-full h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-200 gap-2">
                        <Award className="h-5 w-5" />
                        Obtener Certificado
                      </Button>
                    </Link>
                  ) : (
                    <Button 
                      className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20"
                      onClick={() => {
                        if (!user) {
                          router.push('/login');
                        } else if (accessDenied) {
                          router.push(`/checkout?courseId=${id}`);
                        } else if (firstLessonPath) {
                          router.push(`/courses/${id}/learn/${firstLessonPath.lessonId}?moduleId=${firstLessonPath.moduleId}`);
                        }
                      }}
                    >
                      {!user ? 'Iniciar sesión para aprender' : accessDenied ? 'Obtener Acceso' : 'Continuar Aprendiendo'}
                    </Button>
                  )}
                </div>

                <div className="mt-8 space-y-4">
                  <p className="font-semibold text-sm text-foreground">Este curso incluye:</p>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-center gap-3"><Clock className="h-4 w-4" /> Acceso vitalicio para Premium</li>
                    <li className="flex items-center gap-3"><BookOpen className="h-4 w-4" /> Material descargable</li>
                    <li className="flex items-center gap-3"><Award className="h-4 w-4 text-emerald-500" /> Certificado de finalización</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CourseCurriculum({ courseId, hasValidAccess, isFreeCourse }: { courseId: string, hasValidAccess: boolean, isFreeCourse: boolean }) {
  const db = useFirestore();
  const modulesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'courses', courseId, 'modules'), orderBy('orderIndex', 'asc'));
  }, [db, courseId]);

  const { data: modules, isLoading } = useCollection(modulesQuery);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div id="curriculum">
      <Accordion type="single" collapsible className="w-full space-y-4">
        {modules?.map((module, index) => (
          <AccordionItem key={module.id} value={module.id} className="bg-white border rounded-2xl overflow-hidden px-4 shadow-sm">
            <AccordionTrigger className="hover:no-underline py-6">
              <div className="flex flex-col items-start text-left gap-1">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Módulo {index + 1}</span>
                  {module.isPremium ? (
                    <Badge variant="outline" className="text-[10px] h-4 py-0 bg-amber-50 text-amber-600 border-amber-200">Premium</Badge>
                  ) : isFreeCourse ? (
                    <Badge variant="outline" className="text-[10px] h-4 py-0 bg-emerald-50 text-emerald-600 border-emerald-200">Acceso Libre</Badge>
                  ) : null}
                </div>
                <span className="text-lg font-bold text-foreground">{module.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <ModuleLessons courseId={courseId} moduleId={module.id} hasValidAccess={hasValidAccess} isFreeCourse={isFreeCourse} moduleIsPremium={!!module.isPremium} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function ModuleLessons({ courseId, moduleId, hasValidAccess, isFreeCourse, moduleIsPremium }: { courseId: string, moduleId: string, hasValidAccess: boolean, isFreeCourse: boolean, moduleIsPremium: boolean }) {
  const db = useFirestore();
  const lessonsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'courses', courseId, 'modules', moduleId, 'lessons'), orderBy('orderIndex', 'asc'));
  }, [db, courseId, moduleId]);

  const { data: lessons, isLoading } = useCollection(lessonsQuery);

  if (isLoading) return <div className="py-4 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-2">
      {lessons?.map((lesson) => (
        <div key={lesson.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors group border border-transparent">
          <div className="flex items-center gap-4">
            <div className="bg-muted p-2.5 rounded-xl group-hover:bg-primary/10 transition-colors">
              {lesson.type === 'challenge' ? (
                <Code2 className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              ) : (
                <PlayCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold group-hover:text-primary transition-colors text-foreground">
                {lesson.title}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {lesson.durationInMinutes || 10} min</span>
                {lesson.isPremium ? (
                  <Badge variant="outline" className="text-[10px] h-4 py-0 bg-amber-50 text-amber-600">Premium</Badge>
                ) : isFreeCourse ? (
                   <Badge variant="outline" className="text-[10px] h-4 py-0 bg-emerald-50 text-emerald-600 border-emerald-100 italic">Gratis</Badge>
                ) : null}
              </div>
            </div>
          </div>
          {(!hasValidAccess && (lesson.isPremium || moduleIsPremium || !isFreeCourse)) ? (
            <Link href={`/checkout?courseId=${courseId}${lesson.isPremium ? `&moduleId=${moduleId}&lessonId=${lesson.id}` : moduleIsPremium ? `&moduleId=${moduleId}` : ''}`}>
              <Button variant="ghost" size="sm" className="rounded-xl h-10 gap-2 text-amber-600 bg-amber-50 hover:bg-amber-100 hover:text-amber-700 font-bold border-amber-100 border transition-all hover:scale-105 px-4 shadow-sm shadow-amber-500/5">
                <Lock className="h-3.5 w-3.5" />
                <span className="text-[11px] font-black uppercase tracking-wider">
                  {lesson.isPremium && lesson.price > 0 ? formatPrice(lesson.price, lesson.currency || 'COP') : 'Desbloquear'}
                </span>
              </Button>
            </Link>
          ) : (
            <Button variant="ghost" size="sm" className={`rounded-lg h-9 gap-1 font-bold ${lesson.type === 'challenge' ? 'text-primary bg-primary/5 hover:bg-primary/10' : ''}`} asChild>
               <Link href={`/courses/${courseId}/learn/${lesson.id}?moduleId=${moduleId}`}>
                 {lesson.type === 'challenge' ? 'Ir al Desafío' : 'Ver Clase'} 
                 <ChevronRight className="h-4 w-4" />
               </Link>
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function CourseReviews({ courseId }: { courseId: string }) {
  const db = useFirestore();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !courseId) return;
    
    const loadReviews = async () => {
      try {
        const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'reviews', courseId, 'ratings'), orderBy('createdAt', 'desc')));
        setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn("CourseReviews: Error loading course reviews", err);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [db, courseId]);

  if (loading) return null;
  if (reviews.length === 0) return null;

  const avg = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;
  const dist = [5, 4, 3, 2, 1].map(star => ({ star, count: reviews.filter(r => r.rating === star).length }));

  return (
    <div className="bg-white rounded-[2rem] border shadow-sm p-8">
      <h2 className="text-2xl font-headline font-bold mb-6">Reseñas de Estudiantes</h2>

      {/* Summary row */}
      <div className="flex flex-col md:flex-row gap-8 mb-8 pb-8 border-b">
        <div className="text-center shrink-0">
          <div className="text-6xl font-black text-slate-900">{avg.toFixed(1)}</div>
          <div className="flex gap-1 justify-center my-2">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className={`h-5 w-5 ${i <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground font-medium">{reviews.length} reseña{reviews.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex-1 space-y-2">
          {dist.map(({ star, count }) => (
            <div key={star} className="flex items-center gap-3">
              <span className="text-xs font-bold w-4 text-right text-slate-500">{star}</span>
              <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: reviews.length ? `${(count / reviews.length) * 100}%` : '0%' }} />
              </div>
              <span className="text-xs text-muted-foreground w-4">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review list */}
      <div className="space-y-6">
        {reviews.slice(0, 6).map((r) => (
          <div key={r.id} className="flex gap-4">
            {r.profileImageUrl ? (
              <img src={r.profileImageUrl} alt={r.displayName} className="w-10 h-10 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                {r.displayName?.[0]?.toUpperCase() || 'E'}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold">{r.displayName || 'Estudiante'}</p>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className={`h-3 w-3 ${i <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />)}
                </div>
              </div>
              {r.comment && <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroCourseRating({ courseId }: { courseId: string }) {
  const db = useFirestore();
  const [stats, setStats] = useState({ avg: 0, count: 0 });

  useEffect(() => {
    if (!db || !courseId) return;
    
    const loadHeroRating = async () => {
      try {
        const { collection, getDocs } = await import('firebase/firestore');
        const snap = await getDocs(collection(db, 'reviews', courseId, 'ratings'));
        if (snap.empty) return;
        const ratings = snap.docs.map(d => d.data().rating || 0);
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        setStats({ avg, count: ratings.length });
      } catch (err) {
        // Silencioso, opcional: console.warn(err);
      }
    };

    loadHeroRating();
  }, [db, courseId]);

  if (stats.count === 0) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm text-white/90 font-medium">
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      <span>{stats.avg.toFixed(1)} ({stats.count} reseña{stats.count !== 1 ? 's' : ''})</span>
    </div>
  );
}
function InstructorBioSection({ profile }: { profile: any }) {
  if (!profile) return null;

  return (
    <section className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden p-8 md:p-10">
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
        <div className="relative shrink-0">
          <div className="w-32 h-32 rounded-[2rem] border-4 border-slate-50 shadow-xl overflow-hidden bg-slate-100 flex items-center justify-center">
             {profile.profileImageUrl || profile.photoURL ? (
               <img src={profile.profileImageUrl || profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
             ) : (
               <span className="text-4xl font-bold text-slate-300">{(profile.displayName || 'U')[0].toUpperCase()}</span>
             )}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg ring-4 ring-white">
            <Award className="h-4 w-4" />
          </div>
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1">Instructor del Curso</div>
            <h3 className="text-3xl font-headline font-bold text-slate-900">{profile.displayName || 'Experto LearnStream'}</h3>
          </div>
          
          {profile.bio ? (
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap italic opacity-80 line-clamp-4">
              "{profile.bio}"
            </p>
          ) : (
            <p className="text-slate-400 text-sm italic">Este instructor aún no ha completado su biografía.</p>
          )}

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
             <Link href={`/u/${profile.uid || profile.id}`}>
               <Button variant="outline" size="sm" className="rounded-xl font-bold gap-2 text-xs border-2">
                 Ver Perfil Completo
                 <ArrowRight className="h-3 w-3" />
               </Button>
             </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveClassesList({ courseId, groupId, hasValidAccess, profile }: { courseId: string, groupId?: string | null, hasValidAccess: boolean, profile: any }) {
  const db = useFirestore();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !courseId) return;
    
    const fetchClasses = async () => {
      try {
        const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'courses', courseId, 'virtualClasses'), orderBy('scheduledAt', 'asc')));
        
        let fetched: any[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
        
        // 1. Filtrado por Grupo (Cohorte)
        fetched = fetched.filter(c => !c.groupId || c.groupId === groupId);
        
        // 2. Filtrado por Visibilidad (Solo mostrar clases internas a quienes tienen acceso al curso o son admins)
        if (!hasValidAccess) {
          fetched = fetched.filter(c => c.showInCatalog === true);
        }
        
        setClasses(fetched);
      } catch (err) {
         console.warn(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClasses();
  }, [db, courseId, groupId]);

  if (loading || classes.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-headline font-bold mt-12 mb-6 text-foreground flex items-center gap-2">
        <Video className="h-6 w-6 text-primary" />
        Clases en Vivo y Grabaciones
      </h2>
      <div className="space-y-4">
        {classes.map(vc => {
          const isPast = vc.scheduledAt ? vc.scheduledAt.toDate() < new Date() : false;
          
          // LÓGICA DE ACCESO POR NIVELES
          const accessType = vc.accessType || 'course';
          const isFree = accessType === 'free';
          const isPlanOnly = accessType === 'plan';
          const isPaidOnly = accessType === 'paid';
          const hasIndividualAccess = profile?.purchasedClasses?.includes(vc.id);
          const isGlobalSubscriber = !!profile?.isPremiumSubscriber;
          
          let canAccess = hasValidAccess; // Default: Course students/Admins/Authors
          if (isFree) canAccess = true;
          if (isPlanOnly) canAccess = isGlobalSubscriber || profile?.role === 'admin' || profile?.uid === vc.instructorId;
          if (isPaidOnly) canAccess = hasIndividualAccess || profile?.role === 'admin' || profile?.uid === vc.instructorId;

          return (
             <div key={vc.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-colors ${isPast ? 'bg-slate-50 border-slate-200 opacity-80' : 'bg-white border-slate-100 shadow-sm hover:border-primary/20'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl shrink-0 ${isPast ? 'bg-slate-100 text-slate-400' : 'bg-primary/5 text-primary'}`}>
                    <CalendarIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className={`font-bold ${isPast ? 'text-slate-500' : 'text-slate-900'}`}>{vc.title}</h4>
                      {isFree && <Badge className="bg-emerald-100 text-emerald-700 text-[9px] border-none uppercase font-black">Libre</Badge>}
                      {isPlanOnly && <Badge className="bg-indigo-100 text-indigo-700 text-[9px] border-none uppercase font-black">Plan Premium</Badge>}
                      {isPaidOnly && !hasIndividualAccess && <Badge className="bg-amber-100 text-amber-700 text-[9px] border-none uppercase font-black">Masterclass</Badge>}
                      {isPast && <Badge variant="secondary" className="text-[10px] bg-slate-200">Finalizada</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                       <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{vc.scheduledAt ? new Date(vc.scheduledAt.toDate()).toLocaleString() : 'Sin fecha'}</span>
                       </div>
                       {vc.technology && (
                          <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-600">
                             <Zap className="h-2.5 w-2.5" />
                             {vc.technology}
                          </div>
                       )}
                    </div>
                  </div>
                </div>
                
                <div className="flex w-full md:w-auto justify-end gap-2">
                   {canAccess ? (
                     vc.recordingUrl ? (
                        <Link href={vc.recordingUrl} target="_blank">
                          <Button variant="outline" size="sm" className="rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-bold shadow-sm">
                             <PlayCircle className="h-4 w-4 mr-2" /> Ver Grabación
                          </Button>
                        </Link>
                     ) : (
                        <Link href={vc.meetLink || '#'} target="_blank">
                          <Button size="sm" disabled={isPast} className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-200">
                             <Video className="h-4 w-4 mr-2" /> Entrar a la Clase
                          </Button>
                        </Link>
                     )
                   ) : (
                      isPaidOnly ? (
                        <Link href={`/checkout?courseId=${courseId}&virtualClassId=${vc.id}`}>
                            <Button size="sm" className="rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-white shadow-lg shadow-amber-200 border-none">
                                <Tag className="h-4 w-4 mr-2" /> Comprar Entrada ({vc.price} {vc.currency})
                            </Button>
                        </Link>
                      ) : isPlanOnly ? (
                        <Link href="/checkout">
                            <Button size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-lg shadow-indigo-200 border-none">
                                <Zap className="h-4 w-4 mr-2" /> Suscribirse al Plan
                            </Button>
                        </Link>
                      ) : (
                        <Button variant="outline" size="sm" disabled className="rounded-xl opacity-50 bg-slate-50 border-slate-200">
                            <Lock className="h-3 w-3 mr-2" /> Contenido Bloqueado
                        </Button>
                      )
                   )}
                </div>
             </div>
          )
        })}
      </div>
    </section>
  )
}
