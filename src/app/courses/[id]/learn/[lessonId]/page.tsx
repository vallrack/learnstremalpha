
'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { LessonAssistant } from '@/components/player/LessonAssistant';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  CheckCircle, 
  Menu, 
  MoreVertical, 
  Loader2, 
  PlayCircle,
  Paperclip,
  FileDown,
  FileText,
  Presentation,
  Link as LinkIcon,
  Download,
  Eye,
  ExternalLink,
  Lock,
  Award,
  Code2,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { useDoc, useCollection, useFirestore, useMemoFirebase, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { useState, Suspense } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from '@/hooks/use-toast';

export default function LessonPlayerPage() {
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

  const courseId = params.id as string;
  const lessonId = params.lessonId as string;
  const moduleId = searchParams.get('moduleId');

  // Fetch Course
  const courseRef = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return doc(db, 'courses', courseId);
  }, [db, courseId]);
  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);

  // Fetch Current Lesson
  const lessonRef = useMemoFirebase(() => {
    if (!db || !courseId || !moduleId || !lessonId) return null;
    return doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId);
  }, [db, courseId, moduleId, lessonId]);
  const { data: currentLesson, isLoading: isLessonLoading } = useDoc(lessonRef);

  // Fetch Modules for Sidebar
  const modulesQuery = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return query(collection(db, 'courses', courseId, 'modules'), orderBy('orderIndex', 'asc'));
  }, [db, courseId]);
  const { data: modules, isLoading: isModulesLoading } = useCollection(modulesQuery);

  const handleMarkAsCompleted = () => {
    if (!db || !user || user.isAnonymous || !courseId) return;

    const progressRef = doc(db, 'users', user.uid, 'courseProgress', courseId);
    
    setDocumentNonBlocking(progressRef, {
      courseId,
      status: 'completed',
      completedAt: serverTimestamp(),
      progressPercentage: 100,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    toast({
      title: "¡Lección completada!",
      description: "Tu progreso ha sido guardado. Ya puedes generar tu certificado.",
      action: (
        <Button size="sm" className="gap-2" onClick={() => router.push(`/courses/${courseId}/certificate`)}>
          <Award className="h-4 w-4" />
          Ver Certificado
        </Button>
      ),
    });
  };

  if (isCourseLoading || isLessonLoading || isModulesLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-medium">Cargando lección...</p>
      </div>
    );
  }

  if (!course || !currentLesson) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 text-center p-6">
        <h1 className="text-2xl font-bold font-headline">No pudimos encontrar esta lección</h1>
        <p className="text-muted-foreground">Verifica que el curso y la lección existan.</p>
        <Link href={`/courses/${courseId}`}>
          <Button variant="outline" className="rounded-xl">Volver al curso</Button>
        </Link>
      </div>
    );
  }

  const isUrl = (str: string) => {
    if (!str) return false;
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  const videoSource = isUrl(currentLesson.videoUrl) 
    ? currentLesson.videoUrl 
    : (isUrl(currentLesson.title) ? currentLesson.title : null);

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

  const displayTitle = isUrl(currentLesson.title) ? "Video Clase" : currentLesson.title;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
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

        {/* Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#F1F0F4]/30">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between gap-4 mb-2">
                <nav className="text-xs text-muted-foreground flex items-center gap-2">
                  <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
                  <span>/</span>
                  <Link href={`/courses/${courseId}`} className="hover:text-primary truncate max-w-[150px]">{course.title}</Link>
                  <span>/</span>
                  <span className="text-foreground font-medium">{displayTitle}</span>
                </nav>
                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
              </div>

              {/* Lesson Content - Challenge or Video */}
              {currentLesson.type === 'challenge' ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-[3rem] border shadow-sm text-center space-y-8 animate-in fade-in zoom-in duration-500">
                  <div className="bg-primary/10 p-8 rounded-[2rem] shadow-inner">
                    <Code2 className="h-16 w-16 text-primary" />
                  </div>
                  <div className="space-y-3 max-w-lg">
                    <Badge variant="secondary" className="px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-primary/5 text-primary">Desafío Técnico</Badge>
                    <h2 className="text-3xl font-headline font-bold text-slate-900">{currentLesson.title}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Esta lección consiste en un reto práctico de {course.technology}. Pon a prueba tus conocimientos y recibe feedback instantáneo de nuestra IA.
                    </p>
                  </div>
                  <Link href={`/challenges/${currentLesson.challengeId}`}>
                    <Button className="h-16 px-12 rounded-[1.5rem] text-xl font-bold gap-3 shadow-2xl shadow-primary/30 group">
                      <PlayCircle className="h-6 w-6 group-hover:scale-110 transition-transform" />
                      Aceptar Desafío
                      <ArrowRight className="h-5 w-5 ml-1" />
                    </Button>
                  </Link>
                  <p className="text-[10px] text-muted-foreground italic font-medium">Se requiere abrir el editor de código interactivo para continuar.</p>
                </div>
              ) : (
                <>
                  {/* Video Player */}
                  {videoSource ? (
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative group">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        src={formatVideoUrl(videoSource)} 
                        title={displayTitle}
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                      ></iframe>
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted rounded-2xl flex flex-col items-center justify-center gap-4 text-muted-foreground border-2 border-dashed">
                      <PlayCircle className="h-12 w-12 opacity-20" />
                      <p>Esta lección no incluye video.</p>
                    </div>
                  )}

                  {/* Lesson Info Tabs/Sections */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                      <article className="prose prose-slate max-w-none bg-card p-8 md:p-10 rounded-3xl border shadow-sm">
                        <h1 className="text-3xl font-headline font-bold mb-6">{displayTitle}</h1>
                        <div className="text-lg leading-relaxed text-muted-foreground space-y-6 whitespace-pre-wrap">
                          {currentLesson.description || currentLesson.content || "No hay descripción disponible."}
                        </div>
                      </article>
                    </div>

                    {/* Resources Sidebar for the Lesson */}
                    <div className="space-y-6">
                      <LessonResources courseId={courseId} moduleId={moduleId!} lessonId={lessonId} />
                      
                      <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6">
                        <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-primary" />
                          Tarea de hoy
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Explora el material adjunto y completa los ejercicios prácticos para reforzar lo aprendido hoy.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between pt-8 pb-20 border-t">
                <Link href={`/courses/${courseId}`}>
                  <Button variant="outline" className="gap-2 h-12 rounded-xl">
                    <ChevronLeft className="h-5 w-5" />
                    Volver al curso
                  </Button>
                </Link>
                
                {currentLesson.type !== 'challenge' && (
                  <Button 
                    className="h-12 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 gap-2 font-bold shadow-lg shadow-emerald-100"
                    onClick={handleMarkAsCompleted}
                  >
                    <CheckCircle className="h-5 w-5" />
                    Marcar como completada
                  </Button>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* AI Assistant Panel */}
        <aside className="hidden xl:block w-96 bg-card border-l shrink-0">
          <LessonAssistant lessonContent={currentLesson.content || currentLesson.description || ''} />
        </aside>
      </div>
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

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="h-4 w-4 animate-spin" /></div>;

  if (!resources || resources.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileDown className="h-4 w-4 text-red-500" />;
      case 'word': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'ppt': return <Presentation className="h-4 w-4 text-orange-500" />;
      default: return <LinkIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPreviewUrl = (res: any) => {
    if (!res.contentUrl) return '';
    const url = res.contentUrl;
    
    if (url.includes('docs.google.com')) {
      if (url.includes('/presentation/')) {
        return url.replace(/\/edit.*$/, '/embed').replace(/\/view.*$/, '/embed');
      }
      if (url.includes('/document/')) {
        return url.replace(/\/edit.*$/, '/preview').replace(/\/view.*$/, '/preview');
      }
      if (url.includes('/spreadsheets/')) {
        return url.replace(/\/edit.*$/, '/preview').replace(/\/view.*$/, '/preview');
      }
    }

    if (url.includes('drive.google.com')) {
      const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
    }

    const isOfficeDoc = ['word', 'ppt'].includes(res.type) || 
                       url.toLowerCase().match(/\.(docx|pptx|doc|ppt)$/i);
    
    if (isOfficeDoc) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    }

    if (res.type === 'pdf' || url.toLowerCase().endsWith('.pdf')) {
      return url;
    }

    return url;
  };

  const isEmbeddable = (res: any) => {
    const url = res.contentUrl;
    return url.includes('drive.google.com') || 
           url.includes('docs.google.com') || 
           ['pdf', 'word', 'ppt'].includes(res.type) ||
           url.toLowerCase().match(/\.(pdf|docx|pptx|doc|ppt)$/i);
  };

  const handleResourceClick = (res: any) => {
    if (isGuest) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "Inicia sesión con una cuenta registrada para descargar o visualizar los recursos de apoyo.",
      });
      return;
    }
    setPreviewResource(res);
  };

  return (
    <>
      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-muted/20">
          <h3 className="font-headline font-bold text-sm flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-primary" />
            Material de Apoyo
          </h3>
        </div>
        <div className="p-3 space-y-2">
          {resources.map((res) => (
            <div 
              key={res.id} 
              className={`flex items-center justify-between p-3 rounded-2xl transition-colors border border-transparent group cursor-pointer ${!isGuest ? 'hover:bg-muted/50 hover:border-border' : 'opacity-60 grayscale'}`}
              onClick={() => handleResourceClick(res)}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="bg-background p-2 rounded-xl shadow-sm border group-hover:bg-primary/5 transition-colors">
                  {getIcon(res.type)}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold truncate pr-2">{res.title}</p>
                  <span className="text-[10px] text-muted-foreground uppercase">{res.type}</span>
                </div>
              </div>
              {!isGuest ? (
                <Eye className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </div>
          ))}
        </div>
        {isGuest && (
          <div className="px-5 pb-5 pt-2">
            <Link href="/login">
              <Button variant="outline" size="sm" className="w-full text-[10px] h-8 rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 gap-1.5">
                <Lock className="h-3 w-3" /> Iniciar sesión para desbloquear
              </Button>
            </Link>
          </div>
        )}
      </div>

      <Dialog open={!!previewResource} onOpenChange={(open) => !open && setPreviewResource(null)}>
        <DialogContent className="max-w-[95vw] lg:max-w-6xl h-[92vh] flex flex-col p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <DialogHeader className="p-4 md:p-6 border-b flex flex-row items-center justify-between space-y-0 bg-white">
            <DialogTitle className="font-headline font-bold text-lg md:text-xl flex items-center gap-3 truncate max-w-[70%]">
              {previewResource && getIcon(previewResource.type)}
              <span className="truncate">{previewResource?.title}</span>
            </DialogTitle>
            <div className="flex items-center gap-2 pr-10">
               {previewResource && !isGuest && (
                 <a href={previewResource.contentUrl} target="_blank" rel="noopener noreferrer">
                   <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl hidden sm:flex">
                     <Download className="h-4 w-4" />
                     Abrir Original
                   </Button>
                   <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl sm:hidden">
                     <ExternalLink className="h-4 w-4" />
                   </Button>
                 </a>
               )}
            </div>
          </DialogHeader>
          
          <div className="flex-1 bg-slate-100 relative">
            {previewResource && !isGuest && isEmbeddable(previewResource) ? (
              <iframe 
                src={getPreviewUrl(previewResource)} 
                className="w-full h-full border-none bg-white"
                title={previewResource.title}
                allow="autoplay"
              />
            ) : previewResource && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center gap-6 bg-white">
                <div className="bg-primary/5 p-6 rounded-full">
                  <LinkIcon className="h-12 w-12 text-primary" />
                </div>
                <div className="space-y-2 max-w-md">
                  <h3 className="font-bold text-lg">Este recurso requiere abrirse externamente</h3>
                  <p className="text-sm text-muted-foreground">Por políticas de seguridad del sitio de origen (como Notion o algunos servicios de Microsoft), este contenido debe verse en su propia pestaña.</p>
                </div>
                {!isGuest && (
                  <a href={previewResource.contentUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="h-12 px-8 rounded-xl gap-2 text-lg shadow-lg">
                      Ver material completo
                      <ExternalLink className="h-5 w-5" />
                    </Button>
                  </a>
                )}
              </div>
            )}
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

  const isUrl = (str: string) => {
    if (!str) return false;
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div className="border-b last:border-0">
      <div className="bg-muted/10 px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider">
        Módulo {index + 1}: {module.title}
      </div>
      <div className="divide-y divide-border/50">
        {lessons?.map(lesson => {
          const isActive = lesson.id === activeLessonId;
          const lessonTitle = isUrl(lesson.title) ? "Video Clase" : lesson.title;
          return (
            <Link 
              key={lesson.id} 
              href={`/courses/${courseId}/learn/${lesson.id}?moduleId=${module.id}`}
              className={`block px-4 py-3 text-sm transition-colors hover:bg-muted/20 ${isActive ? 'bg-primary/5 text-primary border-l-2 border-primary font-medium' : ''}`}
            >
              <div className="flex items-center gap-3">
                {lesson.type === 'challenge' ? <Code2 className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground/30'}`} /> : <CheckCircle className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground/30'}`} />}
                <span className="truncate">{lessonTitle}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
