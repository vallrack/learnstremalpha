
'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, BookOpen, Loader2, Calendar as CalendarIcon, Clock, Users, Eye } from 'lucide-react';
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

export default function AdminCoursesPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setNow(new Date());
  }, []);
  
  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  const isAdmin = profile?.role === 'admin';
  const isInstructor = profile?.role === 'instructor';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [technology, setTechnology] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [previewVideoUrl, setPreviewVideoUrl] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [closingDate, setClosingDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Consulta inteligente: Si es admin ve todo, si es instructor solo ve lo suyo
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
    };

    if (closingDate) {
      courseData.closingDate = Timestamp.fromDate(new Date(closingDate));
    } else {
      courseData.closingDate = null;
    }

    if (imageUrl) {
      if (imageUrl.startsWith('data:')) {
        courseData.thumbnailDataUrl = imageUrl;
      } else {
        courseData.imageUrl = imageUrl;
      }
    }

    if (editingCourseId) {
      updateDocumentNonBlocking(doc(db, 'courses', editingCourseId), courseData);
    } else {
      courseData.instructorId = user.uid;
      courseData.instructorName = profile.displayName || user.displayName || user.email;
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
    if (!db || !isAdmin) return; // Solo el administrador puede borrar permanentemente
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
              <DialogContent className="sm:max-w-[650px] rounded-3xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleFormSubmit}>
                  <DialogHeader>
                    <DialogTitle>{editingCourseId ? 'Editar Curso' : 'Nuevo Curso'}</DialogTitle>
                    <DialogDescription>
                      Define el contenido y la vigencia del programa.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Título</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-xl h-11" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Categoría</Label>
                        <Input value={category} onChange={(e) => setCategory(e.target.value)} required className="rounded-xl h-11" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Tecnología</Label>
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
                      <div className="grid gap-2">
                        <Label>Fecha de Cierre (Inactivación)</Label>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} className="rounded-xl h-11 pl-10" />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Descripción</Label>
                      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required className="rounded-xl min-h-[100px]" />
                    </div>

                    <div className="flex gap-6 items-center">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="isFree" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary" />
                        <Label htmlFor="isFree">Curso Gratuito</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-primary" />
                        <Label htmlFor="isActive">Publicado</Label>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" className="w-full rounded-2xl h-14 text-lg font-bold">
                      {editingCourseId ? 'Guardar Cambios' : 'Publicar Curso'}
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
                const cDate = course.closingDate && (course.closingDate instanceof Timestamp ? course.closingDate.toDate() : new Date(course.closingDate));
                const isExpired = cDate && now && cDate < now;
                
                return (
                  <TableRow key={course.id} className="border-slate-100">
                    <TableCell className="font-bold pl-8 py-5">
                      <div className="flex flex-col">
                        <span>{course.title}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">{course.category}</span>
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
                          <AvatarFallback className="text-[8px] font-bold">{course.instructorName?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-slate-600">{course.instructorName}</span>
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
