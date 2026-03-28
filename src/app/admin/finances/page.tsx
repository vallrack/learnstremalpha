'use client';

import { useState, useMemo, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useUser, useDoc, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, where, orderBy, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, WalletCards, Building2, User, Landmark, ShieldAlert, ArrowRightCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WaitingHall } from '@/components/instructor/WaitingHall';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function FinancesPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [bankType, setBankType] = useState('nequi');
  const [bankNumber, setBankNumber] = useState('');
  const [bankName, setBankName] = useState('');

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

  const transactionsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid || !profile?.role) return null;
    if (profile.role === 'admin') {
      return query(collection(db, 'transactions'), orderBy('createdAt', 'desc'));
    } else {
      return query(collection(db, 'transactions'), where('instructorId', '==', user.uid), orderBy('createdAt', 'desc'));
    }
  }, [db, user?.uid, profile?.role]);
  
  const { data: transactions, isLoading: isTransactionsLoading } = useCollection(transactionsQuery);

  const bankRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid, 'settings', 'bank');
  }, [db, user?.uid]);
  const { data: bankData, isLoading: isBankLoading } = useDoc(bankRef);

  // Parse bank configuration when initialized
  useEffect(() => {
    if (bankData?.bankType) setBankType(bankData.bankType);
    if (bankData?.bankNumber) setBankNumber(bankData.bankNumber);
    if (bankData?.bankName) setBankName(bankData.bankName);
  }, [bankData]);

  if (isUserLoading || isProfileLoading || isTransactionsLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!user || (profile?.role !== 'admin' && profile?.role !== 'instructor')) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert className="h-10 w-10 text-rose-600" />
            </div>
            <h1 className="text-2xl font-bold">Acceso Restringido</h1>
            <p className="text-muted-foreground">No tienes permisos para acceder a este módulo financiero.</p>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = profile.role === 'admin';

  const calculateMetrics = () => {
    let totalSales = 0;
    let instructorRevenue = 0;
    let adminRevenue = 0;
    let courseCount = 0;

    transactions?.forEach((t: any) => {
      totalSales += Number(t.amount || 0);
      instructorRevenue += Number(t.instructorShare || 0);
      adminRevenue += Number(t.adminShare || 0);
      courseCount += 1;
    });

    return { totalSales, instructorRevenue, adminRevenue, courseCount };
  };

  const metrics = calculateMetrics();

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user?.uid) return;
    
    if (!bankNumber) {
      toast({ variant: "destructive", title: "Error", description: "Ingresa el número de cuenta." });
      return;
    }

    setIsSavingRecord(true);
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'bank'), {
        bankType,
        bankNumber,
        bankName: bankType === 'bank' ? bankName : undefined,
        updatedAt: new Date()
      });
      toast({ title: "Datos Guardados", description: "Tu información bancaria ha sido actualizada exitosamente." });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los datos." });
    } finally {
      setIsSavingRecord(false);
    }
  };

  if (profile?.instructorStatus === 'pending') {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <WaitingHall />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-headline font-bold text-slate-900">{isAdmin ? 'Dashboard Financiero Global' : 'Mis Ingresos'}</h1>
          <p className="text-muted-foreground mt-2">{isAdmin ? 'Monitorea el rendimiento de la plataforma y comisiones.' : 'Gestiona tus ganancias y métodos de pago.'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <div className="h-2 bg-emerald-500 w-full" />
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 shrink-0">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Ventas Brutas Totales</p>
                <h3 className="text-2xl font-bold font-mono">${metrics.totalSales.toLocaleString()}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <div className={`h-2 w-full ${isAdmin ? 'bg-primary' : 'bg-amber-500'}`} />
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`${isAdmin ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-600'} p-4 rounded-full shrink-0`}>
                <WalletCards className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{isAdmin ? 'Ingresos Netos (Plataforma)' : 'Mis Ganancias (Instructor)'}</p>
                <h3 className="text-2xl font-bold font-mono">${(isAdmin ? metrics.adminRevenue : metrics.instructorRevenue).toLocaleString()}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <div className="h-2 bg-indigo-500 w-full" />
            <CardContent className="p-6 flex items-center gap-4">
              <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Transacciones Exitosas</p>
                <h3 className="text-2xl font-bold">{metrics.courseCount}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="font-headline font-bold">Historial de Transacciones</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {transactions && transactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Curso</TableHead>
                          {isAdmin && <TableHead>Instructor</TableHead>}
                          <TableHead className="text-right">Monto Bruto</TableHead>
                          <TableHead className="text-right">Comisión Plataforma</TableHead>
                          <TableHead className="text-right">Ingreso Instructor</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((t: any) => {
                          let date;
                          try {
                            date = t.createdAt?.toDate ? t.createdAt.toDate() : (t.createdAt ? new Date(t.createdAt) : new Date(0));
                          } catch (e) {
                            date = new Date(0);
                          }
                          const dateString = isNaN(date.getTime()) ? 'Fecha inválida' : `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                          
                          return (
                            <TableRow key={t.id}>
                              <TableCell className="font-medium whitespace-nowrap text-xs">{dateString}</TableCell>
                              <TableCell className="max-w-[150px] truncate" title={t.courseTitle}>{t.courseTitle || 'Desconocido'}</TableCell>
                              {isAdmin && <TableCell className="text-xs max-w-[100px] truncate" title={t.instructorId}>{t.instructorId ? `${t.instructorId.slice(0, 8)}...` : 'N/A'}</TableCell>}
                              <TableCell className="text-right font-mono font-medium">${t.amount?.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-mono text-rose-600 text-xs">${t.adminShare?.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-mono text-emerald-600 font-bold">${t.instructorShare?.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Aprobada</Badge>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    <p>No hay transacciones registradas todavía.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {!isAdmin && (
            <div className="space-y-6">
              <Card className="rounded-3xl border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="font-headline font-bold flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-primary" /> Detalles de Pago
                  </CardTitle>
                  <CardDescription>Configura a dónde enviaremos tus ganancias (Ciclo de corte 30/31).</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveBankDetails} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="font-bold">Método de Retiro</Label>
                      <Select value={bankType} onValueChange={setBankType}>
                        <SelectTrigger className="w-full rounded-xl h-11">
                          <SelectValue placeholder="Selecciona..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="nequi">Nequi</SelectItem>
                          <SelectItem value="daviplata">Daviplata</SelectItem>
                          <SelectItem value="bank">Cuenta Bancaria Local (COL)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {bankType === 'bank' && (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label className="font-bold">Banco de Destino</Label>
                        <Input 
                          placeholder="Ej: Bancolombia, Banco de Bogotá" 
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          className="rounded-xl h-11"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="font-bold">{bankType === 'bank' ? 'Número de Cuenta' : 'Número de Celular'}</Label>
                      <Input 
                        type="number" 
                        placeholder={bankType === 'bank' ? "0000000000" : "3000000000"} 
                        value={bankNumber}
                        onChange={(e) => setBankNumber(e.target.value)}
                        className="rounded-xl h-11 font-mono"
                      />
                    </div>

                    <Button type="submit" disabled={isSavingRecord} className="w-full h-12 rounded-xl font-bold gap-2">
                      {isSavingRecord ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {isSavingRecord ? 'Guardando...' : 'Guardar Datos Bancarios'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" /> Información de Pagos
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Las transferencias se ejecutan de manera acumulada los días 5 de cada mes. Para cualquier anomalía en tus métricas, contacta al soporte del administrador.
                </p>
                <Button variant="outline" className="w-full rounded-xl gap-2 font-bold" onClick={() => window.location.href = 'mailto:varrack67@gmail.com'}>
                  Soporte a Instructores <ArrowRightCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
