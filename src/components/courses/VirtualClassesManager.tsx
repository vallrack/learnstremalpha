'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, doc, Timestamp } from 'firebase/firestore';
import { Plus, Edit, Trash2, Video, CalendarIcon, Loader2, Link as LinkIcon, ExternalLink, PlayCircle, Clock, Users, Zap, Info, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function VirtualClassesManager({ courseId, isAuthorized }: { courseId: string, isAuthorized: boolean }) {
  const db = useFirestore();
  const { toast } = useToast();
  
  const courseRef = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return doc(db, 'courses', courseId);
  }, [db, courseId]);
  const { data: course } = useDoc(courseRef);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [groupId, setGroupId] = useState('all');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [customMeetLink, setCustomMeetLink] = useState('');
  const [technology, setTechnology] = useState('');
  const [accessType, setAccessType] = useState('course'); // free, course, plan, paid
  const [price, setPrice] = useState('0');
  const [currency, setCurrency] = useState('COP');
  const [showInCatalog, setShowInCatalog] = useState(false);

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
      technology,
      accessType,
      price: accessType === 'paid' ? Number(price) : 0,
      currency: accessType === 'paid' ? currency : 'COP',
      showInCatalog,
      updatedAt: serverTimestamp(),
      courseId,
      courseTitle: course?.title || 'Unknown Course',
      instructorName: course?.instructorName || 'Unknown Instructor'
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
    setTechnology(vc.technology || '');
    setAccessType(vc.accessType || 'course');
    setPrice(vc.price?.toString() || '0');
    setCurrency(vc.currency || 'COP');
    setShowInCatalog(vc.showInCatalog || false);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setTitle('');
    setDate('');
    setTime('');
    setGroupId('all');
    setRecordingUrl('');
    setCustomMeetLink('');
    setTechnology('');
    setAccessType('course');
    setPrice('0');
    setCurrency('COP');
    setShowInCatalog(false);
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-3xl font-headline font-bold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
              <div className="p-2 bg-blue-50 rounded-2xl">
                <Video className="h-7 w-7 text-blue-600" />
              </div>
              Clases en Vivo
            </h3>
            <p className="text-slate-500 text-sm font-medium ml-1">Gestiona sesiones síncronas y grabaciones para tus estudiantes.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-2xl h-12 px-6 gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                <Plus className="h-5 w-5" /> Programar Clase
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl">
              <form onSubmit={handleSaveClass}>
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Video className="h-16 w-16 rotate-12" />
                   </div>
                   <DialogHeader>
                    <DialogTitle className="text-xl font-headline font-bold text-white">
                        {editingClassId ? 'Editar Sesión' : 'Nueva Sesión en Vivo'}
                    </DialogTitle>
                    <DialogDescription className="text-blue-100 text-xs max-w-[400px]">
                      Configura los detalles de tu clase de forma rápida.
                    </DialogDescription>
                  </DialogHeader>
                </div>
                
                <ScrollArea className="max-h-[60vh]">
                  <div className="p-4 space-y-4">
                    {/* Sección: Detalles Básicos */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-wider text-xs">
                        <Info className="h-4 w-4 text-blue-500" />
                        Información General
                      </div>
                      <div className="grid gap-4">
                        <div className="grid gap-1.5">
                          <Label className="text-slate-700 font-semibold ml-1 text-sm">Título de la Clase</Label>
                          <Input 
                            placeholder="Ej: Masterclass de Arquitectura React" 
                            value={title} 
                            onChange={(e) => setTitle(e.target.value)} 
                            required 
                            className="rounded-xl h-10 border-slate-200 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50" 
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="grid gap-1.5">
                            <Label className="text-slate-700 font-semibold ml-1 text-sm">Fecha</Label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    type="date" 
                                    value={date} 
                                    onChange={(e) => setDate(e.target.value)} 
                                    required 
                                    className="rounded-xl h-10 pl-12 border-slate-200 bg-slate-50/50 focus:ring-blue-500/20" 
                                />
                            </div>
                          </div>
                          <div className="grid gap-1.5">
                             <Label className="text-slate-700 font-semibold ml-1 text-sm">Hora (Local)</Label>
                             <div className="relative">
                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input 
                                    type="time" 
                                    value={time} 
                                    onChange={(e) => setTime(e.target.value)} 
                                    required 
                                    className="rounded-xl h-10 pl-12 border-slate-200 bg-slate-50/50 focus:ring-blue-500/20" 
                                />
                            </div>
                          </div>
                        </div>

                          </div>
                        </div>
                      </div>

                      {/* Sección: Visibilidad y Acceso */}
                      <div className="space-y-4">
                          <div className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-wider text-xs">
                            <Users className="h-4 w-4 text-indigo-500" />
                            Acceso y Visibilidad
                          </div>
                          <div className="grid gap-4 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="grid gap-1.5">
                                  <Label className="text-slate-700 font-semibold ml-1 text-sm">Público y Acceso</Label>
                                  <Select value={groupId === 'all' ? accessType : groupId} onValueChange={(val) => {
                                      if (['free', 'course', 'plan', 'paid'].includes(val)) {
                                          setAccessType(val);
                                          setGroupId('all');
                                      } else {
                                          setGroupId(val);
                                          setAccessType('course');
                                      }
                                  }}>
                                    <SelectTrigger className="rounded-xl h-10 border-slate-200 bg-white">
                                      <SelectValue placeholder="¿Quiénes pueden unirse?" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      <SelectItem value="free" className="rounded-lg">🔓 Público (Gratis)</SelectItem>
                                      <SelectItem value="course" className="rounded-lg">🎓 Estudiantes del Curso</SelectItem>
                                      <SelectItem value="plan" className="rounded-lg">💎 Suscriptores Premium (Plan)</SelectItem>
                                      <SelectItem value="paid" className="rounded-lg">💰 Pago Único (Venta)</SelectItem>
                                      {groups && groups.length > 0 && (
                                          <>
                                              <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase border-t mt-1">Grupos Específicos</div>
                                              {groups.map(g => (
                                                  <SelectItem key={g.id} value={g.id} className="rounded-lg text-xs">Grupo: {g.name}</SelectItem>
                                              ))}
                                          </>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Clasificación para Catálogo */}
                                <div className="flex flex-col gap-1.5 justify-center">
                                    <div className="flex items-center justify-between p-2 rounded-xl border border-blue-100 bg-blue-50/30">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                                            <Label className="text-[11px] font-bold text-slate-800">En Catálogo Público</Label>
                                        </div>
                                        <div 
                                            className={cn(
                                                "w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out shrink-0",
                                                showInCatalog ? "bg-blue-600" : "bg-slate-300"
                                            )}
                                            onClick={() => setShowInCatalog(!showInCatalog)}
                                        >
                                            <div 
                                                className={cn(
                                                    "w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out",
                                                    showInCatalog ? "translate-x-5" : "translate-x-0"
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                              </div>

                              {accessType === 'paid' && (
                                  <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 animate-in zoom-in-95 duration-200">
                                      <div className="grid gap-1.5">
                                          <Label className="text-amber-800 font-bold ml-1 text-[10px] uppercase">Precio de Entrada</Label>
                                          <Input 
                                              type="number" 
                                              value={price} 
                                              onChange={(e) => setPrice(e.target.value)}
                                              className="rounded-lg h-9 bg-white border-amber-200" 
                                          />
                                      </div>
                                      <div className="grid gap-1.5">
                                          <Label className="text-amber-800 font-bold ml-1 text-[10px] uppercase">Moneda</Label>
                                          <Select value={currency} onValueChange={setCurrency}>
                                              <SelectTrigger className="rounded-lg h-9 bg-white border-amber-200">
                                                  <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                  <SelectItem value="COP">COP (Pesos)</SelectItem>
                                                  <SelectItem value="USD">USD (Dólares)</SelectItem>
                                              </SelectContent>
                                          </Select>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-900 font-bold uppercase tracking-wider text-xs px-1 pt-2">
                          <LinkIcon className="h-4 w-4 text-indigo-500" />
                          Configuración de Conexión
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Sección: Videollamada */}
                      <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100/50 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold flex items-center gap-1.5 text-indigo-700 uppercase tracking-tight">
                                <LinkIcon className="h-3 w-3" /> Enlace Sesión
                            </Label>
                            <Badge variant="outline" className="bg-white text-indigo-600 border-indigo-100 text-[8px] font-bold uppercase py-0 px-1 h-3.5">Opcional</Badge>
                        </div>
                        <Input 
                            placeholder="https://meet.google.com/..." 
                            value={customMeetLink} 
                            onChange={(e) => setCustomMeetLink(e.target.value)} 
                            className="rounded-lg h-9 bg-white border-indigo-100 focus:ring-indigo-500/20 text-sm" 
                        />
                        <p className="text-[9px] text-indigo-600/60 leading-tight">Vacio usa <strong>Jitsi Meet</strong>.</p>
                      </div>

                      {/* Sección: Grabación */}
                      <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100/50 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-[10px] font-bold flex items-center gap-1.5 text-emerald-700 uppercase tracking-tight">
                                <PlayCircle className="h-3 w-3" /> Link Grabación
                            </Label>
                            <Badge variant="outline" className="bg-white text-emerald-600 border-emerald-100 text-[8px] font-bold uppercase py-0 px-1 h-3.5">Opcional</Badge>
                        </div>
                        <Input 
                            placeholder="https://www.youtube.com/..." 
                            value={recordingUrl} 
                            onChange={(e) => setRecordingUrl(e.target.value)} 
                            className="rounded-lg h-9 bg-white border-emerald-100 focus:ring-emerald-500/20 text-sm" 
                        />
                        <p className="text-[9px] text-emerald-600/60 leading-tight">Link de YouTube/Drive al finalizar.</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                
                <div className="p-4 bg-slate-50 border-t flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="ghost" 
                    type="button" 
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1 rounded-xl h-10 font-bold text-slate-500 hover:bg-white"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-[2] rounded-xl h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-bold text-white shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
                  >
                    {editingClassId ? 'Guardar' : 'Programar Clase'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {classes && classes.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {classes.map(vc => {
              const isPast = vc.scheduledAt ? vc.scheduledAt.toDate() < new Date() : false;
              const gName = vc.groupId ? groups?.find(g => g.id === vc.groupId)?.name || 'Grupo Eliminado' : 'Todos';
              
              return (
                <div 
                  key={vc.id} 
                  className={cn(
                    "group relative p-6 rounded-[2rem] border transition-all duration-300 flex flex-col md:flex-row items-center justify-between gap-6",
                    isPast 
                      ? "bg-slate-50/50 border-slate-100 opacity-80" 
                      : "bg-white border-slate-100 hover:border-blue-200 hover:shadow-[0_15px_40px_rgba(59,130,246,0.08)]"
                  )}
                >
                  <div className="flex items-start gap-5 w-full md:w-auto">
                    <div className={cn(
                        "p-4 rounded-[1.5rem] shrink-0 transition-transform duration-300 group-hover:scale-110",
                        isPast ? 'bg-slate-200 text-slate-500' : 'bg-blue-50 text-blue-600'
                    )}>
                      <Video className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className={cn(
                            "text-lg font-bold transition-colors",
                            isPast ? 'text-slate-500' : 'text-slate-900 group-hover:text-blue-600'
                        )}>
                          {vc.title}
                        </h4>
                        {isPast && <Badge variant="secondary" className="text-[10px] font-bold bg-slate-200 text-slate-600 uppercase">Finalizada</Badge>}
                        {!isPast && (
                            <Badge variant="outline" className="text-[10px] font-bold border-blue-200 text-blue-600 bg-blue-50 uppercase animate-pulse">
                                Programada
                            </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Clock className="h-3.5 w-3.5" />
                            {vc.scheduledAt ? new Date(vc.scheduledAt.toDate()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha'}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                            <Users className="h-3.5 w-3.5" />
                            <span className="font-semibold text-slate-700">
                                {vc.accessType === 'free' ? '🔓 Público' : 
                                 vc.accessType === 'plan' ? '💎 Premium Plan' : 
                                 vc.accessType === 'paid' ? `💰 Venta (${vc.price} ${vc.currency})` : 
                                 `🎓 ${gName}`}
                            </span>
                        </div>
                        {vc.technology && (
                            <div className="flex items-center gap-1.5">
                                <Zap className="h-3.5 w-3.5 text-indigo-500" />
                                <span className="text-sm font-medium text-slate-600">{vc.technology}</span>
                            </div>
                        )}
                        {vc.showInCatalog && (
                            <Badge variant="outline" className="text-[10px] font-bold border-blue-100 text-blue-600 bg-blue-50/50">
                                🌟 En Catálogo
                            </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    {vc.recordingUrl ? (
                      <Link href={vc.recordingUrl} target="_blank" className="w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="w-full rounded-2xl h-10 px-5 gap-2 border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 hover:border-emerald-300 transition-colors">
                          <PlayCircle className="h-4 w-4" /> Ver Grabación
                        </Button>
                      </Link>
                    ) : (
                      <Link href={vc.meetLink || '#'} target="_blank" className="w-full sm:w-auto">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={isPast} 
                            className={cn(
                                "w-full rounded-2xl h-10 px-5 gap-2 transition-all",
                                isPast 
                                  ? "text-slate-400 border-slate-200" 
                                  : "text-blue-700 border-blue-200 bg-blue-50/50 hover:bg-blue-600 hover:text-white hover:border-blue-600 hover:shadow-lg hover:shadow-blue-500/20"
                            )}
                        >
                          <Video className="h-4 w-4" /> 
                          {isPast ? 'Finalizada' : 'Entrar a la Clase'}
                        </Button>
                      </Link>
                    )}
                    
                    {isAuthorized && (
                      <div className="flex gap-2 ml-2 pl-4 border-l border-slate-100">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 rounded-xl hover:bg-blue-50 hover:text-blue-600" 
                            onClick={() => handleEdit(vc)}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600" 
                            onClick={() => handleDelete(vc.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200/60">
            <div className="bg-white p-6 rounded-3xl inline-flex mb-6 shadow-sm">
                <Video className="h-12 w-12 text-slate-300" />
            </div>
            <h4 className="text-xl font-bold text-slate-800 mb-2">No hay clases programadas</h4>
            <p className="text-slate-500 font-medium max-w-xs mx-auto">Comienza ahora mismo y crea una sesión para inspirar a tus estudiantes.</p>
            <Button 
                variant="ghost" 
                onClick={() => setIsDialogOpen(true)}
                className="mt-6 font-bold text-blue-600 hover:bg-blue-50 rounded-xl"
            >
                Programar primera clase
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
