'use client';

// v1.1.2 - Sistema de Archivado y Pestañas
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { WaitingHall } from '@/components/instructor/WaitingHall';
import { Plus, Edit, Trash2, BookOpen, Loader2, Calendar as CalendarIcon, Clock, Users, Eye, Upload, Image as ImageIcon, X, Link as LinkIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useAuth, useDoc, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, Timestamp, query, where } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TECH_STACK } from '@/lib/languages';
import { SUPPORTED_CURRENCIES } from '@/lib/currency';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cloneCourseContent } from '@/lib/course-duplication';
import { Search } from 'lucide-react';

export default function AdminCoursesPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  const isDemoAccount = user?.email === 'demo@learnstream.ai';
  const isAdmin = profile?.role === 'admin' || isDemoAccount;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [technology, setTechnology] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [closingDate, setClosingDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [price, setPrice] = useState<number>(0);
  const [currency, setCurrency] = useState('COP');
  const [instructorRevenueShare, setInstructorRevenueShare] = useState<number>(70);
  const [baseCourseId, setBaseCourseId] = useState<string | null>(null);
  const [isBaseCourse, setIsBaseCourse] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const coursesQuery = useMemoFirebase(() => {
    if (!db || (!profile && !isDemoAccount)) return null;
    if (isAdmin) {
      return collection(db, 'courses');
    }
    if (profile?.role === 'instructor' && user?.uid) {
      // Si puede editar bases, traemos todo para filtrar en el cliente (o podríamos hacer query compleja)
      // Para simplificar y evitar índices complejos, traemos todo si es instructor con permisos extendidos
      if (profile.canEditBases) {
        return collection(db, 'courses');
      }
      return query(collection(db, 'courses'), where('instructorId', '==', user.uid));
    }
    return null;
  }, [db, profile, user?.uid, isAdmin, isDemoAccount]);

  const { data: rawCourses, isLoading } = useCollection(coursesQuery);

  // Filtrado final en cliente para seguridad, coherencia y pestañas
  const courses = useMemo(() => {
    if (!rawCourses) return [];
    
    let filtered = rawCourses;
    
    if (!isAdmin) {
      filtered = rawCourses.filter((c: any) => {
        const isOwner = c.instructorId === user?.uid;
        const isBase = c.isBaseCourse === true;

        if (profile?.role === 'instructor') {
          if (profile.canEditBases) {
            return isOwner || isBase;
          } else {
            return isOwner && !isBase;
          }
        }
        return false;
      });
    }

    // Aplicar filtro de pestañas
    if (activeTab === 'templates') {
      return filtered.filter((c: any) => c.isBaseCourse === true);
    }
    if (activeTab === 'cohorts') {
      return filtered.filter((c: any) => !c.isBaseCourse);
    }
    
    return filtered;
  }, [rawCourses, isAdmin, profile, user?.uid, activeTab]);

  const courseNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    rawCourses?.forEach((c: any) => { map[c.id] = c.title; });
    return map;
  }, [rawCourses]);

  const resetForm = () => {
    setEditingCourseId(null);
    setTitle('');
    setDescription('');
    setCategory('');
    setTechnology('');
    setImageUrl('');
    setUploadingImage(false);
    setPreviewVideoUrl('');
    setIsFree(true);
    setClosingDate('');
    setIsActive(true);
    setPrice(0);
    setCurrency('COP');
    setInstructorRevenueShare(70);
    setBaseCourseId(null);
    setIsBaseCourse(false);
    setIsArchived(false);
    setIsCloning(false);
  };

  const handleEditClick = (course: any) => {
    setEditingCourseId(course.id);
    setTitle(course.title || '');
    setDescription(course.description || '');
    setCategory(course.category || '');
    setTechnology(course.technology || '');
    setImageUrl(course.thumbnailDataUrl || course.imageUrl || '');
    setPreviewVideoUrl(course.previewVideoUrl || '');
    setIsFree(course.isFree ?? true);
    setIsActive(course.isActive ?? true);
    setPrice(course.price || 0);
    setCurrency(course.currency || 'COP');
    setInstructorRevenueShare(course.instructorRevenueShare ?? 70);
    setIsBaseCourse(course.isBaseCourse ?? false);
    setIsArchived(course.isArchived ?? false);
    
    if (course.closingDate) {
      const date = course.closingDate instanceof Timestamp ? course.closingDate.toDate() : new Date(course.closingDate);
      setClosingDate(date.toISOString().split('T')[0]);
    } else {
      setClosingDate('');
    }
    
    setIsDialogOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 450;
        let width = img.width;
        let height = img.height;

        // Mantener aspect ratio sin superar el máximo
        if (width > MAX_WIDTH) { height = Math.round(height * MAX_WIDTH / width); width = MAX_WIDTH; }
        if (height > MAX_HEIGHT) { width = Math.round(width * MAX_HEIGHT / height); height = MAX_HEIGHT; }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Comprimir a WebP para reducir tamaño (igual que las fotos de perfil)
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        setImageUrl(dataUrl);
        setUploadingImage(false);
      };
      img.onerror = () => setUploadingImage(false);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => setUploadingImage(false);
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (val: string) => {
    let finalUrl = val;
    // Soporte para enlaces directos de Google Drive
    if (val.includes('drive.google.com')) {
      const dMatch = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const idMatch = val.match(/[?&]id=([a-zA-Z0-9-_]+)/);
      const driveId = (dMatch && dMatch[1]) || (idMatch && idMatch[1]);
      if (driveId) {
        finalUrl = `https://drive.google.com/uc?export=view&id=${driveId}`;
      }
    }
    setImageUrl(finalUrl);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("DEBUG: handleFormSubmit triggered");
    
    const activeUser = user || auth.currentUser;
    const isDemo = activeUser?.email === 'demo@learnstream.ai';
    
    if (!db || !activeUser || (isUserLoading && !isDemo) || (!profile && !isDemo)) {
      console.log("DEBUG: Early exit - missing dependencies", { 
        db: !!db, 
        user: !!activeUser, 
        profile: !!profile, 
        isUserLoading,
        isDemo 
      });
      return;
    }

    try {
      const courseData: any = {
        title,
        description,
        category,
        technology,
        isFree,
        price: isFree ? 0 : Number(price),
        currency: isFree ? 'COP' : currency,
        instructorRevenueShare: isAdmin ? Number(instructorRevenueShare) : (editingCourseId ? undefined : 70),
        isActive: isBaseCourse ? false : isActive,
        previewVideoUrl,
        updatedAt: serverTimestamp(),
        instructorName: profile?.displayName || activeUser.displayName || activeUser.email || 'Demo Instructor',
        isBaseCourse,
        isArchived,
        clonedFrom: baseCourseId || null
      };

      if (closingDate) {
        try {
          courseData.closingDate = Timestamp.fromDate(new Date(closingDate));
        } catch (dateErr) {
          console.error("DEBUG: Invalid closing date format", closingDate);
          courseData.closingDate = null;
        }
      } else {
        courseData.closingDate = null;
      }

      if (imageUrl) {
        if (imageUrl.startsWith('data:')) {
          courseData.thumbnailDataUrl = imageUrl;
          courseData.imageUrl = null;
        } else {
          courseData.imageUrl = imageUrl;
          courseData.thumbnailDataUrl = null;
        }
      }

      console.log("DEBUG: Submitting course data", courseData);

      if (editingCourseId) {
        await updateDocumentNonBlocking(doc(db, 'courses', editingCourseId), courseData);
        toast({ title: "Curso actualizado", description: "Los cambios se guardaron correctamente." });
      } else {
        courseData.instructorId = activeUser.uid;
        courseData.createdAt = serverTimestamp();
        if (!courseData.imageUrl && !courseData.thumbnailDataUrl) {
          courseData.imageUrl = `https://picsum.photos/seed/${Math.random()}/800/450`;
        }
        const docRef = await addDocumentNonBlocking(collection(db, 'courses'), courseData);
        
        if (baseCourseId && docRef?.id) {
          setIsCloning(true);
          try {
            toast({ title: "Clonando contenido...", description: "Estamos trayendo los módulos y lecciones del curso base." });
            await cloneCourseContent(db, baseCourseId, docRef.id, activeUser.uid);
            toast({ title: "¡Clonación exitosa!", description: "El contenido ha sido replicado correctamente." });
          } catch (cloneErr) {
            console.error("Error cloning content:", cloneErr);
            toast({ variant: "destructive", title: "Error en clonación", description: "El curso se creó pero no se pudo copiar el contenido." });
          } finally {
            setIsCloning(false);
          }
        } else {
          toast({ title: "¡Curso creado!", description: "El nuevo programa ya está disponible en el catálogo." });
        }
      }
      
      setIsDialogOpen(false);
      resetForm();
      router.refresh();
    } catch (error: any) {
      console.error("DEBUG: Error in handleFormSubmit", error);
      toast({
        variant: "destructive",
        title: "Error al publicar",
        description: error.message || "Ocurrió un error inesperado al guardar el curso.",
      });
    }
  };

  const handleDeleteCourse = (courseId: string) => {
    if (!db || !isAdmin) return; 
    if (confirm('¿Eliminar curso permanentemente?')) {
      deleteDocumentNonBlocking(doc(db, 'courses', courseId));
      router.refresh();
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 py-12 flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Cargando catálogo académico...</p>
        </main>
      </div>
    );
  }

  if (profile?.instructorStatus === 'pending') {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <WaitingHall />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-headline font-bold mb-2">Gestionar Cursos</h1>
            <p className="text-muted-foreground">
              {isAdmin ? "Panel de Administrador: Supervisando todos los cursos." : "Panel de Instructor: Gestionando tus programas de formación."}
            </p>
          </div>
          
          <div className="flex gap-3">
            {isAdmin && (
              <Link href="/admin/students">
                <Button variant="outline" className="rounded-xl h-11 gap-2 shadow-sm">
                  <Users className="h-4 w-4" />
                  Usuarios
                </Button>
              </Link>
            )}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (open && !editingCourseId && !baseCourseId) {
                resetForm();
              } else if (!open) {
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2 rounded-xl h-11 shadow-lg shadow-primary/10">
                  <Plus className="h-4 w-4" />
                  Crear Curso
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[750px] rounded-3xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleFormSubmit}>
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-headline">{editingCourseId ? 'Editar Curso' : 'Nuevo Curso'}</DialogTitle>
                    <DialogDescription>
                      Define el contenido, imagen de portada y vigencia del programa.
                    </DialogDescription>
                  </DialogHeader>

                  {!editingCourseId && (
                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 mb-4 animate-in fade-in slide-in-from-top-4">
                      <Label className="font-bold text-primary flex items-center gap-2 mb-2">
                         <BookOpen className="h-4 w-4" /> Importar de Curso Base (Opcional)
                      </Label>
                      <Select 
                        value={baseCourseId || 'none'} 
                        onValueChange={(val) => {
                          const newBaseId = val === 'none' ? null : val;
                          setBaseCourseId(newBaseId);
                          
                          if (newBaseId) {
                            const source = rawCourses?.find((c: any) => c.id === newBaseId);
                            if (source) {
                              setTitle(source.title || '');
                              setCategory(source.category || '');
                              setTechnology(source.technology || '');
                              setDescription(source.description || '');
                              setImageUrl(source.thumbnailDataUrl || source.imageUrl || '');
                              setPreviewVideoUrl(source.previewVideoUrl || '');
                              setIsFree(source.isFree ?? true);
                              setPrice(source.price || 0);
                              setCurrency(source.currency || 'COP');
                              toast({ title: "Datos importados", description: "Se ha copiado la información básica de la plantilla." });
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="rounded-xl h-11 bg-white">
                          <SelectValue placeholder="Seleccionar un curso existente para clonar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Ninguno (Empezar desde cero) --</SelectItem>
                          {rawCourses?.filter((c: any) => c.isBaseCourse).map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.title} ({c.technology})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-primary/60 mt-2 font-medium">Esto copiará todos los módulos, lecciones y recursos del curso seleccionado.</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6">
                    <div className="space-y-6">
                      <div className="grid gap-2">
                        <Label className="font-bold">Título del Curso</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-xl h-11" placeholder="Ej: Master en React Pro" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label className="font-bold">Categoría</Label>
                          <Input value={category} onChange={(e) => setCategory(e.target.value)} required className="rounded-xl h-11" placeholder="Ej: Frontend" />
                        </div>
                        <div className="grid gap-2">
                          <Label className="font-bold">Tecnología</Label>
                          <Select value={technology} onValueChange={setTechnology}>
                            <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {Object.entries(TECH_STACK).map(([cat, subgroups]) => (
                                <SelectGroup key={cat}>
                                  <SelectLabel className="bg-muted/50 py-1.5">{cat}</SelectLabel>
                                  {Array.isArray(subgroups) 
                                    ? subgroups.map(tech => <SelectItem key={tech} value={tech}>{tech}</SelectItem>)
                                    : Object.entries(subgroups).map(([sub, techs]) => 
                                        techs.map(tech => <SelectItem key={tech} value={tech}>{tech}</SelectItem>)
                                      )
                                  }
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label className="font-bold">Fecha de Cierre (Inactivación)</Label>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} className="rounded-xl h-11 pl-10" />
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label className="font-bold">Descripción del Programa</Label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="rounded-xl min-h-[120px] resize-none" placeholder="Explica los objetivos del curso..." />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="grid gap-2">
                        <Label className="font-bold">Imagen de Portada</Label>
                        <div className="relative group">
                          <div className={`aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-colors ${imageUrl ? 'border-primary/20 bg-primary/5' : 'border-slate-200 bg-slate-50'}`}>
                            {uploadingImage ? (
                              <div className="flex flex-col items-center gap-3 text-primary">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <p className="text-xs font-bold">Comprimiendo imagen...</p>
                              </div>
                            ) : imageUrl ? (
                              <>
                                <Image 
                                  src={imageUrl} 
                                  alt="Preview" 
                                  fill 
                                  className="object-cover" 
                                  unoptimized={imageUrl.startsWith('data:') || imageUrl.includes('drive.google.com') || imageUrl.includes('googleusercontent.com')} 
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <Label htmlFor="course-image" className="cursor-pointer bg-white text-slate-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 flex items-center gap-2">
                                    <Upload className="h-3 w-3" /> Cambiar
                                  </Label>
                                  <Button variant="destructive" size="sm" className="rounded-xl h-8 px-3" onClick={() => setImageUrl('')}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center gap-2 p-6 text-center">
                                <div className="bg-white p-3 rounded-2xl shadow-sm"><ImageIcon className="h-6 w-6 text-slate-400" /></div>
                                <div>
                                  <p className="text-xs font-bold text-slate-600">Sube imagen o pega URL</p>
                                  <p className="text-[10px] text-muted-foreground">Formato 16:9 recomendado</p>
                                </div>
                                <Label htmlFor="course-image" className="mt-2 cursor-pointer bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-primary/90">
                                  Subir Archivo
                                </Label>
                              </div>
                            )}
                          </div>
                          <input id="course-image" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </div>
                        
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <Input 
                              placeholder="O pega URL de Internet o Google Drive..." 
                              value={imageUrl.startsWith('data:') ? '' : imageUrl}
                              onChange={(e) => handleUrlChange(e.target.value)}
                              className="rounded-xl h-9 text-[10px] pl-8 bg-slate-50"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2">
                        <Label className="font-bold">URL Video Introducción (YouTube)</Label>
                        <Input value={previewVideoUrl} onChange={(e) => setPreviewVideoUrl(e.target.value)} className="rounded-xl h-11" placeholder="https://youtube.com/watch?v=..." />
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border space-y-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Ajustes de Publicación y Precio</p>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between p-2 bg-white rounded-xl border shadow-sm">
                            <Label htmlFor="isFree" className="text-sm font-medium cursor-pointer flex-1">Curso Gratuito</Label>
                            <input type="checkbox" id="isFree" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary" />
                          </div>
                          
                          {!isFree && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-white rounded-xl border border-emerald-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                              <div className="grid gap-2">
                                <Label className="font-bold text-sm text-emerald-700">Precio</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                                  <Input type="number" min="0" step={currency === 'COP' ? 1000 : 0.01} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="rounded-xl h-11 pl-8 font-mono font-bold border-emerald-200 focus-visible:ring-emerald-500" placeholder="0" />
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label className="font-bold text-sm text-emerald-700">Moneda</Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                  <SelectTrigger className="rounded-xl h-11 border-emerald-200">
                                    <SelectValue placeholder="COP" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SUPPORTED_CURRENCIES.map(c => (
                                      <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}

                          {isAdmin && !isFree && (
                             <div className="grid gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 shadow-sm mt-1 animate-in fade-in">
                               <Label className="font-bold text-sm text-amber-900">Participación del Instructor (%)</Label>
                               <div className="relative">
                                 <Input type="number" min="0" max="100" value={instructorRevenueShare} onChange={(e) => setInstructorRevenueShare(Number(e.target.value))} className="rounded-xl h-11 pr-8 font-mono font-bold bg-white border-amber-200 focus-visible:ring-amber-500" />
                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                               </div>
                               <p className="text-[10px] text-amber-700/80 font-medium">Plataforma retiene el {100 - instructorRevenueShare}% (${((price * (100 - instructorRevenueShare)) / 100).toLocaleString()}).</p>
                             </div>
                          )}

                          {!isBaseCourse && (
                            <div className="flex items-center justify-between p-2 bg-white rounded-xl border shadow-sm mt-2">
                              <Label htmlFor="isActive" className="text-sm font-medium cursor-pointer">Publicar Inmediatamente</Label>
                              <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary" />
                            </div>
                          )}

                          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200 shadow-sm mt-2">
                             <div className="flex flex-col">
                               <Label htmlFor="manualArchive" className="text-sm font-bold text-slate-700 cursor-pointer">Archivar curso</Label>
                               <p className="text-[10px] text-slate-500">Ocultar del catálogo pero permitir acceso a alumnos inscritos.</p>
                             </div>
                             <input type="checkbox" id="manualArchive" checked={isArchived} onChange={(e) => setIsArchived(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-slate-600 focus:ring-slate-500" />
                          </div>

                          <div className="flex items-center justify-between p-2 bg-purple-50 rounded-xl border border-purple-200 shadow-sm mt-2">
                            <div className="flex flex-col">
                              <Label htmlFor="isBase" className="text-sm font-bold text-purple-900 cursor-pointer">Curso Base / Plantilla</Label>
                              <p className="text-[10px] text-purple-700">Oculto del catálogo, solo para clonación.</p>
                            </div>
                            <input type="checkbox" id="isBase" checked={isBaseCourse} onChange={(e) => setIsBaseCourse(e.target.checked)} className="h-5 w-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="pt-4 border-t">
                    <Button type="submit" disabled={uploadingImage || isCloning} className="w-full rounded-2xl h-14 text-lg font-bold shadow-xl shadow-primary/20">
                      {isCloning ? (
                        <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Clonando Contenido...</>
                      ) : uploadingImage ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" />Procesando imagen...</>
                      ) : editingCourseId ? (
                        'Guardar Cambios'
                      ) : isBaseCourse ? (
                        'Crear Plantilla Base'
                      ) : (
                        'Publicar Nuevo Programa'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <TabsList className="bg-slate-100 p-1 rounded-2xl h-12">
              <TabsTrigger value="all" className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Todos</TabsTrigger>
              <TabsTrigger value="templates" className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Plantillas Maestras</TabsTrigger>
              <TabsTrigger value="cohorts" className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Cohortes / Grupos</TabsTrigger>
            </TabsList>
            
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Mostrando {courses.length} items
            </div>
          </div>

          <TabsContent value={activeTab} className="mt-0">
            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-x-auto">
              <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-none">
                <TableHead className="pl-8 h-14">Curso</TableHead>
                <TableHead>Tecnología</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right pr-8">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses?.map(course => {
                const cardImg = course.thumbnailDataUrl || course.imageUrl || 'https://picsum.photos/seed/c/200/150';
                return (
                  <TableRow key={course.id} className="border-slate-100">
                    <TableCell className="font-bold pl-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="relative h-12 w-20 rounded-lg overflow-hidden border bg-slate-100 shrink-0">
                          <Image 
                            src={cardImg} 
                            alt={course.title} 
                            fill 
                            className="object-cover" 
                            unoptimized={cardImg.startsWith('data:') || cardImg.includes('drive.google.com') || cardImg.includes('googleusercontent.com')} 
                          />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="line-clamp-1 max-w-[250px]">{course.title}</span>
                            <div className="flex gap-1">
                              {course.isBaseCourse && <Badge className="bg-purple-600 text-white border-none rounded-lg text-[8px] h-4">Plantilla</Badge>}
                              {course.isArchived && <Badge className="bg-slate-500 text-white border-none rounded-lg text-[8px] h-4">Archivado</Badge>}
                              {course.closingDate && (new Date(course.closingDate instanceof Timestamp ? course.closingDate.toDate() : course.closingDate) < new Date()) && (
                                <Badge className="bg-rose-500 text-white border-none rounded-lg text-[8px] h-4">Cerrado</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] text-muted-foreground font-normal">{course.category}</span>
                             {course.clonedFrom && (
                               <span className="text-[9px] text-purple-400 font-medium italic">
                                 Base: {courseNamesMap[course.clonedFrom] || 'Cargando...'}
                               </span>
                             )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-lg font-bold border-primary/20 bg-primary/5 text-primary">
                        {course.technology}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 border">
                          <AvatarFallback className="text-[8px] font-bold bg-slate-100 text-slate-600 uppercase">{course.instructorName?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-slate-600 truncate max-w-[100px]">{course.instructorName || 'Experto'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {!course.isBaseCourse && (
                          course.isActive ? (
                              <Badge className="bg-emerald-500 text-white border-none rounded-lg text-[10px]">Activo</Badge>
                          ) : (
                              <Badge className="bg-slate-300 text-slate-700 border-none rounded-lg text-[10px]">Borrador</Badge>
                          )
                        )}
                        {course.isFree ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 rounded-lg text-[10px]">Gratis</Badge>
                        ) : (
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 rounded-lg text-[10px]">Premium: {course.price?.toLocaleString() || 0} {course.currency || 'COP'}</Badge>
                            {isAdmin && <span className="text-[9px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded leading-none">{course.instructorRevenueShare ?? 70}% rev. inst.</span>}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link href={`/courses/${course.id}/certificate?preview=true`}>
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-amber-600 hover:bg-amber-50">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>Vista Previa Certificado</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 rounded-xl text-primary hover:bg-primary/5"
                                onClick={() => {
                                  resetForm();
                                  setTitle(`Copia de ${course.title}`);
                                  setDescription(course.description || '');
                                  setCategory(course.category || '');
                                  setTechnology(course.technology || '');
                                  setImageUrl(course.thumbnailDataUrl || course.imageUrl || '');
                                  setIsFree(course.isFree ?? true);
                                  setPrice(course.price || 0);
                                  setCurrency(course.currency || 'COP');
                                  setBaseCourseId(course.id);
                                  setIsDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Clonar Curso</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <Link href={`/admin/courses/${course.id}/content`}>
                          <Button variant="ghost" size="sm" className="gap-2 rounded-xl text-xs h-9">
                            <BookOpen className="h-3.5 w-3.5" />
                            Contenido
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-xl"
                          onClick={() => handleEditClick(course)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl"
                            onClick={() => handleDeleteCourse(course.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
