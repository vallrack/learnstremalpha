'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, Timestamp } from 'firebase/firestore';
import { Plus, Edit, Trash2, Video, CalendarIcon, Loader2, Link as LinkIcon, ExternalLink, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export function VirtualClassesManager({ courseId, isAuthorized }: { courseId: string, isAuthorized: boolean }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [groupId, setGroupId] = useState('all');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [customMeetLink, setCustomMeetLink] = useState('');

  const classesQuery = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return query(collection(db, 'courses', courseId, 'virtualClasses'), orderBy('scheduledAt', 'asc'));
  }, [db, courseId]);
  const { data: classes, isLoading: isClassesLoading } = useCollection(classesQuery);

  const groupsQuery = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return query(collection(db, 'courses', courseId, 'groups'), orderBy('createdAt', 'desc'));
  }, [db, courseId]);
  const { data: groups } = useCollection(groupsQuery);

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !isAuthorized) return;

    if (!date || !time) {
      toast({ variant: "destructive", title: "Falta fecha u hora" });
      return;
    }

    const scheduledDate = new Date(`${date}T${time}`);
    
    // Auto-generate Jitsi link if none provided
    const finalMeetLink = customMeetLink || `https://meet.jit.si/learnstream_${courseId}_${Math.random().toString(36).substring(2, 10)}`;

    const classData = {
      title,
      scheduledAt: Timestamp.fromDate(scheduledDate),
      groupId: groupId === 'all' ? null : groupId,
      meetLink: finalMeetLink,
      recordingUrl,
      updatedAt: serverTimestamp()
    };

    if (editingClassId) {
      updateDocumentNonBlocking(doc(db, 'courses', courseId, 'virtualClasses', editingClassId), classData);
      toast({ title: "Clase actualizada" });
    } else {
      addDocumentNonBlocking(collection(db, 'courses', courseId, 'virtualClasses'), {
        ...classData,
        createdAt: serverTimestamp()
      });
      toast({ title: "Clase en vivo programada" });
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (vc: any) => {
    setEditingClassId(vc.id);
    setTitle(vc.title);
    
    if (vc.scheduledAt) {
      const d = vc.scheduledAt.toDate();
      const offset = d.getTimezoneOffset();
      const localD = new Date(d.getTime() - (offset * 60 * 1000));
      const iso = localD.toISOString();
      setDate(iso.split('T')[0]);
      setTime(iso.split('T')[1].substring(0, 5));
    }
    
    setGroupId(vc.groupId || 'all');
    setRecordingUrl(vc.recordingUrl || '');
    setCustomMeetLink(vc.meetLink || '');
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setTitle('');
    setDate('');
    setTime('');
    setGroupId('all');
    setRecordingUrl('');
    setCustomMeetLink('');
    setEditingClassId(null);
  };

  const handleDelete = (id: string) => {
    if (!db || !isAuthorized) return;
    if (confirm("¿Estás seguro de eliminar esta clase en vivo?")) {
       deleteDocumentNonBlocking(doc(db, 'courses', courseId, 'virtualClasses', id));
       toast({ title: "Clase eliminada" });
    }
  };

  if (isClassesLoading) return <div className="py-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-headline font-bold flex items-center gap-2">
              <Video className="h-6 w-6 text-primary" />
              Clases en Vivo
            </h3>
            <p className="text-muted-foreground text-sm">Programa sesiones síncronas con Jitsi o sube tus grabaciones.</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" /> Programar Clase
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl sm:max-w-[600px]">
              <form onSubmit={handleSaveClass}>
                <DialogHeader>
                  <DialogTitle>{editingClassId ? 'Editar Clase' : 'Programar Nueva Clase'}</DialogTitle>
                  <DialogDescription>Generaremos un link de Jitsi automáticamente si dejas el campo de enlace vacío.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                  <div className="grid gap-2">
                    <Label>Título de la Clase</Label>
                    <Input placeholder="Ej: Q&A - Semana 1" value={title} onChange={(e) => setTitle(e.target.value)} required className="rounded-xl" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Fecha</Label>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="rounded-xl" />
                    </div>
                    <div className="grid gap-2">
                      <Label>Hora (Local)</Label>
                      <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required className="rounded-xl" />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Grupo / Cohorte</Label>
                    <Select value={groupId} onValueChange={setGroupId}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="¿Quiénes pueden unirse?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estudiantes</SelectItem>
                        {groups?.map(g => (
                          <SelectItem key={g.id} value={g.id}>Solo el grupo: {g.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2 bg-slate-50 p-4 rounded-2xl border mt-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" /> Enlace de Videollamada (Opcional)
                    </Label>
                    <p className="text-xs text-muted-foreground mb-1">Si lo dejas vacío, se generará un link privado de Jitsi Meet gratuitamente.</p>
                    <Input placeholder="https://meet.google.com/..." value={customMeetLink} onChange={(e) => setCustomMeetLink(e.target.value)} className="rounded-xl bg-white" />
                  </div>

                  <div className="grid gap-2 bg-slate-50 p-4 rounded-2xl border mt-2">
                    <Label className="text-sm font-bold flex items-center gap-2">
                      <PlayCircle className="h-4 w-4" /> Grabación de la Clase (Opcional)
                    </Label>
                    <p className="text-xs text-muted-foreground mb-1">Añade aquí el link de YouTube o Drive una vez finalice la clase.</p>
                    <Input placeholder="URL de la grabación..." value={recordingUrl} onChange={(e) => setRecordingUrl(e.target.value)} className="rounded-xl bg-white" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full rounded-xl h-11 bg-blue-600 hover:bg-blue-700">Guardar Clase</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {classes && classes.length > 0 ? (
          <div className="space-y-4">
            {classes.map(vc => {
              const isPast = vc.scheduledAt ? vc.scheduledAt.toDate() < new Date() : false;
              const gName = vc.groupId ? groups?.find(g => g.id === vc.groupId)?.name || 'Grupo Eliminado' : 'Todos';
              
              return (
                <div key={vc.id} className={`p-5 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-colors ${isPast ? 'bg-slate-50 border-slate-200' : 'bg-white border-blue-100 shadow-sm shadow-blue-500/5'}`}>
                  <div className="flex items-start gap-4 w-full md:w-auto">
                    <div className={`p-3 rounded-xl shrink-0 ${isPast ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
                      <CalendarIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-bold ${isPast ? 'text-slate-600' : 'text-slate-900'}`}>{vc.title}</h4>
                        {isPast && <Badge variant="secondary" className="text-[10px] bg-slate-200">Finalizada</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        <span>{vc.scheduledAt ? new Date(vc.scheduledAt.toDate()).toLocaleString() : 'Sin fecha'}</span>
                        <span className="font-medium text-slate-700">Grupo: {gName}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    {vc.recordingUrl ? (
                      <Link href={vc.recordingUrl} target="_blank">
                        <Button variant="outline" size="sm" className="rounded-lg gap-2 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">
                          <PlayCircle className="h-4 w-4" /> Ver Grabación
                        </Button>
                      </Link>
                    ) : (
                      <Link href={vc.meetLink || '#'} target="_blank">
                        <Button variant="outline" size="sm" disabled={isPast} className="rounded-lg gap-2 text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100">
                          <Video className="h-4 w-4" /> Entrar a Llamada
                        </Button>
                      </Link>
                    )}
                    
                    {isAuthorized && (
                      <div className="flex gap-1 ml-2 pl-2 border-l">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(vc)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(vc.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Video className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No hay clases en vivo programadas.</p>
            <p className="text-xs text-slate-400 mt-1">Crea una sesión para mantener a tus estudiantes conectados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
