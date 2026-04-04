'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { 
  Megaphone, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Calendar as CalendarIcon, 
  Clock, 
  Eye,
  CheckCircle2,
  XCircle,
  Layout,
  UserCheck,
  Users
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  useCollection, 
  useFirestore, 
  useUser, 
  useDoc, 
  useMemoFirebase, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from '@/firebase';
import { collection, serverTimestamp, doc, Timestamp, query, orderBy } from 'firebase/firestore';
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
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const PAGES_OPTIONS = [
  { id: 'home', label: 'Inicio / Home' },
  { id: 'dashboard', label: 'Dashboard General' },
  { id: 'courses', label: 'Catálogo de Cursos' },
  { id: 'challenges', label: 'Sección Desafíos' },
  { id: 'learning', label: 'Reproductor de Lecciones' }
];

const ROLES_OPTIONS = [
  { id: 'student', label: 'Estudiante' },
  { id: 'instructor', label: 'Instructor/Docente' },
  { id: 'admin', label: 'Administrador' }
];

export default function AdminAnnouncementsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Auth checking
  const isDemoAccount = user?.email === 'demo@learnstream.ai';
  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  const isAdmin = profile?.role === 'admin' || isDemoAccount;

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [ctaText, setCtaText] = useState('Ver más');
  const [ctaLink, setCtaLink] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [targetPages, setTargetPages] = useState<string[]>(['home']);
  const [targetRoles, setTargetRoles] = useState<string[]>(['student']);

  const announcementsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: announcements, isLoading } = useCollection(announcementsQuery);

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setImageUrl('');
    setCtaText('Ver más');
    setCtaLink('');
    setExpiresAt('');
    setIsActive(true);
    setTargetPages(['home']);
    setTargetRoles(['student']);
  };

  const handleEditClick = (ann: any) => {
    setEditingId(ann.id);
    setTitle(ann.title || '');
    setDescription(ann.description || '');
    setImageUrl(ann.imageUrl || '');
    setCtaText(ann.ctaText || 'Ver más');
    setCtaLink(ann.ctaLink || '');
    setIsActive(ann.isActive ?? true);
    setTargetPages(ann.targetPages || ['home']);
    setTargetRoles(ann.targetRoles || ['student']);
    
    if (ann.expiresAt) {
      const date = ann.expiresAt instanceof Timestamp ? ann.expiresAt.toDate() : new Date(ann.expiresAt);
      setExpiresAt(date.toISOString().split('T')[0]);
    } else {
      setExpiresAt('');
    }
    
    setIsDialogOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !isAdmin) return;

    const annData: any = {
      title: title.trim(),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      ctaText: ctaText.trim(),
      ctaLink: ctaLink.trim(),
      isActive,
      targetPages,
      targetRoles,
      updatedAt: serverTimestamp(),
    };

    if (expiresAt) {
      annData.expiresAt = Timestamp.fromDate(new Date(expiresAt));
    } else {
      annData.expiresAt = null;
    }

    if (editingId) {
      updateDocumentNonBlocking(doc(db, 'announcements', editingId), annData);
    } else {
      annData.createdAt = serverTimestamp();
      addDocumentNonBlocking(collection(db, 'announcements'), annData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (!db || !isAdmin) return;
    if (confirm('¿Eliminar este anuncio permanentemente?')) {
      deleteDocumentNonBlocking(doc(db, 'announcements', id));
    }
  };

  const togglePage = (pageId: string) => {
    setTargetPages(prev => 
      prev.includes(pageId) ? prev.filter(p => p !== pageId) : [...prev, pageId]
    );
  };

  const toggleRole = (roleId: string) => {
    setTargetRoles(prev => 
      prev.includes(roleId) ? prev.filter(r => r !== roleId) : [...prev, roleId]
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-headline font-bold mb-2 flex items-center gap-3">
              <Megaphone className="h-8 w-8 text-primary" />
              Gestión de Anuncios
            </h1>
            <p className="text-muted-foreground">Crea popups de promociones y anuncios educativos segmentados.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 gap-2 shadow-lg shadow-primary/10">
                <Plus className="h-4 w-4" />
                Nuevo Anuncio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] rounded-[2rem] overflow-y-auto max-h-[90vh]">
              <form onSubmit={handleFormSubmit}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline">{editingId ? 'Editar Anuncio' : 'Crear Anuncio'}</DialogTitle>
                  <DialogDescription>
                    Define el contenido y la segmentación del popup promocional.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-6 py-8">
                  <div className="grid gap-2">
                    <Label className="font-bold">Título del Anuncio</Label>
                    <Input 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      required 
                      placeholder="Ej: ¡50% de descuento en el Pack Premium!" 
                      className="rounded-xl h-12" 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label className="font-bold">Descripción / Mensaje</Label>
                    <Textarea 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      required 
                      placeholder="Explica de qué trata la promoción o el anuncio..." 
                      className="rounded-xl min-h-[100px]" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="font-bold">Texto del Botón (CTA)</Label>
                      <Input 
                        value={ctaText} 
                        onChange={(e) => setCtaText(e.target.value)} 
                        required 
                        className="rounded-xl h-11" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="font-bold">Enlace del Botón</Label>
                      <Input 
                        value={ctaLink} 
                        onChange={(e) => setCtaLink(e.target.value)} 
                        required 
                        placeholder="/courses/premium"
                        className="rounded-xl h-11" 
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="font-bold">URL de la Imagen (Opcional)</Label>
                    <Input 
                      value={imageUrl} 
                      onChange={(e) => setImageUrl(e.target.value)} 
                      placeholder="https://example.com/banner.png"
                      className="rounded-xl h-11" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="font-bold">Válido hasta (Opcional)</Label>
                      <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          type="date" 
                          value={expiresAt} 
                          onChange={(e) => setExpiresAt(e.target.value)} 
                          className="rounded-xl h-11 pl-10" 
                        />
                      </div>
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl w-full h-11 border">
                        <Checkbox 
                          id="ann-active" 
                          checked={isActive} 
                          onCheckedChange={(checked) => setIsActive(!!checked)}
                        />
                        <Label htmlFor="ann-active" className="text-xs font-bold cursor-pointer">Anuncio Activo</Label>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 p-4 border rounded-2xl bg-slate-50/50">
                    <Label className="font-bold border-b pb-2 flex items-center gap-2">
                      <Layout className="h-4 w-4 text-primary" />
                      Aparecer en Páginas:
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {PAGES_OPTIONS.map(page => (
                        <div key={page.id} className="flex items-center gap-2">
                          <Checkbox 
                            id={`page-${page.id}`} 
                            checked={targetPages.includes(page.id)}
                            onCheckedChange={() => togglePage(page.id)}
                          />
                          <Label htmlFor={`page-${page.id}`} className="text-sm font-medium cursor-pointer">{page.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 p-4 border rounded-2xl bg-slate-50/50">
                    <Label className="font-bold border-b pb-2 flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-primary" />
                      Dirigido a Roles:
                    </Label>
                    <div className="flex flex-wrap gap-6">
                      {ROLES_OPTIONS.map(role => (
                        <div key={role.id} className="flex items-center gap-2">
                          <Checkbox 
                            id={`role-${role.id}`} 
                            checked={targetRoles.includes(role.id)}
                            onCheckedChange={() => toggleRole(role.id)}
                          />
                          <Label htmlFor={`role-${role.id}`} className="text-sm font-medium cursor-pointer">{role.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
                
                <DialogFooter>
                  <Button type="submit" className="w-full rounded-2xl h-14 text-lg font-bold shadow-lg shadow-primary/20">
                    {editingId ? 'Actualizar Anuncio' : 'Publicar Anuncio'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Sincronizando anuncios...</p>
            </div>
          ) : announcements && announcements.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 border-none">
                    <TableHead className="pl-8 h-14 w-[300px]">Anuncio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Audiencia</TableHead>
                    <TableHead>Expiración</TableHead>
                    <TableHead className="text-right pr-8">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((ann) => {
                    const isExpired = ann.expiresAt && ann.expiresAt.toDate() < new Date();
                    const isInactive = !ann.isActive || isExpired;

                    return (
                      <TableRow key={ann.id} className={`border-slate-100 hover:bg-slate-50/50 transition-colors ${isInactive ? 'opacity-60' : ''}`}>
                        <TableCell className="pl-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${isInactive ? 'bg-slate-100' : 'bg-primary/10'}`}>
                              {ann.imageUrl ? (
                                <img src={ann.imageUrl} className="h-full w-full object-cover rounded-xl" />
                              ) : (
                                <Megaphone className={`h-6 w-6 ${isInactive ? 'text-slate-400' : 'text-primary'}`} />
                              )}
                            </div>
                            <div className="max-w-[200px]">
                              <p className="font-bold text-slate-900 truncate">{ann.title}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{ann.description}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {ann.isActive ? (
                            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-lg gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 rounded-lg gap-1">
                              <XCircle className="h-3 w-3" />
                              Inactivo
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-slate-400" />
                              <span className="text-[10px] font-medium text-slate-600">
                                {ann.targetRoles?.join(', ') || 'Todos'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Layout className="h-3 w-3 text-slate-400" />
                              <span className="text-[10px] text-slate-500">
                                {ann.targetPages?.length} ubicaciones
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {ann.expiresAt ? (
                            <div className={`flex items-center gap-1.5 text-xs font-medium ${isExpired ? 'text-rose-600' : 'text-slate-600'}`}>
                              <Clock className="h-3 w-3" />
                              {ann.expiresAt.toDate().toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Siempre activo</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white hover:shadow-md" onClick={() => handleEditClick(ann)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleDelete(ann.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-32 bg-slate-50/50 flex flex-col items-center gap-4">
              <Megaphone className="h-16 w-16 text-muted-foreground opacity-10" />
              <div className="space-y-1">
                <p className="text-xl font-bold text-slate-400 uppercase tracking-widest">No hay anuncios</p>
                <p className="text-muted-foreground text-sm italic">Crea tu primer popup para promociones o avisos importantes.</p>
              </div>
              <Button variant="outline" className="mt-4 rounded-xl px-10 border-dashed" onClick={() => setIsDialogOpen(true)}>
                Comenzar ahora
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
