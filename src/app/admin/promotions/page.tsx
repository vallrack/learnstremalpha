
'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { 
  Tag, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Trophy,
  Ticket,
  ChevronRight,
  AlertCircle
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
import { Card, CardContent } from '@/components/ui/card';

export default function AdminPromotionsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  const isAdmin = profile?.role === 'admin';

  // Form State
  const [code, setCode] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('10');
  const [expiresAt, setExpiresAt] = useState('');
  const [usageLimit, setUsageLimit] = useState('100');
  const [isActive, setIsActive] = useState(true);

  const promosQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'promotions'), orderBy('createdAt', 'desc'));
  }, [db]);
  const { data: promotions, isLoading } = useCollection(promosQuery);

  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setDiscountPercentage('10');
    setExpiresAt('');
    setUsageLimit('100');
    setIsActive(true);
  };

  const handleEditClick = (promo: any) => {
    setEditingId(promo.id);
    setCode(promo.code || '');
    setDiscountPercentage(promo.discountPercentage?.toString() || '10');
    setUsageLimit(promo.usageLimit?.toString() || '100');
    setIsActive(promo.isActive ?? true);
    
    if (promo.expiresAt) {
      const date = promo.expiresAt instanceof Timestamp ? promo.expiresAt.toDate() : new Date(promo.expiresAt);
      setExpiresAt(date.toISOString().split('T')[0]);
    } else {
      setExpiresAt('');
    }
    
    setIsDialogOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user || !isAdmin) return;

    const promoData: any = {
      code: code.toUpperCase().trim(),
      discountPercentage: parseInt(discountPercentage),
      usageLimit: parseInt(usageLimit),
      isActive,
      updatedAt: serverTimestamp(),
    };

    if (expiresAt) {
      promoData.expiresAt = Timestamp.fromDate(new Date(expiresAt));
    } else {
      promoData.expiresAt = null;
    }

    if (editingId) {
      updateDocumentNonBlocking(doc(db, 'promotions', editingId), promoData);
    } else {
      promoData.createdAt = serverTimestamp();
      promoData.timesUsed = 0;
      addDocumentNonBlocking(collection(db, 'promotions'), promoData);
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (!db || !isAdmin) return;
    if (confirm('¿Eliminar esta promoción?')) {
      deleteDocumentNonBlocking(doc(db, 'promotions', id));
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-4xl font-headline font-bold mb-2 flex items-center gap-3">
              <Ticket className="h-8 w-8 text-primary" />
              Gestión de Cupones
            </h1>
            <p className="text-muted-foreground">Crea códigos de descuento con límites de tiempo y uso.</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="rounded-xl h-11 gap-2 shadow-lg shadow-primary/10">
                <Plus className="h-4 w-4" />
                Nueva Promoción
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem]">
              <form onSubmit={handleFormSubmit}>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-headline">{editingId ? 'Editar Cupón' : 'Crear Cupón'}</DialogTitle>
                  <DialogDescription>
                    Define el código y las restricciones comerciales del descuento.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-8">
                  <div className="grid gap-2">
                    <Label className="font-bold">Código del Cupón</Label>
                    <Input 
                      value={code} 
                      onChange={(e) => setCode(e.target.value.toUpperCase())} 
                      required 
                      placeholder="Ej: LANZAMIENTO50" 
                      className="rounded-xl h-12 text-center font-mono font-bold text-xl tracking-widest" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="font-bold">Descuento (%)</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        max="100" 
                        value={discountPercentage} 
                        onChange={(e) => setDiscountPercentage(e.target.value)} 
                        required 
                        className="rounded-xl h-11" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="font-bold">Límite de Usos</Label>
                      <Input 
                        type="number" 
                        value={usageLimit} 
                        onChange={(e) => setUsageLimit(e.target.value)} 
                        required 
                        className="rounded-xl h-11" 
                      />
                    </div>
                  </div>

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

                  <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-xl">
                    <input 
                      type="checkbox" 
                      id="p-active" 
                      checked={isActive} 
                      onChange={(e) => setIsActive(e.target.checked)} 
                      className="h-4 w-4 rounded border-gray-300 text-primary" 
                    />
                    <Label htmlFor="p-active" className="text-xs font-bold">Cupón Habilitado</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full rounded-2xl h-14 text-lg font-bold">
                    {editingId ? 'Actualizar Cupón' : 'Publicar Descuento'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-x-auto">
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Cargando base de promociones...</p>
            </div>
          ) : promotions && promotions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-none">
                  <TableHead className="pl-8 h-14">Código</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Estado de Uso</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-right pr-8">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo) => {
                  const isExpired = promo.expiresAt && promo.expiresAt.toDate() < new Date();
                  const isLimitReached = promo.usageLimit > 0 && (promo.timesUsed || 0) >= promo.usageLimit;
                  const isInactive = !promo.isActive || isExpired || isLimitReached;

                  return (
                    <TableRow key={promo.id} className={`border-slate-100 ${isInactive ? 'opacity-60 grayscale' : ''}`}>
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isInactive ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary'}`}>
                            <Tag className="h-4 w-4" />
                          </div>
                          <span className="font-mono font-bold text-lg tracking-tight">{promo.code}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500 text-white border-none rounded-lg text-xs font-bold">
                          -{promo.discountPercentage}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-600">
                            {promo.timesUsed || 0} / {promo.usageLimit} canjes
                          </p>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${((promo.timesUsed || 0) / promo.usageLimit) * 100}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {promo.expiresAt ? (
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${isExpired ? 'text-rose-600' : 'text-slate-600'}`}>
                            <Clock className="h-3 w-3" />
                            {promo.expiresAt.toDate().toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Sin vencimiento</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => handleEditClick(promo)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => handleDelete(promo.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-20 bg-slate-50/50 flex flex-col items-center gap-4">
              <Ticket className="h-12 w-12 text-muted-foreground opacity-20" />
              <p className="text-muted-foreground font-medium italic">No hay campañas de descuento activas.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
