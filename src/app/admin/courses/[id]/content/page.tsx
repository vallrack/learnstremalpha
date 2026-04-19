
'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Code2,
  AlertTriangle,
  PlayCircle,
  HelpCircle,
  CheckCircle2,
  Mic2,
  Copy,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cloneCourseContent } from '@/lib/course-duplication';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { 
  useCollection, 
  useDoc, 
  useFirestore, 
  useStorage,
  useUser,
  useAuth,
  useMemoFirebase, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
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
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BulkEnrollmentModal } from '@/components/admin/BulkEnrollmentModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GroupsManager } from '@/components/courses/GroupsManager';
import { VirtualClassesManager } from '@/components/courses/VirtualClassesManager';

export default function CourseContentAdminPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const db = useFirestore();
  const { user } = useUser();
  const auth = useAuth();
  const { toast } = useToast();

  const [isRecalculating, setIsRecalculating] = useState(false);

  const recalculateCourseStats = async () => {
    if (!db || !courseId) return;
    setIsRecalculating(true);
    try {
      const { getDocs, collection } = await import('firebase/firestore');
      const modsSnap = await getDocs(collection(db, 'courses', courseId, 'modules'));
      const totalModules = modsSnap.size;
      
      let totalLessons = 0;
      for (const mod of modsSnap.docs) {
        const lessonsSnap = await getDocs(collection(db, 'courses', courseId, 'modules', mod.id, 'lessons'));
        totalLessons += lessonsSnap.size;
      }
      
      await updateDocumentNonBlocking(doc(db, 'courses', courseId), {
        totalModules,
        totalLessons,
        updatedAt: serverTimestamp()
      });
      
      toast({ title: "Estadísticas actualizadas", description: `Módulos: ${totalModules}, Lecciones: ${totalLessons}` });
    } catch (err) {
      console.error("Error recalculating stats:", err);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron actualizar las estadísticas." });
    } finally {
      setIsRecalculating(false);
    }
  };

  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleOrder, setModuleOrder] = useState('0');
  const [moduleIsPremium, setModuleIsPremium] = useState(false);
  const [modulePrice, setModulePrice] = useState('0');
  const [moduleCurrency, setModuleCurrency] = useState('COP');

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importSourceId, setImportSourceId] = useState<string | null>(null);
  const [importSelectedModules, setImportSelectedModules] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const courseRef = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return doc(db, 'courses', courseId);
  }, [db, courseId]);
  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  
  const isAdmin = profile?.role === 'admin';
  const isInstructor = user?.uid === course?.instructorId;
  const isAuthorized = isAdmin || isInstructor;

  const modulesQuery = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return query(collection(db, 'courses', courseId, 'modules'), orderBy('orderIndex', 'asc'));
  }, [db, courseId]);
  const { data: modules, isLoading: isModulesLoading } = useCollection(modulesQuery);

  const allCoursesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'courses');
  }, [db]);
  const { data: allCourses } = useCollection(allCoursesQuery);

  const sourceModulesQuery = useMemoFirebase(() => {
    if (!db || !importSourceId) return null;
    return query(collection(db, 'courses', importSourceId, 'modules'), orderBy('orderIndex', 'asc'));
  }, [db, importSourceId]);
  const { data: sourceModules } = useCollection(sourceModulesQuery);

  const handleImport = async () => {
    try {
      const startOrder = (modules?.length || 0);
      const idToken = await (auth?.currentUser?.getIdToken() || user?.getIdToken());
      
      if (!idToken) throw new Error("No se pudo obtener el token de autenticación");

      await cloneCourseContent(idToken, importSourceId, courseId, user.uid, {
        moduleIds: importSelectedModules,
        startOrderIndex: startOrder
      });
      setIsImportDialogOpen(false);
      setImportSourceId(null);
      setImportSelectedModules([]);
      router.refresh();
      // Nota: toast se disparará si hay un hook de toast disponible, pero aquí usamos las alertas estándar
    } catch (error) {
      console.error("Error importing modules:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !course) return;

    const moduleData = {
      title: moduleTitle,
      orderIndex: parseInt(moduleOrder),
      isPremium: moduleIsPremium,
      courseId: courseId,
      instructorId: course.instructorId,
      courseIsFree: course.isFree ?? true,
      price: moduleIsPremium ? parseFloat(modulePrice) || 0 : 0,
      currency: moduleCurrency,
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
    setTimeout(recalculateCourseStats, 1000); // Dar tiempo a que Firestore se actualice
    router.refresh();
  };

  const resetModuleForm = () => {
    setEditingModule(null);
    setModuleTitle('');
    setModuleOrder('0');
    setModuleIsPremium(false);
    setModulePrice('0');
    setModuleCurrency('COP');
  };

  const handleDeleteModule = (moduleId: string) => {
    if (!db || !isAuthorized) return;
    if (confirm('¿Estás seguro de eliminar este módulo y todo su contenido?')) {
      deleteDocumentNonBlocking(doc(db, 'courses', courseId, 'modules', moduleId));
      setTimeout(recalculateCourseStats, 1000);
      router.refresh();
    }
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
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">{course?.technology || 'Sin tecnología'}</Badge>
                <h1 className="text-4xl font-headline font-bold">Contenido: {course?.title}</h1>
              </div>
              <p className="text-muted-foreground">Gestiona módulos, lecciones y desafíos compatibles con {course?.technology || 'su tecnología'}.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-xl h-11 w-11 text-muted-foreground hover:text-primary transition-all"
                onClick={recalculateCourseStats}
                disabled={isRecalculating}
              >
                <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
              </Button>

              {isAuthorized && course && <BulkEnrollmentModal courseId={courseId} courseTitle={course.title} />}
              
              <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-xl h-11 gap-2">
                    <Copy className="h-4 w-4" />
                    Importar
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-3xl sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Importar Contenido</DialogTitle>
                    <DialogDescription>Selecciona un curso y luego los módulos que deseas copiar a este programa.</DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    <div className="grid gap-2">
                      <Label>Seleccionar Curso Origen</Label>
                      <Select value={importSourceId || ''} onValueChange={(val) => {
                        setImportSourceId(val);
                        setImportSelectedModules([]);
                      }}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder="Buscar curso..." /></SelectTrigger>
                        <SelectContent>
                          {allCourses?.filter(c => c.id !== courseId).map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {importSourceId && (
                      <div className="space-y-3">
                        <Label className="font-bold">Módulos Disponibles</Label>
                        <div className="bg-muted/30 rounded-2xl border p-4 space-y-3">
                          {sourceModules?.map(m => (
                            <div key={m.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded-xl transition-colors">
                              <Checkbox 
                                id={`mod-${m.id}`} 
                                checked={importSelectedModules.includes(m.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) setImportSelectedModules([...importSelectedModules, m.id]);
                                  else setImportSelectedModules(importSelectedModules.filter(id => id !== m.id));
                                }}
                              />
                              <Label htmlFor={`mod-${m.id}`} className="flex-1 cursor-pointer font-medium">{m.title}</Label>
                            </div>
                          ))}
                          {(!sourceModules || sourceModules.length === 0) && (
                            <p className="text-xs text-muted-foreground italic p-4 text-center">Este curso no tiene módulos aún.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button 
                      onClick={handleImport} 
                      disabled={isImporting || importSelectedModules.length === 0}
                      className="w-full rounded-xl h-12 gap-2"
                    >
                      {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                      Importar {importSelectedModules.length} Módulo(s)
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

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
                    <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl mt-2">
                      <input 
                        type="checkbox" 
                        id="m-prem" 
                        checked={moduleIsPremium} 
                        onChange={(e) => setModuleIsPremium(e.target.checked)} 
                        className="h-4 w-4 rounded border-gray-300 text-primary" 
                      />
                      <Label htmlFor="m-prem" className="text-xs font-bold">Módulo Premium (Bloquea todas las lecciones internas)</Label>
                    </div>

                    {moduleIsPremium && (
                      <div className="grid grid-cols-2 gap-4 p-4 border-2 border-primary/20 rounded-2xl bg-primary/5 animate-in fade-in slide-in-from-top-2">
                        <div className="grid gap-2">
                          <Label htmlFor="m-price">Precio de Desbloqueo</Label>
                          <Input id="m-price" type="number" value={modulePrice} onChange={(e) => setModulePrice(e.target.value)} required placeholder="Ej: 50000" className="bg-white" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="m-currency">Moneda</Label>
                          <Select value={moduleCurrency} onValueChange={setModuleCurrency}>
                            <SelectTrigger id="m-currency" className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="COP">COP (Pesos Colombianos)</SelectItem>
                              <SelectItem value="USD">USD (Dólares)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full rounded-xl h-11">Guardar Módulo</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            </div>
          </div>
        </header>

        <Tabs defaultValue="modules" className="w-full">
          <TabsList className="mb-8 p-1 bg-slate-100/80 rounded-xl overflow-x-auto w-full justify-start h-auto flex flex-wrap border">
            <TabsTrigger value="modules" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary border-transparent data-[state=active]:border-slate-200">
              Contenido y Módulos
            </TabsTrigger>
            <TabsTrigger value="groups" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary border-transparent data-[state=active]:border-slate-200">
              Grupos y Sub-cohortes
            </TabsTrigger>
            <TabsTrigger value="virtual" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary border-transparent data-[state=active]:border-slate-200">
              Clases en Vivo
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="modules" className="space-y-4 animate-in fade-in">
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
                          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={(e) => {
                            e.stopPropagation();
                            setEditingModule(module);
                            setModuleTitle(module.title);
                            setModuleOrder(module.orderIndex?.toString() || '0');
                            setModuleIsPremium(module.isPremium || false);
                            setModulePrice(module.price?.toString() || '0');
                            setModuleCurrency(module.currency || 'COP');
                            setIsModuleDialogOpen(true);
                          }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isAuthorized && (
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteModule(module.id);
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <AccordionContent className="pb-6 border-t pt-4">
                        <LessonManager course={course} moduleId={module.id} isAuthorized={isAuthorized} onContentChange={recalculateCourseStats} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </section>
          </TabsContent>
          
          <TabsContent value="groups">
            <GroupsManager courseId={courseId} isAuthorized={isAuthorized} />
          </TabsContent>
          
          <TabsContent value="virtual">
            <VirtualClassesManager courseId={courseId} isAuthorized={isAuthorized} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function LessonManager({ course, moduleId, isAuthorized, onContentChange }: { course: any, moduleId: string, isAuthorized: boolean, onContentChange?: () => void }) {
  const router = useRouter();
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);

  const [type, setType] = useState<'video' | 'challenge' | 'quiz' | 'podcast'>('video');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState('10');
  const [order, setOrder] = useState('0');
  const [isPremium, setIsPremium] = useState(false);
  const [price, setPrice] = useState('0');
  const [currency, setCurrency] = useState('COP');
  const [challengeId, setChallengeId] = useState('');
  const [podcastId, setPodcastId] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [showAllChallenges, setShowAllChallenges] = useState(false);

  const challengesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'coding_challenges');
  }, [db]);
  const { data: allChallenges } = useCollection(challengesQuery);
  
  const compatibleChallenges = useMemo(() => {
    if (!allChallenges) return [];
    if (showAllChallenges) return allChallenges;
    if (!course?.technology) return allChallenges;

    const courseT = course.technology.toLowerCase();

    return allChallenges.filter((c: any) => {
      // Si el reto no tiene tecnología, no mostrarlo a menos que se active "Ver Todas"
      if (!c.technology) return false;
      const chalT = c.technology.toLowerCase();
      
      // Mostrar solo si coinciden, o si una incluye a la otra (ej. Python === Python con Tkinter)
      if (courseT === chalT || courseT.includes(chalT) || chalT.includes(courseT)) return true;

      return false;
    });
  }, [allChallenges, course?.technology, showAllChallenges]);

  const podcastsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'podcasts');
  }, [db]);
  const { data: allPodcasts } = useCollection(podcastsQuery);
  const availablePodcasts = allPodcasts || [];

  const lessonsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'courses', course.id, 'modules', moduleId, 'lessons'), orderBy('orderIndex', 'asc'));
  }, [db, course.id, moduleId]);
  const { data: lessons } = useCollection(lessonsQuery);
  
  useEffect(() => {
    if (type === 'challenge' && challengeId && allChallenges) {
      const challenge = allChallenges.find(c => c.id === challengeId);
      if (challenge && challenge.price !== undefined) {
        setPrice(challenge.price.toString());
        setCurrency(challenge.currency || 'COP');
        if (challenge.price > 0) setIsPremium(true);
      }
    }
  }, [challengeId, type, allChallenges]);

  const resetForm = () => {
    setEditingLesson(null);
    setType('video');
    setTitle('');
    setDescription('');
    setVideoUrl('');
    setChallengeId('');
    setPodcastId('');
    setDuration('10');
    setOrder('0');
    setIsPremium(false);
    setPrice('0');
    setCurrency('COP');
    setQuestions([]);
    setShowAllChallenges(false);
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;

    const lessonData: any = {
      title,
      description: type === 'video' ? '' : description, 
      type,
      durationInMinutes: parseInt(duration),
      orderIndex: parseInt(order),
      isPremium,
      moduleId,
      instructorId: course.instructorId,
      courseIsFree: course.isFree ?? true,
      price: isPremium ? parseFloat(price) || 0 : 0,
      currency: currency,
      updatedAt: serverTimestamp(),
    };

    try {
      const lId = editingLesson?.id || doc(collection(db, 'courses', course.id, 'modules', moduleId, 'lessons')).id;
      const lessonRef = doc(db, 'courses', course.id, 'modules', moduleId, 'lessons', lId);

      await setDoc(lessonRef, {
        ...lessonData,
        updatedAt: serverTimestamp(),
        ...(editingLesson ? {} : { createdAt: serverTimestamp() })
      }, { merge: true });

      const sensitiveData: any = {};
      if (type === 'video') {
        sensitiveData.videoUrl = videoUrl;
        sensitiveData.description = description;
      } else if (type === 'quiz') {
        sensitiveData.questions = questions;
      } else if (type === 'challenge') {
        sensitiveData.challengeId = challengeId;
      } else if (type === 'podcast') {
        sensitiveData.podcastId = podcastId;
      }

      const premiumRef = doc(db, 'courses', course.id, 'modules', moduleId, 'lessons', lId, 'premium', 'data');
      await setDoc(premiumRef, {
        ...sensitiveData,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setIsDialogOpen(false);
      resetForm();
      if (onContentChange) setTimeout(onContentChange, 1000);
      router.refresh();
    } catch (err: any) {
      console.error("Error saving lesson:", err);
    }
  };

  const handleEdit = async (lesson: any) => {
    setEditingLesson(lesson);
    setType(lesson.type || 'video');
    setTitle(lesson.title || '');
    setDuration(lesson.durationInMinutes?.toString() || '10');
    setOrder(lesson.orderIndex?.toString() || '0');
    setIsPremium(lesson.isPremium || false);
    setPrice(lesson.price?.toString() || '0');
    setCurrency(lesson.currency || 'COP');

    // Cargar contenido sensible desde la subcolección
    if (db) {
      try {
        const premiumRef = doc(db, 'courses', course.id, 'modules', moduleId, 'lessons', lesson.id, 'premium', 'data');
        const snap = await getDoc(premiumRef);
        if (snap.exists()) {
          const pData = snap.data();
          setDescription(pData.description || lesson.description || '');
          setVideoUrl(pData.videoUrl || '');
          setQuestions(pData.questions || []);
          setChallengeId(pData.challengeId || lesson.challengeId || '');
          setPodcastId(pData.podcastId || lesson.podcastId || '');
        } else {
          // Fallback a campos legacy
          setDescription(lesson.description || '');
          setVideoUrl(lesson.videoUrl || '');
          setQuestions(lesson.questions || []);
          setChallengeId(lesson.challengeId || '');
          setPodcastId(lesson.podcastId || '');
        }
      } catch (err) {
        console.error("Error loading lesson premium data:", err);
      }
    }
    
    setIsDialogOpen(true);
  };

  const handleDelete = (lessonId: string) => {
    if (!db || !isAuthorized) return;
    if (confirm('¿Eliminar lección?')) {
      deleteDocumentNonBlocking(doc(db, 'courses', course.id, 'modules', moduleId, 'lessons', lessonId));
      if (onContentChange) setTimeout(onContentChange, 1000);
      router.refresh();
    }
  };

  const addQuestion = () => setQuestions([...questions, { question: '', options: ['', '', ''], correctAnswer: 0 }]);
  const updateQuestion = (index: number, field: string, value: any) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };
  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };
  const addOption = (qIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].options.length < 6) {
      newQuestions[qIndex].options.push('');
      setQuestions(newQuestions);
    }
  };
  const removeOption = (qIndex: number, oIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].options.length > 2) {
      newQuestions[qIndex].options.splice(oIndex, 1);
      if (newQuestions[qIndex].correctAnswer === oIndex) newQuestions[qIndex].correctAnswer = 0;
      else if (newQuestions[qIndex].correctAnswer > oIndex) newQuestions[qIndex].correctAnswer -= 1;
      setQuestions(newQuestions);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-sm text-muted-foreground uppercase">Contenido del Módulo</h4>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button size="sm" variant="outline" className="h-8 rounded-lg"><Plus className="h-3 w-3 mr-1" /> Añadir Contenido</Button></DialogTrigger>
          <DialogContent className="rounded-3xl sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveLesson}>
              <DialogHeader>
                <DialogTitle>{editingLesson ? 'Editar Contenido' : 'Añadir Contenido'}</DialogTitle>
                <DialogDescription>Elige entre clase de video, desafío de código o cuestionario teórico.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-6">
                <div className="grid gap-2">
                  <Label>Tipo de Contenido</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Clase de Video / Texto</SelectItem>
                      <SelectItem value="challenge">Actividad H5P / Desafío / Entrevista</SelectItem>
                      <SelectItem value="podcast">Podcast de la Biblioteca</SelectItem>
                      <SelectItem value="quiz">Cuestionario Teórico Local</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Título de la Clase</Label>
                  <Input placeholder="Ej: Introducción a..." value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-xl" />
                </div>
                {type === 'video' && (
                  <><div className="grid gap-2"><Label>URL del Video (YouTube)</Label><Input placeholder="https://youtube.com/..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="rounded-xl" /></div>
                  <div className="grid gap-2"><Label>Descripción o Contenido Escrito</Label><Textarea placeholder="Contenido de la lección..." value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[120px] rounded-xl" /></div></>
                )}
                {type === 'challenge' && (
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Vincular Desafío o Actividad Global</Label>
                      <div className="flex items-center gap-2">
                        <Label className="text-[10px] text-muted-foreground cursor-pointer uppercase font-bold tracking-wider" htmlFor="showAll">Ver Todas</Label>
                        <Switch id="showAll" checked={showAllChallenges} onCheckedChange={setShowAllChallenges} className="scale-75 data-[state=checked]:bg-primary" />
                      </div>
                    </div>
                    <Select value={challengeId} onValueChange={setChallengeId} required>
                      <SelectTrigger className="rounded-xl h-14 border-2 transition-all hover:border-primary/50"><SelectValue placeholder="Elige un reto o actividad de la biblioteca..." /></SelectTrigger>
                      <SelectContent className="rounded-2xl max-h-[300px]">
                        {compatibleChallenges.map(c => (
                          <SelectItem key={c.id} value={c.id} className="rounded-xl my-1 p-3">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                  {['swipe', 'flashcard', 'interactive-video', 'dragdrop', 'sortable', 'wordsearch'].includes(c.type) ? '🎮' : '💻'}
                               </div>
                               <div className="flex flex-col items-start">
                                  <span className="font-bold text-sm leading-tight">{c.title}</span>
                                  <span className="text-[10px] opacity-60 uppercase font-medium tracking-wider">{c.technology || 'General'} • {c.difficulty} • {c.type}</span>
                               </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {type === 'podcast' && (
                  <div className="grid gap-2"><Label>Seleccionar Podcast de la Biblioteca</Label>
                    <Select value={podcastId} onValueChange={setPodcastId} required>
                      <SelectTrigger className="rounded-xl h-14 border-2 transition-all hover:border-primary/50"><SelectValue placeholder="Elige un podcast para esta lección..." /></SelectTrigger>
                      <SelectContent className="rounded-2xl max-h-[300px]">
                        {availablePodcasts.map(p => (
                          <SelectItem key={p.id} value={p.id} className="rounded-xl my-1 p-3">
                             <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                  <Mic2 className="h-5 w-5" />
                               </div>
                               <div className="flex flex-col items-start">
                                  <span className="font-bold text-sm leading-tight">{p.title}</span>
                                  <span className="text-[10px] opacity-60 uppercase font-medium tracking-wider">{p.category || 'Podcast'} • {p.duration || '00:00'}</span>
                               </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {type === 'quiz' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between"><Label className="text-lg font-bold">Preguntas</Label>
                      <Button type="button" onClick={addQuestion} variant="outline" size="sm" className="rounded-xl gap-2"><Plus className="h-4 w-4" /> Añadir Pregunta</Button>
                    </div>
                    {questions.map((q, qIndex) => (
                      <Card key={qIndex} className="rounded-2xl border-2 border-slate-100 bg-slate-50/50">
                        <CardContent className="p-6 space-y-4">
                          <div className="flex items-start gap-4">
                            <span className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs">{qIndex + 1}</span>
                            <div className="flex-1 space-y-2">
                              <Input placeholder="Escribe la pregunta..." value={q.question} onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)} required className="rounded-xl border-none shadow-none text-sm font-bold bg-transparent" />
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {q.options.map((opt: string, oIndex: number) => (
                                  <div key={oIndex} className="flex items-center gap-2 group">
                                    <input type="radio" name={`correct-${qIndex}`} checked={q.correctAnswer === oIndex} onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)} className="h-4 w-4 text-primary shrink-0" />
                                    <div className="flex-1 relative">
                                      <Input placeholder={`Opción ${oIndex + 1}`} value={opt} onChange={(e) => updateOption(qIndex, oIndex, e.target.value)} required className="rounded-lg h-9 text-xs bg-white pr-8" />
                                      {q.options.length > 2 && (
                                        <button type="button" onClick={() => removeOption(qIndex, oIndex)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="h-3 w-3" /></button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {q.options.length < 6 && (
                                  <Button type="button" variant="ghost" size="sm" onClick={() => addOption(qIndex)} className="h-9 rounded-lg border-2 border-dashed text-[10px] font-bold text-muted-foreground hover:text-primary hover:border-primary/50"><Plus className="h-3 w-3 mr-1" /> Añadir Opción</Button>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))}><X className="h-4 w-4" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>Duración (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="rounded-xl" /></div>
                  <div className="grid gap-2"><Label>Orden</Label><Input type="number" value={order} onChange={(e) => setOrder(e.target.value)} className="rounded-xl" /></div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl">
                  <input type="checkbox" id="prem" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary" />
                  <Label htmlFor="prem" className="text-xs">Lección Premium (Solo suscriptores)</Label>
                </div>
                {isPremium && (
                  <div className="grid grid-cols-2 gap-4 p-4 border-2 border-primary/20 rounded-2xl bg-primary/5">
                    <div className="grid gap-2"><Label htmlFor="l-price">Precio de Desbloqueo</Label><Input id="l-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="Ej: 15000" className="bg-white" /></div>
                    <div className="grid gap-2"><Label htmlFor="l-currency">Moneda</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger id="l-currency" className="bg-white"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="COP">COP (Pesos Colombianos)</SelectItem><SelectItem value="USD">USD (Dólares)</SelectItem></SelectContent></Select></div>
                  </div>
                )}
              </div>
              <DialogFooter><Button type="submit" className="w-full rounded-xl h-11" disabled={(type === 'challenge' && !challengeId) || (type === 'quiz' && questions.length === 0)}>Guardar Contenido</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-4">
        {lessons?.map((lesson) => (
          <div key={lesson.id} className="bg-slate-50 p-4 rounded-2xl border flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  lesson.type === 'challenge' ? 'bg-primary/10 text-primary' : 
                  lesson.type === 'quiz' ? 'bg-amber-100 text-amber-600' : 
                  lesson.type === 'podcast' ? 'bg-indigo-100 text-indigo-600' :
                  'bg-slate-200 text-slate-600'
                }`}>
                  {lesson.type === 'challenge' ? <Code2 className="h-5 w-5" /> : 
                   lesson.type === 'quiz' ? <HelpCircle className="h-5 w-5" /> : 
                   lesson.type === 'podcast' ? <Mic2 className="h-5 w-5" /> :
                   <PlayCircle className="h-5 w-5" />}
                </div>
                <div><div className="flex items-center gap-2"><p className="font-bold text-sm">{lesson.title}</p>{lesson.isPremium && <Badge variant="outline" className="text-[10px] py-0 h-4 bg-amber-50 text-amber-600 border-amber-200">Premium</Badge>}</div><p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{lesson.type === 'challenge' ? 'Actividad / Reto' : lesson.type === 'quiz' ? 'Cuestionario Local' : lesson.type === 'podcast' ? 'Podcast de la Biblioteca' : 'Lección de Contenido'}</p></div>
              </div>
              <div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(lesson)}><Edit className="h-4 w-4" /></Button>
                {isAuthorized && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(lesson.id)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </div>
            {lesson.type === 'video' && <ResourceManager course={course} moduleId={moduleId} lesson={lesson} isAuthorized={isAuthorized} />}
          </div>
        ))}
        {(!lessons || lessons.length === 0) && <div className="py-12 text-center bg-white rounded-2xl border-2 border-dashed"><p className="text-sm text-muted-foreground italic">No hay lecciones en este módulo.</p></div>}
      </div>
    </div>
  );
}

function ResourceManager({ course, moduleId, lesson, isAuthorized }: { course: any, moduleId: string, lesson: any, isAuthorized: boolean }) {
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('pdf');
  const [contentUrl, setContentUrl] = useState('');
  const [uploadType, setUploadType] = useState<'upload' | 'url'>('upload');

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
          alert(`Error al subir: ${error.message}.`);
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
    router.refresh();
  };

  const resetForm = () => {
    setTitle('');
    setType('pdf');
    setContentUrl('');
    setUploadProgress(0);
    setUploadType('upload');
  };

  const handleDeleteResource = (resourceId: string) => {
    if (!db || !isAuthorized) return;
    if (confirm('¿Eliminar recurso?')) {
      deleteDocumentNonBlocking(doc(db, 'courses', course.id, 'modules', moduleId, 'lessons', lesson.id, 'resources', resourceId));
      router.refresh();
    }
  };

  const isGoogleDrive = contentUrl.includes('drive.google.com');

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1"><Paperclip className="h-3 w-3" /> Material de Apoyo</p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild><Button size="sm" variant="ghost" className="h-7 text-[10px] border rounded-lg">Añadir Archivo</Button></DialogTrigger>
          <DialogContent className="rounded-3xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveResource}>
              <DialogHeader><DialogTitle>Nuevo Recurso</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Recurso</Label>
                  <Select value={type} onValueChange={(v) => { setType(v); if(v === 'link') setUploadType('url'); }}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">Documento PDF</SelectItem>
                      <SelectItem value="word">Documento Word</SelectItem>
                      <SelectItem value="ppt">PowerPoint</SelectItem>
                      <SelectItem value="podcast">Podcast / Audio (Drive/Spotify)</SelectItem>
                      <SelectItem value="link">Enlace Externo (Web/Notion)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {type !== 'link' && (
                  <div className="flex bg-slate-100 p-1 rounded-xl mb-2">
                    <button type="button" onClick={() => setUploadType('upload')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${uploadType === 'upload' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}>Subir Archivo</button>
                    <button type="button" onClick={() => setUploadType('url')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${uploadType === 'url' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}>Usar URL (Drive/OneDrive)</button>
                  </div>
                )}

                {uploadType === 'upload' && type !== 'link' ? (
                  <div className="space-y-2">
                    <Label>Subir Archivo</Label>
                    <div className="border-2 border-dashed rounded-xl p-4 text-center min-h-[100px] flex flex-col items-center justify-center gap-4">
                      {uploading ? (
                        <div className="flex flex-col items-center gap-3 w-full max-w-[200px]">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          <div className="w-full">
                            <Progress value={uploadProgress} className="h-1" />
                          </div>
                        </div>
                      ) : contentUrl ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center justify-center gap-2 text-emerald-600 text-xs font-bold bg-emerald-50 px-3 py-1 rounded-full">
                            Archivo cargado <X className="h-3 w-3 cursor-pointer" onClick={() => setContentUrl('')} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <input type="file" id="file-upload" className="hidden" onChange={handleFileUpload} />
                          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2 w-full">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Seleccionar archivo</span>
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>{type === 'link' ? 'URL del Enlace' : 'Pegar URL del Archivo'}</Label>
                    <Input 
                      placeholder={isGoogleDrive ? "https://drive.google.com/..." : "https://..."}
                      value={contentUrl} 
                      onChange={(e) => setContentUrl(e.target.value)} 
                      required 
                      className="rounded-xl"
                    />
                    
                    {isGoogleDrive && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                        <div className="flex items-center gap-2 text-amber-700 font-bold text-[10px] uppercase">
                          <AlertTriangle className="h-3 w-3" /> ¡Importante! Google Drive / Spotify
                        </div>
                        <p className="text-[10px] text-amber-800 leading-tight">
                          Asegúrate de que el archivo esté compartido como <b>"Cualquier persona con el enlace puede ver"</b>. Para podcasts, pega el enlace directo del episodio.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Título del Recurso</Label>
                  <Input placeholder="Ej: Guía de sintaxis" value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-xl" />
                </div>
              </div>
              <DialogFooter><Button type="submit" className="w-full rounded-xl" disabled={uploading || !contentUrl}>Guardar</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {resources?.map((res) => (
          <div key={res.id} className="text-[10px] p-2 bg-white border rounded-xl flex items-center justify-between group">
            <span className="truncate pr-2 flex items-center gap-2">
              {res.type === 'link' ? <LinkIcon className="h-3 w-3" /> : res.type === 'podcast' ? <Mic2 className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              {res.title}
            </span>
            {isAuthorized && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteResource(res.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
