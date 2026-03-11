
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
  Paperclip,
  Upload,
  Link as LinkIcon,
  X,
  FileText,
  Presentation
} from 'lucide-react';
import { 
  useCollection, 
  useDoc, 
  useFirestore, 
  useStorage,
  useMemoFirebase, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

export default function CourseContentAdminPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const db = useFirestore();

  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleOrder, setModuleOrder] = useState('0');

  const courseRef = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return doc(db, 'courses', courseId);
  }, [db, courseId]);
  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);

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
      instructorId: course.instructorId,
      courseIsFree: course.isFree ?? true,
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
                          <p className="text-xs font-bold text-primary uppercase tracking-wider">Módulo {i + 1}</p>
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

  const { data: lessons } = useCollection(lessonsQuery);

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
      instructorId: course.instructorId,
      courseIsFree: course.isFree ?? true,
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

  const handleDelete = (lessonId: string) => {
    if (!db || !confirm('¿Eliminar lección?')) return;
    deleteDocumentNonBlocking(doc(db, 'courses', course.id, 'modules', moduleId, 'lessons', lessonId));
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
                <Input placeholder="URL Video (YouTube)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
                <Textarea placeholder="Descripción o Contenido" value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[150px]" />
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="prem" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} />
                  <Label htmlFor="prem">Lección Premium (Requiere suscripción)</Label>
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
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-sm">{lesson.title}</p>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(lesson)}><Edit className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(lesson.id)}><Trash2 className="h-3 w-3" /></Button>
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
  const storage = useStorage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('pdf');
  const [contentUrl, setContentUrl] = useState('');

  const resourcesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'courses', course.id, 'modules', moduleId, 'lessons', lesson.id, 'resources'), orderBy('orderIndex', 'asc'));
  }, [db, course.id, moduleId, lesson.id]);

  const { data: resources } = useCollection(resourcesQuery);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage) return;

    setUploading(true);
    setUploadProgress(0);
    
    try {
      const storageRef = ref(storage, `courses/${course.id}/resources/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => {
          console.error("Upload task failed", error);
          alert(`Error al subir: ${error.message}. Verifica los permisos de Storage.`);
          setUploading(false);
        }, 
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setContentUrl(url);
          if (!title) setTitle(file.name);
          
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (ext === 'pdf') setType('pdf');
          else if (['doc', 'docx'].includes(ext!)) setType('word');
          else if (['ppt', 'pptx', 'pps', 'ppsx'].includes(ext!)) setType('ppt');
          
          setUploading(false);
        }
      );
    } catch (err: any) {
      console.error("General upload error", err);
      alert("Hubo un error inesperado al iniciar la subida.");
      setUploading(false);
    }
  };

  const handleSaveResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !contentUrl) return;

    const resourceData = {
      title,
      type,
      contentUrl,
      orderIndex: 0,
      lessonId: lesson.id,
      instructorId: course.instructorId,
      courseIsFree: course.isFree ?? true,
      lessonIsPremium: lesson.isPremium ?? false,
      updatedAt: serverTimestamp(),
    };

    addDocumentNonBlocking(collection(db, 'courses', course.id, 'modules', moduleId, 'lessons', lesson.id, 'resources'), {
      ...resourceData,
      createdAt: serverTimestamp(),
    });
    
    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setType('pdf');
    setContentUrl('');
    setUploadProgress(0);
  };

  const handleDeleteResource = (resourceId: string) => {
    if (!db || !confirm('¿Eliminar recurso?')) return;
    deleteDocumentNonBlocking(doc(db, 'courses', course.id, 'modules', moduleId, 'lessons', lesson.id, 'resources', resourceId));
  };

  return (
    <div className="mt-4 border-t pt-2">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Paperclip className="h-3 w-3" /> Material de Apoyo</p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button size="sm" variant="ghost" className="h-6 text-[10px] border">Añadir Archivo/Link</Button></DialogTrigger>
          <DialogContent className="rounded-3xl">
            <form onSubmit={handleSaveResource}>
              <DialogHeader><DialogTitle>Nuevo Recurso</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Recurso</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">Documento PDF (Subir)</SelectItem>
                      <SelectItem value="word">Documento Word (Subir)</SelectItem>
                      <SelectItem value="ppt">PowerPoint (Subir)</SelectItem>
                      <SelectItem value="link">Enlace Externo (Drive, OneDrive, etc.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {type !== 'link' ? (
                  <div className="space-y-2">
                    <Label>Subir Archivo</Label>
                    <div className="border-2 border-dashed rounded-xl p-4 text-center min-h-[100px] flex flex-col items-center justify-center gap-4">
                      {uploading ? (
                        <div className="flex flex-col items-center gap-3 w-full max-w-[200px]">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <div className="w-full">
                            <Progress value={uploadProgress} className="h-1" />
                            <span className="text-[10px] text-muted-foreground mt-1 block">{Math.round(uploadProgress)}% subido</span>
                          </div>
                        </div>
                      ) : contentUrl ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1 rounded-full">
                            Archivo listo <X className="h-3 w-3 cursor-pointer" onClick={() => setContentUrl('')} />
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{contentUrl.split('/').pop()}</p>
                        </div>
                      ) : (
                        <>
                          <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} />
                          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2 w-full">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Haz clic para seleccionar un archivo</span>
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
                    <LinkIcon className="h-5 w-5 text-primary mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Pega una URL compartida de <strong>Google Drive, OneDrive, Notion</strong> o cualquier sitio externo.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Título del Recurso</Label>
                  <Input placeholder="Ej: Guía de ejercicios" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>

                <div className="space-y-2">
                  <Label>{type === 'link' ? 'URL del Enlace' : 'URL del Archivo (Generada automáticamente)'}</Label>
                  <Input 
                    placeholder="https://drive.google.com/..." 
                    value={contentUrl} 
                    onChange={(e) => setContentUrl(e.target.value)} 
                    required 
                    readOnly={type !== 'link'}
                    className={type !== 'link' ? 'bg-muted' : ''}
                  />
                </div>
              </div>
              <DialogFooter><Button type="submit" className="w-full" disabled={uploading || !contentUrl}>Guardar Recurso</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {resources?.map((res) => (
          <div key={res.id} className="text-[10px] p-2 bg-white border rounded-lg flex items-center justify-between group">
            <span className="truncate pr-2 flex items-center gap-1">
              {res.type === 'link' ? <LinkIcon className="h-3 w-3" /> : res.type === 'pdf' ? <FileText className="h-3 w-3 text-red-500" /> : <Paperclip className="h-3 w-3" />}
              {res.title}
            </span>
            <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteResource(res.id)}>
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
