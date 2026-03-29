
'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  UserCircle, 
  Mail, 
  Briefcase,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Percent
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc, addDoc } from 'firebase/firestore';
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

export default function AdminApplicationsPage() {
  const db = useFirestore();
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [revenueShare, setRevenueShare] = useState('70');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const appsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'instructor_applications'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: applications, isLoading } = useCollection(appsQuery);

  const handleApprove = () => {
    if (!db || !selectedApp) return;

    // 1. Aprobar solicitud
    updateDocumentNonBlocking(doc(db, 'instructor_applications', selectedApp.id), {
      status: 'approved'
    });

    // 2. Convertir usuario en instructor y asignar porcentaje
    updateDocumentNonBlocking(doc(db, 'users', selectedApp.userId), {
      role: 'instructor',
      instructorStatus: 'active',
      revenueSharePercentage: parseInt(revenueShare)
    });

    // 3. Notificar al solicitante
    addDoc(collection(db, 'notifications'), {
      userId: selectedApp.userId,
      title: '¡Solicitud Aprobada!',
      message: 'Tu perfil como instructor ha sido activado. Ya puedes empezar a publicar cursos.',
      read: false,
      link: '/admin/finances',
      type: 'success',
      createdAt: new Date()
    }).catch(err => console.error("Error creating notification", err));

    setIsDialogOpen(false);
    setSelectedApp(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/10 p-2.5 rounded-2xl">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-4xl font-headline font-bold text-slate-900">Solicitudes de Instructores</h1>
          </div>
          <p className="text-muted-foreground">Revisa los perfiles de los expertos que han pagado su licencia de creador.</p>
        </header>

        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-x-auto">
          {isLoading ? (
            <div className="p-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : applications && applications.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="pl-8">Candidato</TableHead>
                  <TableHead>Especialidad</TableHead>
                  <TableHead>Referencia Pago</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right pr-8">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id} className="border-slate-100">
                    <TableCell className="pl-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-xl"><UserCircle className="h-5 w-5 text-slate-500" /></div>
                        <div>
                          <p className="font-bold text-slate-900">{app.userName}</p>
                          <p className="text-xs text-muted-foreground">{app.userEmail}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="rounded-lg">{app.specialty}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-[10px] bg-slate-100 px-2 py-1 rounded font-mono">{app.paymentReference}</code>
                    </TableCell>
                    <TableCell>
                      {app.status === 'pending' ? (
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pendiente</Badge>
                      ) : app.status === 'approved' ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Aprobado</Badge>
                      ) : (
                        <Badge variant="destructive">Rechazado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-xl gap-2 font-bold"
                        onClick={() => {
                          setSelectedApp(app);
                          setIsDialogOpen(true);
                        }}
                      >
                        Ver Perfil <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-20 bg-slate-50/50">
              <p className="text-muted-foreground italic">No hay solicitudes nuevas en este momento.</p>
            </div>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] rounded-[2.5rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline">Revisión de Candidato</DialogTitle>
              <DialogDescription>Valida la información y define el porcentaje de ganancias.</DialogDescription>
            </DialogHeader>
            
            {selectedApp && (
              <div className="py-6 space-y-8">
                <div className="space-y-4">
                  <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Bio del Experto</h4>
                    <p className="text-sm leading-relaxed text-slate-700 italic">"{selectedApp?.bio || 'Sin descripción'}"</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-700 uppercase">Estado de Pago</p>
                      <p className="text-sm font-bold flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Licencia Pagada</p>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <p className="text-[10px] font-bold text-primary uppercase">Especialidad</p>
                      <p className="text-sm font-bold">{selectedApp.specialty}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <Label className="font-bold flex items-center gap-2">
                    <Percent className="h-4 w-4 text-primary" />
                    Ganancia del Instructor (%)
                  </Label>
                  <div className="flex items-center gap-4">
                    <Input 
                      type="number" 
                      value={revenueShare} 
                      onChange={(e) => setRevenueShare(e.target.value)}
                      className="rounded-xl h-12 text-center text-xl font-bold max-w-[120px]"
                    />
                    <p className="text-xs text-muted-foreground flex-1">
                      Este instructor recibirá el **{revenueShare}%** de cada curso vendido. La plataforma retendrá el {100 - parseInt(revenueShare)}%.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl h-12 flex-1" onClick={() => setIsDialogOpen(false)}>Cerrar</Button>
              <Button className="rounded-xl h-12 flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove}>
                Aprobar Instructor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
