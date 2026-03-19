'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, BookOpen, Loader2, Calendar as CalendarIcon, Clock, Users, Eye, Upload, Image as ImageIcon, X, Link as LinkIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useDoc, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, Timestamp, query, where } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TECH_STACK } from '@/lib/languages';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';

export default function AdminCoursesPage() {
  const { user } = useUser();
  const db = useFirestore();
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
  const isAdmin = profile?.role === 'admin';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [technology, setTechnology] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [closingDate, setClosingDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const coursesQuery = useMemoFirebase(() => {
    if (!db || !profile) return null;
    if (profile.role === 'admin') {
      return collection(db, 'courses');
    }
    if (profile.role === 'instructor' && user?.uid) {
      return query(collection(db, 'courses'), where('instructorId', '==', user.uid));
    }
    return null;
  }, [db, profile, user?.uid]);

  const { data: courses, isLoading } = useCollection(coursesQuery);

  const resetForm = () => {
    setEditingCourseId(null);
    setTitle('');
    setDescription('');
    setCategory('');
    setTechnology('');
    setImageUrl('');
    setPreviewVideoUrl('');
    setIsFree(true);
    setClosingDate('');
    setIsActive(true);
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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para convertir links de Google Drive a links directos de imagen
  const handleUrlChange = (val: string) => {
    let finalUrl = val;
    if (val.includes('drive.google.com')) {
      const match = val.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        finalUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
      }
    }
    setImageUrl(finalUrl);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !profile) return;

    const courseData: any = {
      title,
      description,
      category,
      technology,
      isFree,
      isActive,
      previewVideoUrl,
      updatedAt: serverTimestamp(),
      instructorName: profile.displayName || user.displayName || user.email 
    };

    if (closingDate) {
      courseData.closingDate = Timestamp.fromDate(new Date(closingDate));
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

    if (editingCourseId) {
      updateDocumentNonBlocking(doc(db, 'courses', editingCourseId), courseData);
    } else {
      courseData.instructorId = user.uid;
      courseData.createdAt = serverTimestamp();
      if (!courseData.imageUrl && !courseData.thumbnailDataUrl) {
        courseData.imageUrl = `https://picsum.photos/seed/${Math.random()}/800/450`;
      }
      addDocumentNonBlocking(collection(db, 'courses'), courseData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDeleteCourse = (courseId: string) => {
    if (!db || !isAdmin) return; 
    if (confirm('¿Eliminar curso permanentemente?')) {
      deleteDocumentNonBlocking(doc(db, 'courses', courseId));
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
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()} className="gap-2 rounded-xl h-11 shadow-lg shadow-primary/10">
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
                            {imageUrl ? (
                              <>
                                <Image src={imageUrl} alt="Preview" fill className="object-cover" unoptimized />
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
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Ajustes de Publicación</p>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between p-2 bg-white rounded-xl border shadow-sm">
                            <Label htmlFor="isFree" className="text-sm font-medium cursor-pointer">Curso Gratuito</Label>
                            <input type="checkbox" id="isFree" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary" />
                          </div>
                          <div className="flex items-center justify-between p-2 bg-white rounded-xl border shadow-sm">
                            <Label htmlFor="isActive" className="text-sm font-medium cursor-pointer">Publicar Inmediatamente</Label>
                            <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <DialogFooter className="pt-4 border-t">
                    <Button type="submit" className="w-full rounded-2xl h-14 text-lg font-bold shadow-xl shadow-primary/20">
                      {editingCourseId ? 'Guardar Cambios en el Curso' : 'Publicar Nuevo Programa'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
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
                return (
                  <TableRow key={course.id} className="border-slate-100">
                    <TableCell className="font-bold pl-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="relative h-12 w-20 rounded-lg overflow-hidden border bg-slate-100 shrink-0">
                          <Image src={course.thumbnailDataUrl || course.imageUrl || 'https://picsum.photos/seed/c/200/150'} alt={course.title} fill className="object-cover" unoptimized />
                        </div>
                        <div className="flex flex-col">
                          <span className="line-clamp-1">{course.title}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">{course.category}</span>
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
                        {course.isActive ? (
                            <Badge className="bg-emerald-500 text-white border-none rounded-lg text-[10px]">Activo</Badge>
                        ) : (
                            <Badge className="bg-slate-300 text-slate-700 border-none rounded-lg text-[10px]">Borrador</Badge>
                        )}
                        {course.isFree ? (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 rounded-lg text-[10px]">Gratis</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 rounded-lg text-[10px]">Premium</Badge>
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
      </main>
    </div>
  );
}
