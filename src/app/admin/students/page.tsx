
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Search, 
  Mail, 
  ChevronRight, 
  Loader2, 
  UserCircle,
  Crown,
  ArrowLeft,
  UserCheck,
  UserX,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Trophy,
  Copy,
  Info,
  Plus,
  CheckCircle2,
  Send,
  History
} from 'lucide-react';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useUser, useMemoFirebase, useDoc, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, collectionGroup, getDocs, getDoc, where, setDoc, serverTimestamp } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { deleteDocumentNonBlocking } from '@/firebase';

import { sendCustomEmailAction, sendBulkCustomEmailAction } from '@/app/actions/email';

export default function AdminStudentsPage() {
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [filterCourseId, setFilterCourseId] = useState<string>('all');
  const [enrolledUserIds, setEnrolledUserIds] = useState<string[] | null>(null);
  const [isLoadingFilter, setIsLoadingFilter] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user: currentUser } = useUser();

  // Estados para Correo Masivo
  const [showBulkEmailDialog, setShowBulkEmailDialog] = useState(false);
  const [bulkEmailSubject, setBulkEmailSubject] = useState('');
  const [bulkEmailMessage, setBulkEmailMessage] = useState('');
  const [isSendingBulkEmail, setIsSendingBulkEmail] = useState(false);


  const usersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: students, isLoading } = useCollection(usersQuery);

  const coursesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'courses');
  }, [db]);
  const { data: allCourses } = useCollection(coursesQuery);

  useEffect(() => {
    if (!db) return;
    if (filterCourseId === 'all') {
      setEnrolledUserIds(null);
      setIsLoadingFilter(false);
      return;
    }

    const fetchEnrolled = async () => {
      setIsLoadingFilter(true);
      try {
        const snap = await getDocs(query(collectionGroup(db, 'courseProgress'), where('courseId', '==', filterCourseId)));
        // Extraemos el ID del usuario (el abuelo del documento courseProgress)
        const ids = snap.docs.map(d => d.ref.parent.parent?.id).filter(Boolean) as string[];
        setEnrolledUserIds([...new Set(ids)]);
      } catch (error: any) {
        console.error("Firebase Index Error:", error);
        toast({
          variant: "destructive",
          title: "Requiere Índice de Firebase",
          description: "La primera vez que uses este filtro debes crear un índice de Collection Group. Revisa la consola de tu navegador (F12) para hacer clic en el enlace proporcionado por Firebase.",
        });
        setEnrolledUserIds([]);
      } finally {
        setIsLoadingFilter(false);
      }
    };

    fetchEnrolled();
  }, [db, filterCourseId, toast]);

  const handleSyncAllProgress = async () => {
    if (!currentUser || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/admin/recalculate-all-progress', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al sincronizar indicadores');
      }

      const data = await res.json();
      toast({
        title: "Sincronización Completada",
        description: `Se actualizaron ${data.results.updatedUsersXp || data.results.usersXpUpdated} usuarios correctamente.`
      });
      router.refresh();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Fallo de Sincronización",
        description: err.message
      });
    }
 finally {
      setIsSyncing(false);
    }
  };

  // Filtramos para mostrar usuarios registrados y NO administradores (para evitar auto-modificación accidental)
  const filteredStudents = students?.filter(s => {
    const hasEmail = !!s.email;
    const isNotAdmin = s.role !== 'admin';
    const matchesSearch = s.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = filterCourseId === 'all' || (enrolledUserIds !== null && enrolledUserIds.includes(s.id));
    
    return hasEmail && isNotAdmin && matchesSearch && matchesCourse;
  }) || [];

  const handleSendBulkEmail = async () => {
    if (!bulkEmailSubject || !bulkEmailMessage || filteredStudents.length === 0) return;

    setIsSendingBulkEmail(true);
    try {
      const recipients = filteredStudents.map(s => ({ 
        email: s.email, 
        name: s.displayName || 'Estudiante',
        id: s.id
      }));
      const result = await sendBulkCustomEmailAction(recipients, bulkEmailSubject, bulkEmailMessage);



      if (result.success) {
        toast({
          title: "Envío Masivo Completado",
          description: result.summary
        });
        setShowBulkEmailDialog(false);
        setBulkEmailSubject('');
        setBulkEmailMessage('');
      } else {
        throw new Error(result.error);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error en Envío Masivo",
        description: err.message
      });
    } finally {
      setIsSendingBulkEmail(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        {selectedStudentId ? (
          <StudentDetailView 
            studentId={selectedStudentId} 
            allCourses={allCourses || []} 
            onBack={() => setSelectedStudentId(null)} 
          />
        ) : (
          <>
            <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-12">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="bg-primary/10 p-2.5 rounded-2xl">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="text-4xl font-headline font-bold">Gestión de Usuarios</h1>
                </div>
                <p className="text-muted-foreground">Monitorea el progreso, gestiona roles y estados de cuenta.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <Button 
                  onClick={handleSyncAllProgress} 
                  disabled={isSyncing}
                  variant="outline" 
                  className="rounded-xl h-11 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 gap-2 whitespace-nowrap"
                >
                  {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                  {isSyncing ? 'Sincronizando...' : 'Recalcular Progresos'}
                </Button>

                <Button 
                  onClick={() => setShowBulkEmailDialog(true)}
                  disabled={filteredStudents.length === 0}
                  className="rounded-xl h-11 bg-primary text-white hover:bg-primary/90 gap-2 whitespace-nowrap"
                >
                  <Mail className="h-4 w-4" />
                  Correo Masivo ({filteredStudents.length})
                </Button>

                <div className="w-full sm:w-64">
                  <Select value={filterCourseId} onValueChange={setFilterCourseId}>
                    <SelectTrigger className="rounded-xl h-11 border-slate-200">
                      <SelectValue placeholder="Filtrar por curso..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los cursos</SelectItem>
                      {allCourses?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar por nombre o email..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-xl h-11 border-slate-200"
                  />
                </div>
              </div>
            </header>

            <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-x-auto">
              {isLoading || isLoadingFilter ? (
                <div className="p-20 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground font-medium">Aplicando filtros de base de datos...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-none hover:bg-slate-50">
                      <TableHead className="pl-8 h-14">Usuario</TableHead>
                      <TableHead>Rol Actual</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Registrado</TableHead>
                      <TableHead className="text-right pr-8">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map((student) => (
                        <TableRow key={student.id} className={`border-slate-100 group ${student.isActive === false ? 'opacity-60 grayscale' : ''}`}>
                          <TableCell className="pl-8 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-slate-100">
                                <AvatarImage src={student.profileImageUrl} />
                                <AvatarFallback><UserCircle className="h-6 w-6" /></AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{student.displayName || 'Estudiante'}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{student.email}</span>
                                  {student.tempPassword && (
                                    <Badge variant="outline" className="h-4 px-1 text-[8px] border-amber-200 bg-amber-50 text-amber-700 font-bold uppercase">
                                      Pass: {student.tempPassword}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {student.role === 'instructor' ? (
                              <Badge className="bg-purple-100 text-purple-700 border-purple-200 gap-1 rounded-lg">
                                <GraduationCap className="h-3 w-3" /> Instructor
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="rounded-lg gap-1">
                                <Users className="h-3 w-3" /> Estudiante
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {student.isActive === false ? (
                              <Badge variant="destructive" className="rounded-lg gap-1">
                                <UserX className="h-3 w-3" /> Inactivo
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 rounded-lg gap-1">
                                <UserCheck className="h-3 w-3" /> Activo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-500 text-sm">
                            {student.createdAt ? new Date(student.createdAt.toDate()).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right pr-8">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="rounded-xl gap-2 h-10 group-hover:bg-primary group-hover:text-white transition-all"
                              onClick={() => setSelectedStudentId(student.id)}
                            >
                              Gestionar
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                          No se encontraron usuarios que coincidan con la búsqueda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>

            {/* Dialog para enviar correo masivo */}
            <Dialog open={showBulkEmailDialog} onOpenChange={setShowBulkEmailDialog}>
              <DialogContent className="sm:max-w-[700px] rounded-[2.5rem] p-0 overflow-hidden">
                <div className="bg-primary/5 p-8 border-b">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary/10 p-2 rounded-xl">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-headline font-bold">Enviar Correo Masivo</DialogTitle>
                  </div>
                  <DialogDescription>
                    Este mensaje se enviará a los <strong>{filteredStudents.length} usuarios</strong> que aparecen actualmente en tu lista filtrada.
                  </DialogDescription>
                </div>
                
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700">Asunto del Comunicado</Label>
                    <Input 
                      placeholder="Ej: Nuevas actualizaciones en la plataforma..." 
                      value={bulkEmailSubject}
                      onChange={(e) => setBulkEmailSubject(e.target.value)}
                      className="rounded-xl border-slate-200 h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700">Contenido del Mensaje</Label>
                    <Textarea 
                      placeholder="Escribe el mensaje general para todos los estudiantes..." 
                      value={bulkEmailMessage}
                      onChange={(e) => setBulkEmailMessage(e.target.value)}
                      className="rounded-2xl border-slate-200 min-h-[250px] resize-none"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-800 flex items-start gap-3">
                    <Info className="h-5 w-5 shrink-0" />
                    <p>
                      <strong>Nota de seguridad:</strong> El envío masivo procesará a cada destinatario de forma individual para evitar que los correos sean marcados como SPAM. Dependiendo de la cantidad de alumnos, este proceso puede tomar unos segundos.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      variant="ghost" 
                      className="flex-1 rounded-xl h-12" 
                      onClick={() => setShowBulkEmailDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      className="flex-1 rounded-xl h-12 font-bold gap-2 shadow-lg shadow-primary/20" 
                      disabled={!bulkEmailSubject || !bulkEmailMessage || isSendingBulkEmail}
                      onClick={handleSendBulkEmail}
                    >
                      {isSendingBulkEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {isSendingBulkEmail ? 'Enviando Comunicados...' : `Enviar a ${filteredStudents.length} Alumnos`}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </main>
    </div>
  );
}

function StudentDetailView({ studentId, allCourses, onBack }: { studentId: string, allCourses: any[], onBack: () => void }) {
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const { user: currentUser } = useUser();
  
  const studentRef = useMemoFirebase(() => {
    if (!db || !studentId) return null;
    return doc(db, 'users', studentId);
  }, [db, studentId]);
  const { data: student } = useDoc(studentRef);

  // Verificamos si el usuario actual es admin
  const currentUserRef = useMemoFirebase(() => {
    if (!db || !currentUser?.uid) return null;
    return doc(db, 'users', currentUser.uid);
  }, [db, currentUser?.uid]);
  const { data: currentUserProfile } = useDoc(currentUserRef);
  const isAdmin = currentUserProfile?.role === 'admin' || currentUser?.email === 'demo@learnstream.ai';

  const progressQuery = useMemoFirebase(() => {
    if (!db || !studentId) return null;
    return collection(db, 'users', studentId, 'courseProgress');
  }, [db, studentId]);
  const { data: enrollments, isLoading: isProgressLoading } = useCollection(progressQuery);

  const emailsQuery = useMemoFirebase(() => {
    if (!db || !studentId) return null;
    return query(collection(db, 'sentEmails'), where('userId', '==', studentId), orderBy('sentAt', 'desc'));
  }, [db, studentId]);
  const { data: sentEmails, isLoading: isEmailsLoading } = useCollection(emailsQuery);


  const handleToggleStatus = (active: boolean) => {
    if (!db || !studentId) return;
    updateDocumentNonBlocking(doc(db, 'users', studentId), {
      isActive: active
    });
    router.refresh();
  };

  const handleRoleChange = (newRole: string) => {
    if (!db || !studentId) return;
    updateDocumentNonBlocking(doc(db, 'users', studentId), {
      role: newRole
    });
    router.refresh();
  };

  const handleDeleteUser = async () => {
    if (!db || !studentId || !isAdmin || !currentUser) return;
    setIsDeleting(true);
    try {
      // 1. Obtener Token de Administrador para la API
      const token = await currentUser.getIdToken();
      
      // 2. Llamar a la API que borra tanto de Auth como de Firestore
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: studentId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar el usuario');
      }

      toast({
        title: "Usuario eliminado",
        description: "La cuenta ha sido removida de Auth y la base de datos permanentemente."
      });
      onBack();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al eliminar",
        description: err.message || "No se pudo completar la eliminación total."
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const enrichedEnrollments = useMemo(() => {
    if (!enrollments || !allCourses) return [];
    
    // 1. Mapear con datos del curso y filtrar los que no existen o son plantillas (base)
    const enriched = enrollments.map(enr => {
      const course = allCourses.find(c => c.id === enr.courseId);
      return { ...enr, course };
    }).filter(e => e.course && !e.course.isBaseCourse);

    // 2. Deduplicar por el título del curso para evitar registros visualmente idénticos
    const uniqueByTitle: Record<string, any> = {};
    enriched.forEach(enr => {
      const title = enr.course.title;
      const existing = uniqueByTitle[title];
      
      // Priorizar el registro que tenga mayor progreso si hay nombres duplicados
      if (!existing || (enr.progressPercentage || 0) > (existing.progressPercentage || 0)) {
        uniqueByTitle[title] = enr;
      }
    });

    return Object.values(uniqueByTitle);
  }, [enrollments, allCourses]);

  const [isEnrolling, setIsEnrolling] = useState(false);
  const [courseToEnroll, setCourseToEnroll] = useState<string>('');

  // Estados para el correo personalizado
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const handleSendCustomEmail = async () => {
    if (!studentId || !emailSubject || !emailMessage) return;
    setIsSendingEmail(true);
    try {
      const { sendCustomEmailAction } = await import('@/app/actions/email');
      const result = await sendCustomEmailAction(
        student?.email, 
        student?.displayName || 'Estudiante', 
        emailSubject, 
        emailMessage,
        studentId
      );


      
      if (result.success) {
        toast({ title: "Correo enviado", description: "El estudiante recibirá tu mensaje en breve." });
        setShowEmailDialog(false);
        setEmailSubject('');
        setEmailMessage('');
      } else {
        toast({ variant: "destructive", title: "Error al enviar", description: result.error });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error crítico", description: err.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleManualEnroll = async () => {
    if (!db || !studentId || !courseToEnroll) return;
    setIsEnrolling(true);
    try {
      const progressRef = doc(db, 'users', studentId, 'courseProgress', courseToEnroll);
      const progressSnap = await getDoc(progressRef);
      
      const enrollmentData: any = {
        courseId: courseToEnroll,
        status: 'enrolled',
        enrollmentDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Solo inicializar a cero si el registro NO existe previamente
      if (!progressSnap.exists()) {
        enrollmentData.progressPercentage = 0;
        enrollmentData.completedLessons = [];
      }

      await setDoc(progressRef, enrollmentData, { merge: true });

      // Notificar al Admin
      const course = allCourses.find(c => c.id === courseToEnroll);
      await setDoc(doc(collection(db, 'notifications')), {
        userId: 'admin',
        title: 'Nueva Matrícula Manual',
        message: `Se ha matriculado a ${student?.displayName} en ${course?.title}`,
        type: 'info',
        read: false,
        createdAt: serverTimestamp(),
        link: '/admin/students'
      });

      // Enviar Correo de Bienvenida
      try {
        const { sendEnrollmentWelcomeAction } = await import('@/app/actions/email');
        const emailResult = await sendEnrollmentWelcomeAction(studentId, courseToEnroll);
        
        if (emailResult.success) {
          toast({ 
            title: "Estudiante matriculado", 
            description: "Se ha asignado el curso y enviado el correo de bienvenida correctamente." 
          });
        } else {
          toast({ 
            variant: "destructive",
            title: "Estudiante matriculado (Sin correo)", 
            description: `El curso fue asignado, pero el correo falló: ${emailResult.error}` 
          });
        }
      } catch (emailErr) {
        console.error("Error sending manual welcome email:", emailErr);
        toast({ 
          variant: "destructive",
          title: "Error crítico de correo", 
          description: "No se pudo conectar con el servicio de mensajería." 
        });
      }

      setCourseToEnroll('');
    } catch (err: any) {
      toast({ 
        variant: "destructive", 
        title: "Error al matricular", 
        description: err.message 
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
      <header className="flex flex-col gap-6">
        <Button variant="ghost" onClick={onBack} className="w-fit -ml-4 gap-2 text-muted-foreground hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Volver a Usuarios
        </Button>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
              <AvatarImage src={student?.profileImageUrl} />
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {student?.displayName?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h2 className="text-4xl font-headline font-bold text-slate-900">{student?.displayName || 'Usuario'}</h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {student?.email}</span>
                {student?.tempPassword && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 py-1 px-3">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Clave Temporal: <span className="font-mono font-bold tracking-wider">{student.tempPassword}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 ml-1 hover:bg-emerald-100 hover:text-emerald-800"
                      onClick={() => {
                        navigator.clipboard.writeText(student.tempPassword);
                        toast({ title: "Copiada", description: "La clave ha sido copiada al portapapeles." });
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </Badge>
                )}
                {student?.isPremiumSubscriber && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                    <Crown className="h-3 w-3 mr-1" /> Premium
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              variant="outline" 
              onClick={() => setShowEmailDialog(true)}
              className="h-full rounded-2xl border-primary/20 text-primary hover:bg-primary/5 gap-2 px-6"
            >
              <Mail className="h-5 w-5" />
              Enviar Correo
            </Button>

            <Card className="rounded-2xl border-slate-200 bg-white p-4 flex items-center gap-4">
              <div className="flex flex-col">
                <Label className="text-xs font-bold uppercase text-muted-foreground mb-1">Estado de la Cuenta</Label>

                <span className={`text-sm font-bold ${student?.isActive !== false ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {student?.isActive !== false ? 'Cuenta Activa' : 'Cuenta Suspendida'}
                </span>
              </div>
              <Switch 
                checked={student?.isActive !== false} 
                onCheckedChange={handleToggleStatus}
                className="data-[state=checked]:bg-emerald-500"
              />
            </Card>
            <Card className="rounded-2xl border-slate-200 bg-white p-4 flex items-center gap-4">
              <div className="p-2 bg-slate-100 rounded-lg">
                {student?.role === 'instructor' ? <GraduationCap className="h-5 w-5 text-purple-600" /> : <Users className="h-5 w-5 text-slate-600" />}
              </div>
            </Card>

            {student?.role === 'instructor' && (
              <Card className="rounded-2xl border-purple-200 bg-purple-50/30 p-4 flex items-center gap-4">
                <div className="flex flex-col">
                  <Label className="text-xs font-bold uppercase text-purple-600 mb-1">Permisos de Plantilla</Label>
                  <span className="text-sm font-bold text-slate-900">
                    {student?.canEditBases ? 'Puede editar plantillas' : 'Solo puede clonar plantillas'}
                  </span>
                </div>
                <Switch 
                  checked={!!student?.canEditBases} 
                  onCheckedChange={(checked) => {
                    if (!db || !studentId) return;
                    updateDocumentNonBlocking(doc(db, 'users', studentId), {
                      canEditBases: checked
                    });
                  }}
                  className="data-[state=checked]:bg-purple-600"
                />
              </Card>
            )}

            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="h-full rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-2 px-6">
                    <Trash2 className="h-5 w-5" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[2rem]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-headline font-bold">¿Estás completamente seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción eliminará permanentemente la cuenta de <strong>{student?.displayName || 'este estudiante'}</strong> ({student?.email}). 
                      Sus progresos y certificados dejarán de estar asociados a su cuenta de acceso.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2 pt-4">
                    <AlertDialogCancel className="rounded-xl border-slate-200">Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDeleteUser}
                      disabled={isDeleting}
                      className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                      Confirmar Eliminación
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Resumen Académico</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-xl"><BookOpen className="h-5 w-5 text-blue-600" /></div>
                  <span className="text-sm font-medium text-slate-600">Cursos Inscritos</span>
                </div>
                <span className="text-xl font-bold">{enrichedEnrollments.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-xl"><Trophy className="h-5 w-5 text-emerald-600" /></div>
                  <span className="text-sm font-medium text-slate-600">Certificados</span>
                </div>
                <span className="text-xl font-bold">{enrichedEnrollments.filter(e => e.status === 'completed').length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <History className="h-4 w-4" /> Historial de Comunicaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[400px] overflow-y-auto">
              {isEmailsLoading ? (
                <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : sentEmails && sentEmails.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {sentEmails.map((email: any) => (
                    <div key={email.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-primary uppercase">{email.type === 'bulk' ? 'Masivo' : 'Directo'}</span>
                        <span className="text-[10px] text-slate-400">
                          {email.sentAt ? new Date(email.sentAt.toDate()).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <h5 className="text-sm font-bold text-slate-900 line-clamp-1">{email.subject}</h5>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{email.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 text-xs italic">
                  No hay registros de correos enviados.
                </div>
              )}
            </CardContent>
          </Card>
        </div>


        <div className="lg:col-span-2 space-y-8">
          <section>
            <h3 className="text-xl font-headline font-bold mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Progreso Académico
              </div>
              
              <div className="flex items-center gap-2">
                <Select value={courseToEnroll} onValueChange={setCourseToEnroll}>
                  <SelectTrigger className="w-64 rounded-xl h-10 border-slate-200 bg-white">
                    <SelectValue placeholder="Seleccionar curso..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allCourses.filter(c => !enrichedEnrollments.some(e => e.courseId === c.id)).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleManualEnroll} 
                  disabled={!courseToEnroll || isEnrolling}
                  className="rounded-xl h-10 gap-2 font-bold"
                >
                  {isEnrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Matricular
                </Button>
              </div>
            </h3>
            
            <div className="space-y-4">
              {isProgressLoading ? (
                <div className="p-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : enrichedEnrollments.length > 0 ? (
                enrichedEnrollments.map((enr) => (
                  <Card key={enr.id} className="rounded-2xl border border-slate-100 shadow-sm bg-white overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <h4 className="font-bold text-lg text-slate-900">{enr.course.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="rounded-lg text-[10px] h-5">{enr.course.technology}</Badge>
                            {enr.status === 'completed' ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] h-5">Finalizado</Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] h-5">En Progreso</Badge>
                            )}
                          </div>
                        </div>

                        {/* Colores dinámicos para la barra de progreso */}
                        {(() => {
                          const percentage = enr.progressPercentage || 0;
                          let colorClass = "bg-rose-500"; // Bajo
                          if (percentage >= 100) colorClass = "bg-emerald-500"; // Completado
                          else if (percentage >= 70) colorClass = "bg-emerald-400"; // Alto
                          else if (percentage >= 35) colorClass = "bg-amber-400"; // Medio
                          
                          return (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                              <div className="w-full sm:w-48 space-y-2">
                                <div className="flex justify-between text-xs font-bold text-slate-500">
                                  <span>Progreso</span>
                                  <span className={percentage >= 100 ? "text-emerald-600" : ""}>{Math.round(percentage)}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${colorClass} transition-all duration-500`} 
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                              
                              {enr.status === 'completed' && (
                                <Link href={`/courses/${enr.courseId}/certificate?uid=${studentId}`} target="_blank">
                                  <Button size="sm" variant="outline" className="rounded-xl gap-2 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                                    <Trophy className="h-3.5 w-3.5" />
                                    Ver Certificado
                                  </Button>
                                </Link>
                              )}
                            </div>
                          );
                        })()}


                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-500 italic text-sm">Sin inscripciones activas.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Dialog para enviar correo personalizado */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] p-0 overflow-hidden">
          <div className="bg-primary/5 p-8 border-b">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary/10 p-2 rounded-xl">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-2xl font-headline font-bold">Enviar Correo a {student?.displayName}</DialogTitle>
            </div>
            <DialogDescription>
              Escribe el asunto y el mensaje que deseas enviar directamente al correo del estudiante.
            </DialogDescription>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Asunto</Label>
              <Input 
                placeholder="Ej: Información sobre tu progreso..." 
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="rounded-xl border-slate-200 h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Mensaje</Label>
              <Textarea 
                placeholder="Escribe tu mensaje aquí..." 
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="rounded-2xl border-slate-200 min-h-[200px] resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="ghost" 
                className="flex-1 rounded-xl h-12" 
                onClick={() => setShowEmailDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1 rounded-xl h-12 font-bold gap-2 shadow-lg shadow-primary/20" 
                disabled={!emailSubject || !emailMessage || isSendingEmail}
                onClick={handleSendCustomEmail}
              >
                {isSendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar Mensaje
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>

  );
}
