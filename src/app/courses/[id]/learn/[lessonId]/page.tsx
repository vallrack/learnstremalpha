
'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { QuizPlayer } from '@/components/challenges/QuizPlayer';
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
  HelpCircle
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
import { FloatingAITutor } from '@/components/ai/FloatingAITutor';

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

  const modulesQuery = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return query(collection(db, 'courses', courseId, 'modules'), orderBy('orderIndex', 'asc'));
  }, [db, courseId]);
  const { data: modules, isLoading: isModulesLoading } = useCollection(modulesQuery);

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

    // Enviar certificado por correo
    const { sendCertificateAction } = await import('@/app/actions/email');
    sendCertificateAction(user.uid, courseId).then(res => {
      if (res.success) {
        toast({
          title: "¡Certificado enviado!",
          description: "Revisa tu bandeja de entrada; hemos enviado tu diploma oficial.",
        });
      }
    });

    toast({
      title: "¡Lección completada!",
      description: "Tu progreso ha sido guardado.",
      action: <Button size="sm" className="gap-2" onClick={() => router.push(`/courses/${courseId}/certificate`)}><Award className="h-4 w-4" /> Certificado</Button>,
    });
  };

  if (isCourseLoading || isLessonLoading || isModulesLoading) {
    return <div className="h-screen flex flex-col items-center justify-center gap-4"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-muted-foreground animate-pulse font-medium">Cargando lección...</p></div>;
  }

  if (!course || !currentLesson) return <div className="h-screen flex items-center justify-center">No encontrado</div>;

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
                <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-[3rem] border shadow-sm text-center space-y-8 animate-in fade-in zoom-in duration-500">
                  <div className="bg-primary/10 p-8 rounded-[2rem] shadow-inner"><Code2 className="h-16 w-16 text-primary" /></div>
                  <div className="space-y-3 max-w-lg">
                    <Badge variant="secondary" className="px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-primary/5 text-primary">Desafío Técnico</Badge>
                    <h2 className="text-3xl font-headline font-bold text-slate-900">{currentLesson.title}</h2>
                    <p className="text-muted-foreground leading-relaxed">Esta lección consiste en un reto práctico. Pon a prueba tus conocimientos y recibe feedback instantáneo de nuestra IA.</p>
                  </div>
                  <Link href={`/challenges/${currentLesson.challengeId}`}><Button className="h-16 px-12 rounded-[1.5rem] text-xl font-bold gap-3 shadow-2xl shadow-primary/30 group"><PlayCircle className="h-6 w-6 group-hover:scale-110 transition-transform" /> Aceptar Desafío <ArrowRight className="h-5 w-5 ml-1" /></Button></Link>
                </div>
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
      <FloatingAITutor lessonTitle={currentLesson.title} lessonContent={currentLesson.description || ''} />
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
