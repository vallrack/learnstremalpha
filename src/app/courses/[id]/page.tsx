'use client';

import { Navbar } from '@/components/layout/Navbar';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Users, Star, Clock, Globe, BookOpen, CheckCircle2, Loader2, Zap, ChevronRight, Play, Award, Lock, ShieldAlert, Code2 } from 'lucide-react';
import Link from 'next/link';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { doc, collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useState } from 'react';

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const db = useFirestore();
  const { user } = useUser();
  const [showPreview, setShowPreview] = useState(false);

  const courseRef = useMemoFirebase(() => {
    if (!db || !id) return null;
    return doc(db, 'courses', id);
  }, [db, id]);

  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  const progressRef = useMemoFirebase(() => {
    if (!db || !user?.uid || !id) return null;
    return doc(db, 'users', user.uid, 'courseProgress', id);
  }, [db, user?.uid, id]);
  const { data: progress } = useDoc(progressRef);

  if (isCourseLoading) {
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
  
  // Acceso permitido si: Es gratis, es Admin, es el autor, compró el curso, o tiene subscripción Premium global
  const hasValidAccess = isFreeCourse || isPremium || isAuthor || hasPurchased;
  
  // Acceso denegado si no tiene acceso válido, o si está expirado y no eres del equipo/premium
  const accessDenied = !hasValidAccess || (isExpired && !isPremium && !isAuthor);

  const formatVideoUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('/').pop()?.split('?')[0];
      return `https://www.youtube.com/embed/${id}`;
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
            <div className="flex items-center gap-1 text-sm text-white/80">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-white">4.8 (2.5k reseñas)</span>
            </div>
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
                      Precio Individual: ${course.price?.toLocaleString() || 120000} COP
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

                <section>
                  <h2 className="text-2xl font-headline font-bold mb-6 text-foreground">Contenido del Curso</h2>
                  <CourseCurriculum courseId={id} />
                </section>
              </>
            )}
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
                        const curriculum = document.getElementById('curriculum');
                        curriculum?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Continuar Aprendiendo
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

function CourseCurriculum({ courseId }: { courseId: string }) {
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
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Módulo {index + 1}</span>
                <span className="text-lg font-bold text-foreground">{module.title}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-6">
              <ModuleLessons courseId={courseId} moduleId={module.id} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function ModuleLessons({ courseId, moduleId }: { courseId: string, moduleId: string }) {
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
                {lesson.isPremium && <Badge variant="outline" className="text-[10px] h-4 py-0 bg-amber-50 text-amber-600">Premium</Badge>}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className={`rounded-lg h-9 gap-1 font-bold ${lesson.type === 'challenge' ? 'text-primary bg-primary/5 hover:bg-primary/10' : ''}`} asChild>
             <Link href={`/courses/${courseId}/learn/${lesson.id}?moduleId=${moduleId}`}>
               {lesson.type === 'challenge' ? 'Ir al Desafío' : 'Ver Clase'} 
               <ChevronRight className="h-4 w-4" />
             </Link>
          </Button>
        </div>
      ))}
    </div>
  );
}
