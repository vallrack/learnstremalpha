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
import { Plus, Edit, Trash2, Users, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function GroupsManager({ courseId, isAuthorized }: { courseId: string, isAuthorized: boolean }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);

  const groupsQuery = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return query(collection(db, 'courses', courseId, 'groups'), orderBy('createdAt', 'desc'));
  }, [db, courseId]);
  const { data: groups, isLoading: isGroupsLoading } = useCollection(groupsQuery);

  useEffect(() => {
    if (!db || !courseId) return;
    const fetchStudents = async () => {
      setIsLoadingStudents(true);
      try {
        const snap = await getDocs(query(collectionGroup(db, 'courseProgress'), where('courseId', '==', courseId)));
        
        const studentsPromise = snap.docs.map(async (d) => {
           const progressData = d.data();
           const userId = d.ref.parent.parent?.id;
           if (!userId) return null;
           
           const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));
           if(!userDoc.empty) {
               return { id: userId, progressRef: d.ref, ...userDoc.docs[0].data(), progressData };
           }
           return null;
        });

        const resolved = (await Promise.all(studentsPromise)).filter(Boolean);
        setEnrolledStudents(resolved);
      } catch (error: any) {
        console.error("Firebase Index Error or Fetch Error:", error);
      } finally {
        setIsLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [db, courseId]);

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
        <div>
          <h3 className="text-xl font-headline font-bold">Asignación de Estudiantes</h3>
          <p className="text-muted-foreground text-sm">Asigna a los estudiantes matriculados al grupo correspondiente.</p>
        </div>

        {isLoadingStudents ? (
          <div className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : enrolledStudents.length > 0 ? (
          <div className="border rounded-2xl overflow-hidden overflow-x-auto max-h-[400px]">
             <Table>
               <TableHeader className="bg-slate-50 sticky top-0">
                 <TableRow>
                   <TableHead>Estudiante</TableHead>
                   <TableHead>Email</TableHead>
                   <TableHead className="w-[250px]">Grupo Asignado</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {enrolledStudents.map(student => (
                   <TableRow key={student.id}>
                     <TableCell className="font-bold">{student.displayName || 'Desconocido'}</TableCell>
                     <TableCell className="text-muted-foreground text-xs">{student.email}</TableCell>
                     <TableCell>
                       <Select 
                         value={student.progressData?.groupId || 'none'} 
                         onValueChange={(val) => handleStudentGroupChange(student, val)}
                         disabled={!isAuthorized}
                       >
                         <SelectTrigger className="h-9 rounded-xl border-slate-200">
                           <SelectValue placeholder="Sin Grupo" />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="none">Todos (Sin grupo)</SelectItem>
                           {groups?.map(g => (
                             <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
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
