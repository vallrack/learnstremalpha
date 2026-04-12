'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useUser, useDoc, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, orderBy, setDoc, getDocs, limit, startAfter, getDoc, DocumentSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, DollarSign, WalletCards, Building2, Landmark, ShieldAlert, ArrowRightCircle, CheckCircle2, AlertCircle, Search, TrendingUp, CalendarRange, ChevronLeft, ChevronRight, Smartphone, CreditCard, BanknoteIcon, X, CheckCheck, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WaitingHall } from '@/components/instructor/WaitingHall';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const PAGE_SIZE = 20;

export default function FinancesPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  // --- Bank form state ---
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [bankType, setBankType] = useState('nequi');
  const [bankNumber, setBankNumber] = useState('');
  const [bankName, setBankName] = useState('');

  // --- Filter state ---
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'course' | 'podcast' | 'challenge' | 'premium'>('all');

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(0);

  // --- Bank details modal (admin) ---
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [instructorBankData, setInstructorBankData] = useState<any>(null);
  const [loadingBank, setLoadingBank] = useState(false);

  // --- Instructor names map (admin) ---
  const [instructorNames, setInstructorNames] = useState<Record<string, string>>({});

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
  const { data: bankData } = useDoc(bankRef);

  useEffect(() => {
    if (bankData?.bankType) setBankType(bankData.bankType);
    if (bankData?.bankNumber) setBankNumber(bankData.bankNumber);
    if (bankData?.bankName) setBankName(bankData.bankName);
  }, [bankData]);

  // Load instructor names for admin view
  useEffect(() => {
    if (!db || profile?.role !== 'admin' || !transactions?.length) return;
    const unknownIds = [...new Set(transactions.map((t: any) => t.instructorId).filter((id: any) => id && !instructorNames[id]))];
    if (!unknownIds.length) return;

    Promise.all(
      unknownIds.map(async (id) => {
        try {
          const snap = await getDoc(doc(db, 'users', id));
          return { id, name: snap.data()?.displayName || snap.data()?.email?.split('@')[0] || id.slice(0, 8) };
        } catch {
          return { id, name: id.slice(0, 8) };
        }
      })
    ).then((results) => {
      setInstructorNames(prev => {
        const next = { ...prev };
        results.forEach(r => { next[r.id] = r.name; });
        return next;
      });
    });
  }, [db, profile?.role, transactions]);

  // --- Metrics ---
  const metrics = useMemo(() => {
    let totalSales = 0, instructorRevenue = 0, adminRevenue = 0, courseCount = 0, pending = 0;
    transactions?.forEach((t: any) => {
      totalSales += Number(t.amount || 0);
      instructorRevenue += Number(t.instructorShare || 0);
      adminRevenue += Number(t.adminShare || 0);
      courseCount += 1;
      if (!t.paidOut) pending += Number(t.instructorShare || 0);
    });
    return { totalSales, instructorRevenue, adminRevenue, courseCount, pending };
  }, [transactions]);

  // --- Chart data (last 6 months) ---
  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return { label: format(d, 'MMM', { locale: es }), start: startOfMonth(d), end: endOfMonth(d), amount: 0 };
    });
    transactions?.forEach((t: any) => {
      const date = t.createdAt?.toDate ? t.createdAt.toDate() : t.createdAt ? new Date(t.createdAt) : null;
      if (!date) return;
      months.forEach(m => {
        if (isWithinInterval(date, { start: m.start, end: m.end })) {
          m.amount += Number(t.amount || 0);
        }
      });
    });
    return months.map(m => ({ mes: m.label, ingresos: m.amount }));
  }, [transactions]);

  // --- Filtered transactions ---
  const filtered = useMemo(() => {
    return (transactions || []).filter((t: any) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || (t.courseTitle || '').toLowerCase().includes(q) ||
        (instructorNames[t.instructorId] || '').toLowerCase().includes(q) ||
        (t.type || '').toLowerCase().includes(q) ||
        (t.userEmail || '').toLowerCase().includes(q) ||
        (t.instructorId || '').toLowerCase().includes(q);

      let matchDate = true;
      if (dateFrom || dateTo) {
        const date = t.createdAt?.toDate ? t.createdAt.toDate() : t.createdAt ? new Date(t.createdAt) : null;
        if (date) {
          if (dateFrom && date < new Date(dateFrom)) matchDate = false;
          if (dateTo && date > new Date(dateTo + 'T23:59:59')) matchDate = false;
        }
      }

      const matchStatus = statusFilter === 'all' || (statusFilter === 'paid' ? t.paidOut : !t.paidOut);
      const matchType = typeFilter === 'all' || t.type === typeFilter;
      return matchSearch && matchDate && matchStatus && matchType;
    });
  }, [transactions, searchQuery, dateFrom, dateTo, statusFilter, typeFilter, instructorNames]);

  // --- Pagination ---
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const handleMarkPaid = async (transactionId: string) => {
    if (!db) return;
    updateDocumentNonBlocking(doc(db, 'transactions', transactionId), { paidOut: true, paidAt: new Date() });
    toast({ title: 'Marcado como transferido', description: 'La transacción fue marcada como pagada.' });
  };

  const handleShowBankDetails = async (instructorId: string) => {
    if (!db) return;
    setSelectedInstructorId(instructorId);
    setLoadingBank(true);
    try {
      const snap = await getDoc(doc(db, 'users', instructorId, 'settings', 'bank'));
      setInstructorBankData(snap.exists() ? snap.data() : null);
    } catch {
      setInstructorBankData(null);
    } finally {
      setLoadingBank(false);
    }
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !user?.uid) return;
    if (!bankNumber) {
      toast({ variant: 'destructive', title: 'Error', description: 'Ingresa el número de cuenta.' });
      return;
    }
    setIsSavingRecord(true);
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'bank'), {
        bankType, bankNumber,
        bankName: bankType === 'bank' ? bankName : undefined,
        updatedAt: new Date()
      });
      toast({ title: 'Datos Guardados', description: 'Tu información bancaria fue actualizada.' });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar los datos.' });
    } finally {
      setIsSavingRecord(false);
    }
  };

  // --- Guards ---
  if (isUserLoading || isProfileLoading || isTransactionsLoading) {
    return <div className="min-h-screen bg-background flex flex-col"><Navbar /><main className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main></div>;
  }
  if (!user || (profile?.role !== 'admin' && profile?.role !== 'instructor')) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50"><Navbar />
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-4">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldAlert className="h-10 w-10 text-rose-600" /></div>
            <h1 className="text-2xl font-bold">Acceso Restringido</h1>
            <p className="text-muted-foreground">No tienes permisos para acceder a este módulo financiero.</p>
          </div>
        </div>
      </div>
    );
  }
  if (profile?.instructorStatus === 'pending') {
    return <div className="min-h-screen bg-[#F8FAFC]"><Navbar /><WaitingHall /></div>;
  }

  const isAdmin = profile.role === 'admin';

  const bankMethodLabel: Record<string, string> = { nequi: 'Nequi', daviplata: 'Daviplata', bank: 'Cuenta Bancaria' };
  const bankMethodIcon: Record<string, React.ReactNode> = {
    nequi: <Smartphone className="h-4 w-4 text-violet-600" />,
    daviplata: <Smartphone className="h-4 w-4 text-red-600" />,
    bank: <BanknoteIcon className="h-4 w-4 text-blue-600" />,
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">

        {/* Global Finance Header */}
        <div>
          <h1 className="text-3xl font-headline font-bold text-slate-900">{isAdmin ? 'Dashboard Financiero Global' : 'Mis Ingresos'}</h1>
          <p className="text-muted-foreground mt-1">{isAdmin ? 'Monitorea el rendimiento de la plataforma y comisiones de instructores.' : 'Gestiona tus ganancias y método de retiro.'}</p>
        </div>

        {/* ePayco Validation Banner (Admin only) */}
        {isAdmin && (!profile?.epaycoMerchantId || Object.values(profile?.epaycoDocsStatus || {}).some(v => !v)) && (
          <div className="bg-indigo-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-200 animate-in fade-in slide-in-from-top-4 duration-700 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-32 h-32" />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-md">
                <AlertTriangle className="w-8 h-8 text-amber-300" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-bold">Validación de Cuenta ePayco</h2>
                <p className="text-indigo-100 text-sm mt-1">Recuerda completar la validación documental al 100% para poder retirar tus fondos.</p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">
                  {!profile?.epaycoMerchantId && <Badge className="bg-rose-500 text-white border-none">Falta Merchant ID</Badge>}
                  {['rut', 'bank', 'id', 'camara'].map(docId => (
                    !profile?.epaycoDocsStatus?.[docId] && (
                      <Badge key={docId} variant="outline" className="border-indigo-400 text-indigo-100 uppercase text-[10px]">
                        Pediente: {docId === 'bank' ? 'Banco' : docId === 'camara' ? 'Cámara' : docId}
                      </Badge>
                    )
                  ))}
                </div>
              </div>
              <Button 
                variant="secondary" 
                className="rounded-xl font-bold px-8 h-12 shadow-lg hover:shadow-indigo-500/50"
                onClick={() => window.location.href = '/admin/academy'}
              >
                Configurar Pasarela
              </Button>
            </div>
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <div className="h-1.5 bg-emerald-500 w-full" />
            <CardContent className="p-5 flex items-center gap-3">
              <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 shrink-0"><DollarSign className="h-5 w-5" /></div>
              <div><p className="text-xs font-semibold text-muted-foreground">Ventas Brutas</p><h3 className="text-xl font-bold font-mono">${metrics.totalSales.toLocaleString()}</h3></div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <div className={`h-1.5 w-full ${isAdmin ? 'bg-primary' : 'bg-amber-500'}`} />
            <CardContent className="p-5 flex items-center gap-3">
              <div className={`${isAdmin ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-600'} p-3 rounded-2xl shrink-0`}><WalletCards className="h-5 w-5" /></div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{isAdmin ? 'Ingreso Plataforma' : 'Mis Ganancias'}</p>
                <h3 className="text-xl font-bold font-mono">${(isAdmin ? metrics.adminRevenue : metrics.instructorRevenue).toLocaleString()}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <div className="h-1.5 bg-indigo-500 w-full" />
            <CardContent className="p-5 flex items-center gap-3">
              <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600 shrink-0"><Building2 className="h-5 w-5" /></div>
              <div><p className="text-xs font-semibold text-muted-foreground">Transacciones</p><h3 className="text-xl font-bold">{metrics.courseCount}</h3></div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden">
            <div className="h-1.5 bg-rose-500 w-full" />
            <CardContent className="p-5 flex items-center gap-3">
              <div className="bg-rose-100 p-3 rounded-2xl text-rose-600 shrink-0"><AlertCircle className="h-5 w-5" /></div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground">{isAdmin ? 'Pendiente por Pagar' : 'Por Recibir'}</p>
                <h3 className="text-xl font-bold font-mono text-rose-600">${metrics.pending.toLocaleString()}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="font-headline font-bold flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-primary" />Ingresos Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <ReTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', fontSize: '13px' }}
                  formatter={(val: any) => [`$${Number(val).toLocaleString()} COP`, 'Ingresos']}
                />
                <Area type="monotone" dataKey="ingresos" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorIngresos)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Transaction table */}
          <div className="lg:col-span-2 space-y-4">

            {/* Filters */}
            <Card className="rounded-3xl border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar por curso o instructor..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(0); }} className="pl-9 rounded-xl h-10" />
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <CalendarRange className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setCurrentPage(0); }} className="pl-8 rounded-xl h-10 text-xs w-36" />
                    </div>
                    <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setCurrentPage(0); }} className="rounded-xl h-10 text-xs w-36" />
                    <Select value={typeFilter} onValueChange={(v: any) => { setTypeFilter(v); setCurrentPage(0); }}>
                      <SelectTrigger className="rounded-xl h-10 w-32"><SelectValue placeholder="Tipo" /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="all">Todos Tipos</SelectItem>
                        <SelectItem value="course">Cursos</SelectItem>
                        <SelectItem value="podcast">Podcasts</SelectItem>
                        <SelectItem value="challenge">Retos</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                    {(searchQuery || dateFrom || dateTo || statusFilter !== 'all' || typeFilter !== 'all') && (
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); setStatusFilter('all'); setTypeFilter('all'); setCurrentPage(0); }}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="rounded-3xl border-none shadow-sm">
              <CardHeader className="border-b py-4">
                <CardTitle className="font-headline font-bold text-base flex items-center justify-between">
                  Historial de Transacciones
                  <span className="text-xs font-normal text-muted-foreground">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {paginated.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow>
                          <TableHead className="pl-4">Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Concepto</TableHead>
                          {isAdmin && <TableHead>Instructor</TableHead>}
                          <TableHead className="text-right">Bruto</TableHead>
                          <TableHead className="text-right">Plataforma</TableHead>
                          <TableHead className="text-right">Instructor</TableHead>
                          <TableHead>IDs Comercio</TableHead>
                          <TableHead>Estado</TableHead>
                          {isAdmin && <TableHead></TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map((t: any) => {
                          let date: Date;
                          try {
                            date = t.createdAt?.toDate ? t.createdAt.toDate() : t.createdAt ? new Date(t.createdAt) : new Date(0);
                          } catch { date = new Date(0); }
                          const dateStr = isNaN(date.getTime()) ? '—' : format(date, 'dd/MM/yy HH:mm');
                          const instructorName = instructorNames[t.instructorId] || (t.instructorId ? t.instructorId.slice(0, 8) + '…' : 'N/A');

                          return (
                            <TableRow key={t.id} className="border-slate-100 hover:bg-slate-50/50">
                              <TableCell className="font-medium text-[10px] whitespace-nowrap pl-4 text-muted-foreground">{dateStr}</TableCell>
                              <TableCell>
                                {t.type === 'podcast' ? (
                                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 border text-[10px] rounded-lg">Podcast</Badge>
                                ) : t.type === 'challenge' ? (
                                  <Badge className="bg-purple-50 text-purple-700 border-purple-200 border text-[10px] rounded-lg">Reto</Badge>
                                ) : t.type === 'premium' ? (
                                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 border text-[10px] rounded-lg">Premium</Badge>
                                ) : (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border text-[10px] rounded-lg">Curso</Badge>
                                )}
                              </TableCell>
                              <TableCell className="max-w-[130px] truncate text-sm font-medium" title={t.courseTitle}>{t.courseTitle || 'Desconocido'}</TableCell>
                              {isAdmin && (
                                <TableCell>
                                  <button onClick={() => handleShowBankDetails(t.instructorId)} className="text-xs text-primary font-semibold hover:underline truncate max-w-[100px] block text-left">
                                    {instructorName}
                                  </button>
                                </TableCell>
                              )}
                              <TableCell className="text-right font-mono text-sm font-medium">${t.amount?.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-mono text-xs text-rose-600">-${t.adminShare?.toLocaleString()}</TableCell>
                              <TableCell className="text-right font-mono text-sm text-emerald-600 font-bold">${t.instructorShare?.toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-[8px] h-3 px-1 border-slate-200 text-slate-400">Plat: {t.academyMerchantId || 'Default'}</Badge>
                                  </div>
                                  {t.instructorMerchantId && (
                                    <div className="flex items-center gap-1">
                                      <Badge variant="outline" className="text-[8px] h-3 px-1 border-indigo-200 text-indigo-500">Inst: {t.instructorMerchantId}</Badge>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {t.paidOut
                                  ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border text-[10px] rounded-lg gap-1"><CheckCheck className="h-3 w-3" />Transferido</Badge>
                                  : <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] rounded-lg">Pendiente</Badge>
                                }
                              </TableCell>
                              {isAdmin && (
                                <TableCell>
                                  {!t.paidOut && (
                                    <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] rounded-lg hover:bg-emerald-50 hover:text-emerald-700 font-bold" onClick={() => handleMarkPaid(t.id)}>
                                      Marcar pagado
                                    </Button>
                                  )}
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Sin transacciones que coincidan</p>
                    <p className="text-xs mt-1">Intenta ajustar los filtros de búsqueda</p>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Página {currentPage + 1} de {totalPages} · {filtered.length} total
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 rounded-xl gap-1" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>
                        <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 rounded-xl gap-1" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>
                        Siguiente <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: bank details (instructor) or info (admin) */}
          <div className="space-y-6">
            {!isAdmin ? (
              <>
                <Card className="rounded-3xl border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-headline font-bold flex items-center gap-2">
                      <Landmark className="h-5 w-5 text-primary" /> Método de Retiro
                    </CardTitle>
                    <CardDescription>Tus ganancias se transfieren el día 5 de cada mes.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveBankDetails} className="space-y-5">
                      <div className="space-y-2">
                        <Label className="font-bold">Canal de Pago</Label>
                        <Select value={bankType} onValueChange={setBankType}>
                          <SelectTrigger className="w-full rounded-xl h-11"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="nequi">Nequi</SelectItem>
                            <SelectItem value="daviplata">Daviplata</SelectItem>
                            <SelectItem value="bank">Cuenta Bancaria (COL)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {bankType === 'bank' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <Label className="font-bold">Banco de Destino</Label>
                          <Input placeholder="Ej: Bancolombia" value={bankName} onChange={e => setBankName(e.target.value)} className="rounded-xl h-11" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label className="font-bold">{bankType === 'bank' ? 'Número de Cuenta' : 'Número de Celular'}</Label>
                        <Input type="number" placeholder={bankType === 'bank' ? '0000000000' : '3000000000'} value={bankNumber} onChange={e => setBankNumber(e.target.value)} className="rounded-xl h-11 font-mono" />
                      </div>
                      <Button type="submit" disabled={isSavingRecord} className="w-full h-12 rounded-xl font-bold gap-2">
                        {isSavingRecord ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        {isSavingRecord ? 'Guardando...' : 'Guardar Datos Bancarios'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-primary" /> Política de Pagos</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">Las transferencias se ejecutan acumuladas el día 5 de cada mes. Para anomalías en tus métricas, contacta soporte.</p>
                  <Button variant="outline" className="w-full rounded-xl gap-2 font-bold" onClick={() => window.location.href = 'mailto:varrack67@gmail.com'}>
                    Soporte a Instructores <ArrowRightCircle className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <Card className="rounded-3xl border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="font-headline font-bold flex items-center gap-2 text-base">
                    <CreditCard className="h-5 w-5 text-primary" /> Información de Retiro
                  </CardTitle>
                  <CardDescription>Haz click en el nombre de un instructor para ver su cuenta de destino.</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 text-center text-sm text-muted-foreground">
                    <Landmark className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    Selecciona un instructor de la tabla
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Instructor Bank Details Modal (Admin) */}
      <Dialog open={!!selectedInstructorId} onOpenChange={(open) => { if (!open) { setSelectedInstructorId(null); setInstructorBankData(null); } }}>
        <DialogContent className="sm:max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline font-bold flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              Datos de Pago — {instructorNames[selectedInstructorId || ''] || 'Instructor'}
            </DialogTitle>
          </DialogHeader>
          {loadingBank ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : instructorBankData ? (
            <div className="space-y-4 py-2">
              <div className="bg-slate-50 rounded-2xl p-4 border flex items-center gap-3">
                {bankMethodIcon[instructorBankData.bankType] || <CreditCard className="h-4 w-4" />}
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Canal</p>
                  <p className="font-bold">{bankMethodLabel[instructorBankData.bankType] || instructorBankData.bankType}</p>
                </div>
              </div>
              {instructorBankData.bankName && (
                <div className="bg-slate-50 rounded-2xl p-4 border">
                  <p className="text-xs text-muted-foreground font-medium">Banco</p>
                  <p className="font-bold">{instructorBankData.bankName}</p>
                </div>
              )}
              <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                <p className="text-xs text-muted-foreground font-medium">{instructorBankData.bankType === 'bank' ? 'Número de Cuenta' : 'Número de Celular'}</p>
                <p className="font-bold font-mono text-lg tracking-wider">{instructorBankData.bankNumber}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Este instructor aún no ha configurado su método de retiro.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
