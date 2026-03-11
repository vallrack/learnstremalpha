
'use client';

import { Navbar } from '@/components/layout/Navbar';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Users, Star, Clock, Globe, BookOpen, CheckCircle2, Loader2, Zap, ChevronRight, FileText, Play } from 'lucide-react';
import Link from 'next/link';
import { useDoc, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useState } from 'react';

export default function CourseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const db = useFirestore();
  const [showPreview, setShowPreview] = useState(false);

  const courseRef = useMemoFirebase(() => {
    if (!db || !id) return null;
    return doc(db, 'courses', id);
  }, [db, id]);

  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);

  // Intentamos obtener la primera lección para usar su video como preview si el curso no tiene uno propio
  const modulesQuery = useMemoFirebase(() => {
    if (!db || !id) return null;
    return query(collection(db, 'courses', id, 'modules'), orderBy('orderIndex', 'asc'));
  }, [db, id]);
  const { data: modules } = useCollection(modulesQuery);

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

  // URL de video para la vista previa (prioriza course.previewVideoUrl, luego podrías buscar en lecciones)
  const previewVideoUrl = course.previewVideoUrl || (modules?.[0]?.id ? "https://www.youtube.com/embed/bn2ZGKdYytc" : null);

  const formatVideoUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('youtube.com/watch?v=')) {
      return url.replace('watch?v=', 'embed/');
    }
    return url;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="bg-slate-900 py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/10" />
        <div className="max-w-7xl mx-auto relative z-10 text-white">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Badge className="bg-primary text-white border-none rounded-lg">{course.category || 'General'}</Badge>
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
            <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Instructor: <span className="text-white">{course.instructorName || 'Experto'}</span></div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Última actualización: <span className="text-white">Marzo 2024</span></div>
            <div className="flex items-center gap-2"><Globe className="h-4 w-4" /> Español</div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 -mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section className="bg-card p-8 rounded-2xl border shadow-sm mt-20 md:mt-0">
              <h2 className="text-2xl font-headline font-bold mb-6">Lo que aprenderás</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  "Dominio completo de la sintaxis y lógica",
                  "Aplicación de mejores prácticas en proyectos reales",
                  "Resolución de problemas complejos paso a paso",
                  "Preparación para certificaciones oficiales"
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-headline font-bold mb-6">Contenido del Curso</h2>
              <CourseCurriculum courseId={id} />
            </section>
          </div>

          {/* Sidebar - Video Card */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border shadow-2xl overflow-hidden sticky top-24">
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
                      src={course.thumbnail || 'https://picsum.photos/seed/course/800/450'} 
                      alt={course.title}
                      fill
                      className="object-cover opacity-80"
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-16 w-16 text-white rounded-full hover:scale-110 transition-transform bg-primary/20 backdrop-blur-sm"
                        onClick={() => setShowPreview(true)}
                      >
                        <Play className="h-8 w-8 fill-current" />
                      </Button>
                      <span className="text-white font-bold mt-4 drop-shadow-md">Vista previa del curso</span>
                    </div>
                  </>
                )}
              </div>
              <div className="p-8">
                <div className="text-3xl font-headline font-bold mb-6">
                  {course.isFree ? 'Gratis' : '$29.99'}
                  {course.isFree && <span className="text-sm font-normal text-muted-foreground ml-2">por tiempo limitado</span>}
                </div>
                
                <div className="space-y-4">
                  <Button className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20">
                    Comenzar ahora
                  </Button>
                  <Button variant="outline" className="w-full h-12 text-lg font-bold rounded-xl">
                    Guardar curso
                  </Button>
                </div>

                <div className="mt-8 space-y-4">
                  <p className="font-semibold text-sm">Este curso incluye:</p>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-center gap-3"><Clock className="h-4 w-4" /> Acceso ilimitado de por vida</li>
                    <li className="flex items-center gap-3"><BookOpen className="h-4 w-4" /> 12 recursos descargables</li>
                    <li className="flex items-center gap-3"><Zap className="h-4 w-4 text-primary" /> Asistente de IA 24/7</li>
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

  if (!modules || modules.length === 0) {
    return (
      <div className="p-12 text-center bg-muted/10 rounded-3xl border-2 border-dashed">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground font-medium">Contenido en preparación.</p>
        <p className="text-sm text-muted-foreground mt-2">Próximamente podrás ver los módulos y lecciones aquí.</p>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full space-y-4">
      {modules.map((module, index) => (
        <AccordionItem key={module.id} value={module.id} className="bg-card border rounded-2xl overflow-hidden px-4 shadow-sm border-border/50">
          <AccordionTrigger className="hover:no-underline py-6">
            <div className="flex flex-col items-start text-left gap-1">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Módulo {module.orderIndex !== undefined ? module.orderIndex + 1 : index + 1}
              </span>
              <span className="text-lg font-bold">{module.title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <ModuleLessons courseId={courseId} moduleId={module.id} />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function ModuleLessons({ courseId, moduleId }: { courseId: string, moduleId: string }) {
  const db = useFirestore();

  const lessonsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'courses', courseId, 'modules', moduleId, 'lessons'), orderBy('orderIndex', 'asc'));
  }, [db, courseId, moduleId]);

  const { data: lessons, isLoading } = useCollection(lessonsQuery);

  if (isLoading) return <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>;

  const isUrl = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="space-y-2">
      {lessons?.map((lesson) => (
        <div key={lesson.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors group border border-transparent hover:border-border/50">
          <div className="flex items-center gap-4">
            <div className="bg-muted p-2.5 rounded-xl group-hover:bg-primary/10 transition-colors">
              <PlayCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                {isUrl(lesson.title) ? "Video Clase" : lesson.title}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {lesson.durationInMinutes || 10} min
                </span>
                {lesson.isPremium && (
                  <Badge variant="outline" className="text-[10px] h-4 py-0 px-1 text-amber-600 border-amber-200 bg-amber-50">Premium</Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="rounded-lg h-9 gap-1 font-bold group-hover:bg-primary group-hover:text-white transition-all" asChild>
             <Link href={`/courses/${courseId}/learn/${lesson.id}?moduleId=${moduleId}`}>
               Continuar
               <ChevronRight className="h-4 w-4" />
             </Link>
          </Button>
        </div>
      ))}
      {(!lessons || lessons.length === 0) && (
        <p className="text-xs text-muted-foreground italic px-4">Este módulo no tiene lecciones aún.</p>
      )}
    </div>
  );
}
