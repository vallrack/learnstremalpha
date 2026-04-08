'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, collectionGroup, where, getDocs } from 'firebase/firestore';
import { Plus, Edit, Trash2, Users, Loader2, Save, Search, UserCircle, UserCheck, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function GroupsManager({ courseId, isAuthorized }: { courseId: string, isAuthorized: boolean }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const groupsQuery = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return query(collection(db, 'courses', courseId, 'groups'), orderBy('createdAt', 'desc'));
  }, [db, courseId]);
  const { data: groups, isLoading: isGroupsLoading } = useCollection(groupsQuery);

  // Carga de estudiantes optimizada
  useEffect(() => {
    if (!db || !courseId) return;
    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      try {
        const snap = await getDocs(query(collectionGroup(db, 'courseProgress'), where('courseId', '==', courseId)));
        
        // Obtenemos los IDs únicos de los estudiantes
        const progressDocsMap = new Map();
        snap.docs.forEach(d => {
          const userId = d.ref.parent.parent?.id;
          if (userId) progressDocsMap.set(userId, { ref: d.ref, data: d.data() });
        });

        const userIds = Array.from(progressDocsMap.keys());
        if (userIds.length === 0) {
          setEnrolledStudents([]);
          return;
        }

        // Firebase IN query tiene límite de 30, pero aquí usualmente no habrá 
        // miles en un solo curso localmente para esta vista. Si hay muchos, 
        // procesamos en lotes de 30.
        const usersResolved: any[] = [];
        for (let i = 0; i < userIds.length; i += 30) {
          const batchIds = userIds.slice(i, i + 30);
          const usersSnap = await getDocs(query(collection(db, 'users'), where('__name__', 'in', batchIds)));
          usersSnap.docs.forEach(uDoc => {
            const uData = uDoc.data();
            const pInfo = progressDocsMap.get(uDoc.id);
            usersResolved.push({ 
              id: uDoc.id, 
              ...uData, 
              progressRef: pInfo.ref, 
              progressData: pInfo.data 
            });
          });
        }

        setEnrolledStudents(usersResolved);
      } catch (error: any) {
        console.error("Error fetching students:", error);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [db, courseId]);

  const filteredStudents = enrolledStudents.filter(s => 
    s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: enrolledStudents.length,
    unassigned: enrolledStudents.filter(s => !s.progressData?.groupId).length,
    groupsCount: groups?.length || 0
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !isAuthorized) return;

    if (editingGroupId) {
      updateDocumentNonBlocking(doc(db, 'courses', courseId, 'groups', editingGroupId), {
        name: groupName,
        updatedAt: serverTimestamp()
      });
      toast({ title: "Grupo actualizado" });
    } else {
      addDocumentNonBlocking(collection(db, 'courses', courseId, 'groups'), {
        name: groupName,
        createdAt: serverTimestamp()
      });
      toast({ title: "Grupo creado exitosamente" });
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleStudentGroupChange = (student: any, newGroupId: string) => {
    if (!db || !isAuthorized || !student.progressRef) return;
    
    updateDocumentNonBlocking(student.progressRef, {
      groupId: newGroupId === 'none' ? null : newGroupId
    });
    
    setEnrolledStudents(prev => prev.map(s => s.id === student.id ? { ...s, progressData: { ...s.progressData, groupId: newGroupId === 'none' ? null : newGroupId } } : s));
    toast({ title: "Grupo asignado", description: `Se reasignó a ${student.displayName} correctamente.` });
  };

  const resetForm = () => {
    setGroupName('');
    setEditingGroupId(null);
  };

  const handleDelete = (id: string) => {
    if (!db || !isAuthorized) return;
    if (confirm("¿Estás seguro de eliminar este grupo? Los estudiantes volverán al curso general.")) {
       deleteDocumentNonBlocking(doc(db, 'courses', courseId, 'groups', id));
       toast({ title: "Grupo eliminado" });
    }
  };

  if (isGroupsLoading) return <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Resumen de Cohorte */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-3xl border-none shadow-sm bg-primary text-white">
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">Total Matriculados</p>
            <div className="flex items-end justify-between mt-2">
              <h4 className="text-4xl font-headline font-bold">{stats.total}</h4>
              <Users className="h-8 w-8 opacity-20" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sin Cohorte Asignado</p>
            <div className="flex items-end justify-between mt-2">
              <h4 className="text-4xl font-headline font-bold text-slate-900">{stats.unassigned}</h4>
              <UserX className="h-8 w-8 text-rose-100" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Grupos Activos</p>
            <div className="flex items-end justify-between mt-2">
              <h4 className="text-4xl font-headline font-bold text-slate-900">{stats.groupsCount}</h4>
              <UserCheck className="h-8 w-8 text-emerald-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-sm border space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-headline font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Gestión de Grupos y Cohortes
            </h3>
            <p className="text-muted-foreground text-sm">Divide el curso en secciones para programar clases o material específico.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 gap-2">
                <Plus className="h-4 w-4" /> Crear Grupo
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl">
              <form onSubmit={handleSaveGroup}>
                <DialogHeader>
                  <DialogTitle>{editingGroupId ? 'Editar Grupo' : 'Nuevo Grupo'}</DialogTitle>
                  <DialogDescription>Define el nombre del cohorte o grupo.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                  <div className="grid gap-2">
                    <Label>Nombre del Grupo</Label>
                    <Input placeholder="Ej: Cohorte 2026-A" value={groupName} onChange={(e) => setGroupName(e.target.value)} required className="rounded-xl h-11" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full rounded-xl h-11">Guardar</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {groups && groups.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(g => {
              const count = enrolledStudents.filter(s => s.progressData?.groupId === g.id).length;
              return (
                <div key={g.id} className="p-4 rounded-2xl border bg-slate-50 flex items-center justify-between group">
                  <div>
                    <h4 className="font-bold text-lg">{g.name}</h4>
                    <p className="text-xs text-muted-foreground">{count} {count === 1 ? 'estudiante' : 'estudiantes'}</p>
                  </div>
                  {isAuthorized && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 bg-white" onClick={() => { setEditingGroupId(g.id); setGroupName(g.name); setIsDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive bg-white hover:bg-destructive/10" onClick={() => handleDelete(g.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed">
            <p className="text-muted-foreground italic text-sm">No hay grupos creados en este curso.</p>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-[2rem] shadow-sm border space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-headline font-bold">Asignación de Estudiantes</h3>
            <p className="text-muted-foreground text-sm">Organiza a los alumnos en sus cohortes correspondientes.</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nombre o email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl bg-slate-50 border-none h-11"
            />
          </div>
        </div>

        {isLoadingStudents ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : enrolledStudents.length > 0 ? (
          <div className="border rounded-2xl overflow-hidden overflow-x-auto max-h-[400px]">
             <Table>
               <TableHeader className="bg-slate-50 sticky top-0 z-10">
                 <TableRow>
                   <TableHead className="pl-6 h-12">Estudiante</TableHead>
                   <TableHead>Email</TableHead>
                   <TableHead>Estado</TableHead>
                   <TableHead className="w-[300px] pr-6">Cohorte Asignado</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {filteredStudents.map(student => (
                   <TableRow key={student.id} className="group hover:bg-slate-50 transition-colors">
                     <TableCell className="pl-6 py-4">
                       <div className="flex items-center gap-3">
                         <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                           <AvatarImage src={student.profileImageUrl} />
                           <AvatarFallback className="bg-primary/10 text-primary font-bold">{student.displayName?.[0] || 'U'}</AvatarFallback>
                         </Avatar>
                         <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{student.displayName || 'Estudiante'}</span>
                       </div>
                     </TableCell>
                     <TableCell className="text-muted-foreground text-xs">{student.email}</TableCell>
                     <TableCell>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px] h-5">Registrado</Badge>
                     </TableCell>
                     <TableCell className="pr-6">
                       <Select 
                         value={student.progressData?.groupId || 'none'} 
                         onValueChange={(val) => handleStudentGroupChange(student, val)}
                         disabled={!isAuthorized}
                       >
                         <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-white shadow-sm group-hover:border-primary/30 transition-all">
                           <SelectValue placeholder="Sin Grupo" />
                         </SelectTrigger>
                         <SelectContent className="rounded-2xl">
                           <SelectItem value="none" className="rounded-lg">📚 Todos (Curso General)</SelectItem>
                           {groups?.map(g => (
                             <SelectItem key={g.id} value={g.id} className="rounded-lg">🚀 {g.name}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed">
             <p className="text-muted-foreground italic text-sm">No hay estudiantes matriculados en este curso.</p>
          </div>
        )}
      </div>
    </div>
  );
}
