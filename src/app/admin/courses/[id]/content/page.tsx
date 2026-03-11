'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  Loader2, 
  GripVertical, 
  Video, 
  FileText,
  FileDown,
  Link as LinkIcon,
  Presentation,
  Paperclip
} from 'lucide-react';
import { 
  useCollection, 
  useDoc, 
  useFirestore, 
  useMemoFirebase, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CourseContentAdminPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const db = useFirestore();

  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  
  // Module Form
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleOrder, setModuleOrder] = useState('0');

  // Fetch Course
  const courseRef = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return doc(db, 'courses', courseId);
  }, [db, courseId]);
  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);

  // Fetch Modules
  const modulesQuery = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return query(collection(db, 'courses', courseId, 'modules'), orderBy('orderIndex', 'asc'));
  }, [db, courseId]);
  const { data: modules, isLoading: isModulesLoading } = useCollection(modulesQuery);

  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !course) return;

    const moduleData = {
      title: moduleTitle,
      orderIndex: parseInt(moduleOrder),
      courseId: courseId,
      instructorId: course.instructorId, // Denormalization
      courseIsFree: course.isFree ?? true, // Denormalization
      updatedAt: serverTimestamp(),
    };

    if (editingModule) {
      updateDocumentNonBlocking(doc(db, 'courses', courseId, 'modules', editingModule.id), moduleData);
    } else {
      addDocumentNonBlocking(collection(db, 'courses', courseId, 'modules'), {
        ...moduleData,
        createdAt: serverTimestamp(),
      });
    }
    setIsModuleDialogOpen(false);
    resetModuleForm();
  };

  const resetModuleForm = () => {
    setEditingModule(null);
    setModuleTitle('');
    setModuleOrder('0');
  };

  const handleDeleteModule = (moduleId: string) => {
    if (!db || !confirm('¿Estás seguro de eliminar este módulo?')) return;
    deleteDocumentNonBlocking(doc(db, 'courses', courseId, 'modules', moduleId));
  };

  if (isCourseLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-5xl mx-auto px-6 py-12">
        <header className="mb-12 flex flex-col gap-6">
          <Button variant="ghost" onClick={() => router.back()} className="w-fit -ml-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver a Cursos
          </Button>
          
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-headline font-bold mb-2">Contenido: {course?.title}</h1>
              <p className="text-muted-foreground">Organiza los módulos, lecciones y recursos.</p>
            </div>
            
            <Dialog open={isModuleDialogOpen} onOpenChange={(open) => {
              setIsModuleDialogOpen(open);
              if (!open) resetModuleForm();
            }}>
              <DialogTrigger asChild>
                <Button className="rounded-xl h-11 gap-2 shadow-lg shadow-primary/10">
                  <Plus className="h-4 w-4" />
                  Añadir Módulo
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl">
                <form onSubmit={handleSaveModule}>
                  <DialogHeader>
                    <DialogTitle>{editingModule ? 'Editar Módulo' : 'Nuevo Módulo'}</DialogTitle>
                    <DialogDescription>Define el título y el orden del módulo.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="m-title">Título del Módulo</Label>
                      <Input id="m-title" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} required placeholder="Ej: Fundamentos" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="m-order">Orden (Index)</Label>
                      <Input id="m-order" type="number" value={moduleOrder} onChange={(e) => setModuleOrder(e.target.value)} required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full rounded-xl h-11">Guardar Módulo</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <section className="space-y-4">
          {isModulesLoading ? (
            <div className="py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {modules?.map((module, i) => (
                <AccordionItem key={module.id} value={module.id} className="bg-white border rounded-2xl overflow-hidden px-4 shadow-sm">
                  <div className="flex items-center gap-2 group pr-4">
                    <AccordionTrigger className="flex-1 hover:no-underline py-6">
                      <div className="flex items-center gap-4 text-left">
                        <div className="bg-muted p-2 rounded-lg"><GripVertical className="h-4 w-4 text-muted-foreground" /></div>
                        <div>
                          <p className="text-xs font-bold text-primary uppercase tracking-wider">Módulo {module.orderIndex ?? i}</p>
                          <p className="text-lg font-bold">{module.title}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={(e) => {
                        e.stopPropagation();
                        setEditingModule(module);
                        setModuleTitle(module.title);
                        setModuleOrder(module.orderIndex?.toString() || '0');
                        setIsModuleDialogOpen(true);
                      }}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteModule(module.id);
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <AccordionContent className="pb-6 border-t pt-4">
                    <LessonManager course={course} moduleId={module.id} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </section>
      </main>
    </div>
  );
}

function LessonManager({ course, moduleId }: { course: any, moduleId: string }) {
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('10');
  const [order, setOrder] = useState('0');
  const [isPremium, setIsPremium] = useState(false);

  const lessonsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'courses', course.id, 'modules', moduleId, 'lessons'), orderBy('orderIndex', 'asc'));
  }, [db, course.id, moduleId]);

  const { data: lessons, isLoading } = useCollection(lessonsQuery);

  const handleSaveLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    const lessonData = {
      title,
      description,
      videoUrl,
      durationInMinutes: parseInt(duration),
      orderIndex: parseInt(order),
      isPremium,
      moduleId,
      instructorId: course.instructorId, // Denormalization
      courseIsFree: course.isFree ?? true, // Denormalization
      updatedAt: serverTimestamp(),
    };

    if (editingLesson) {
      updateDocumentNonBlocking(doc(db, 'courses', course.id, 'modules', moduleId, 'lessons', editingLesson.id), lessonData);
    } else {
      addDocumentNonBlocking(collection(db, 'courses', course.id, 'modules', moduleId, 'lessons'), {
        ...lessonData,
        createdAt: serverTimestamp(),
      });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingLesson(null);
    setTitle('');
    setDescription('');
    setVideoUrl('');
    setDuration('10');
    setOrder('0');
    setIsPremium(false);
  };

  const handleEdit = (lesson: any) => {
    setEditingLesson(lesson);
    setTitle(lesson.title || '');
    setDescription(lesson.description || '');
    setVideoUrl(lesson.videoUrl || '');
    setDuration(lesson.durationInMinutes?.toString() || '10');
    setOrder(lesson.orderIndex?.toString() || '0');
    setIsPremium(lesson.isPremium || false);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-muted-foreground uppercase">Lecciones</h4>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 rounded-lg">
              <Plus className="h-3 w-3 mr-1" /> Añadir Lección
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <form onSubmit={handleSaveLesson}>
              <DialogHeader><DialogTitle>Lección</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <Input placeholder="URL Video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                <Textarea placeholder="Contenido" value={description} onChange={(e) => setDescription(e.target.value)} />
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="prem" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} />
                  <Label htmlFor="prem">Premium</Label>
                </div>
              </div>
              <DialogFooter><Button type="submit" className="w-full">Guardar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-4">
        {lessons?.map((lesson) => (
          <div key={lesson.id} className="bg-slate-50 p-4 rounded-2xl border">
            <div className="flex items-center justify-between">
              <p className="font-bold text-sm">{lesson.title}</p>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(lesson)}><Edit className="h-3 w-3" /></Button>
              </div>
            </div>
            <ResourceManager course={course} moduleId={moduleId} lesson={lesson} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ResourceManager({ course, moduleId, lesson }: { course: any, moduleId: string, lesson: any }) {
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('pdf');
  const [contentUrl, setContentUrl] = useState('');

  const resourcesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'courses', course.id, 'modules', moduleId, 'lessons', lesson.id, 'resources'), orderBy('orderIndex', 'asc'));
  }, [db, course.id, moduleId, lesson.id]);

  const { data: resources } = useCollection(resourcesQuery);

  const handleSaveResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    const resourceData = {
      title,
      type,
      contentUrl,
      orderIndex: 0,
      lessonId: lesson.id,
      instructorId: course.instructorId, // Denormalization
      courseIsFree: course.isFree ?? true, // Denormalization
      lessonIsPremium: lesson.isPremium ?? false, // Denormalization
      updatedAt: serverTimestamp(),
    };

    if (editingResource) {
      updateDocumentNonBlocking(doc(db, 'courses', course.id, 'modules', moduleId, 'lessons', lesson.id, 'resources', editingResource.id), resourceData);
    } else {
      addDocumentNonBlocking(collection(db, 'courses', course.id, 'modules', moduleId, 'lessons', lesson.id, 'resources'), {
        ...resourceData,
        createdAt: serverTimestamp(),
      });
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingResource(null);
    setTitle('');
    setType('pdf');
    setContentUrl('');
  };

  return (
    <div className="mt-4 border-t pt-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Paperclip className="h-3 w-3" /> Recursos</p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button size="sm" variant="ghost" className="h-6 text-[10px] border">Añadir</Button></DialogTrigger>
          <DialogContent className="rounded-3xl">
            <form onSubmit={handleSaveResource}>
              <DialogHeader><DialogTitle>Recurso</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="word">Word</SelectItem>
                    <SelectItem value="ppt">PowerPoint</SelectItem>
                    <SelectItem value="link">Link</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="URL" value={contentUrl} onChange={(e) => setContentUrl(e.target.value)} required />
              </div>
              <DialogFooter><Button type="submit" className="w-full">Guardar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {resources?.map((res) => (
          <div key={res.id} className="text-[10px] p-2 bg-white border rounded-lg truncate">{res.title}</div>
        ))}
      </div>
    </div>
  );
}
