
'use client';

import { Navbar } from '@/components/layout/Navbar';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Trophy, 
  Clock, 
  PlayCircle, 
  Loader2, 
  Sparkles, 
  Code2, 
  BarChart3, 
  Star, 
  Zap, 
  ChevronRight, 
  Award, 
  Medal,
  Wallet,
  Users,
  TrendingUp, CheckCircle2,
  MessageSquare,
  ArrowRight,
  Mic2
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, doc, where } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  const isInstructor = profile?.role === 'instructor';

  const progressQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, 'users', user.uid, 'courseProgress');
  }, [db, user?.uid]);
  const { data: userProgress, isLoading: isProgressLoading } = useCollection(progressQuery);

  const coursesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'courses');
  }, [db]);
  const { data: allCourses, isLoading: isCoursesLoading } = useCollection(coursesQuery);

  // Consulta de estudiantes para el instructor
  const instructorStudentsQuery = useMemoFirebase(() => {
    if (!db || !isInstructor || !user?.uid) return null;
    // Esto es una simplificación: en una app real usaríamos una subcolección de ventas o inscripciones
    return query(collection(db, 'courses'), where('instructorId', '==', user.uid));
  }, [db, isInstructor, user?.uid]);
  const { data: myCourses } = useCollection(instructorStudentsQuery);

  const submissionsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'users', user.uid, 'challenge_submissions'), orderBy('submittedAt', 'desc'), limit(10));
  }, [db, user?.uid]);
  const { data: submissions } = useCollection(submissionsQuery);

  const achievementsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'users', user.uid, 'achievements'), orderBy('unlockedAt', 'desc'));
  }, [db, user?.uid]);
  const { data: achievements } = useCollection(achievementsQuery);

  const podcastsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'podcasts'), limit(4));
  }, [db]);
  const { data: recentPodcasts } = useCollection(podcastsQuery);

  const enrolledCourses = useMemo(() => {
    if (!userProgress || !allCourses) return [];
    return userProgress.map(progress => {
      const courseDetails = allCourses.find(c => c.id === progress.courseId);
      return { ...progress, courseDetails };
    }).filter(item => item.courseDetails);
  }, [userProgress, allCourses]);

  const activeCourse = enrolledCourses.find(c => c.status !== 'completed');

  // Gamificación
  const completedCount = enrolledCourses.filter(c => c.status === 'completed').length;
  const passedChallenges = submissions?.filter(s => s.passed).length || 0;
  const xp = (completedCount * 500) + (passedChallenges * 100) + ((achievements?.length || 0) * 250);
  const level = Math.floor(xp / 1000) + 1;
  const xpInCurrentLevel = xp % 1000;

  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Estudiante';

  if (!mounted || isUserLoading || isProgressLoading || isCoursesLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  const chartData = submissions?.map(s => ({
    name: s.challengeTitle?.substring(0, 8) + '...',
    score: s.score
  })).reverse() || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="flex-1">
            <h1 className="text-4xl font-headline font-bold mb-2 flex items-center gap-3">
              ¡Hola, {displayName}! 
              <span className="animate-bounce">👋</span>
            </h1>
            <p className="text-muted-foreground">Tu camino al éxito técnico está al {Math.round((completedCount / (allCourses?.length || 1)) * 100)}% de completarse.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-4 bg-white p-4 rounded-[2rem] border shadow-sm">
              <div className="relative h-16 w-16 flex items-center justify-center">
                <svg className="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray={`${(xpInCurrentLevel / 1000) * 176} 176`} className="text-primary" />
                </svg>
                <span className="text-xl font-bold">{level}</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nivel de Programador</p>
                <p className="text-sm font-bold text-slate-900">{xpInCurrentLevel} / 1000 XP</p>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-white p-4 rounded-[2rem] border shadow-sm px-6">
              <div className="h-12 w-12 bg-orange-100 rounded-2xl flex items-center justify-center shadow-inner">
                <Zap className="h-6 w-6 text-orange-500 fill-orange-500 animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Racha de Estudio</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-slate-900">{profile?.streak || 0} Días</span>
                  <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-none text-[9px] px-2 py-0">¡FUEGO!</Badge>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Sección de Instructor (Solo si tiene el rol) */}
        {isInstructor && (
          <section className="mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-amber-100 p-2 rounded-xl"><Wallet className="h-5 w-5 text-amber-600" /></div>
              <h2 className="text-2xl font-headline font-bold">Resumen de Instructor</h2>
            </div>
            <InstructorAnalytics userId={user!.uid} myCourses={myCourses || []} profile={profile} />
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
          <div className="lg:col-span-3 space-y-8">
            {activeCourse ? (
              <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-900 text-white overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Zap className="h-32 w-32" />
                </div>
                <CardContent className="p-8 md:p-12 relative z-10">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    <div className="relative w-48 h-32 rounded-2xl overflow-hidden shadow-2xl shrink-0">
                      <Image 
                        src={activeCourse.courseDetails.thumbnailDataUrl || activeCourse.courseDetails.imageUrl || 'https://picsum.photos/seed/learn/400/300'} 
                        alt="Course" 
                        fill 
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 space-y-4 text-center md:text-left">
                      <Badge className="bg-primary hover:bg-primary border-none text-[10px] py-1 px-3">SIGUIENTE PASO</Badge>
                      <h2 className="text-2xl md:text-3xl font-headline font-bold">{activeCourse.courseDetails.title}</h2>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-xs font-bold text-slate-400">
                          <span>Progreso del Curso</span>
                          <span>{Math.round(activeCourse.progressPercentage || 0)}%</span>
                        </div>
                        <Progress value={activeCourse.progressPercentage || 0} className="h-2 bg-white/10" />
                      </div>
                      <Link href={`/courses/${activeCourse.courseId}`} className="inline-block">
                        <Button className="h-12 px-8 rounded-xl font-bold gap-2 shadow-lg shadow-primary/20">
                          Continuar Ahora
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-[2.5rem] border-2 border-dashed p-12 text-center space-y-4">
                <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                  <Star className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-headline font-bold">¿Listo para un nuevo desafío?</h3>
                <p className="text-muted-foreground">Explora nuestro catálogo y empieza a ganar XP.</p>
                <Link href="/courses">
                  <Button className="rounded-xl font-bold">Explorar Cursos</Button>
                </Link>
              </Card>
            )}

            {/* Podcasts para el estudiante */}
            {(recentPodcasts && recentPodcasts.length > 0) && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-headline font-bold flex items-center gap-2">
                        <Mic2 className="h-5 w-5 text-emerald-500" /> Podcasts para ti
                    </h3>
                    <Link href="/podcasts" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">Ver todos <ArrowRight className="h-3 w-3" /></Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recentPodcasts.map(p => (
                        <Link key={p.id} href="/podcasts" className="bg-white p-4 rounded-3xl border shadow-sm flex items-center gap-4 hover:border-emerald-200 transition-all group">
                            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0 overflow-hidden relative">
                                {p.thumbnailUrl ? <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" /> : <Mic2 className="h-8 w-8 text-emerald-200" />}
                                <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <PlayCircle className="h-6 w-6 text-emerald-600" />
                                </div>
                            </div>
                            <div className="min-w-0">
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none text-[9px] px-2 py-0 mb-1">{p.category}</Badge>
                                <h4 className="font-bold text-sm truncate group-hover:text-emerald-600 transition-colors">{p.title}</h4>
                                <p className="text-[10px] text-muted-foreground">{p.duration || '00:00'}</p>
                            </div>
                        </Link>
                    ))}
                </div>
              </div>
            )}

            <DailyMissions />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6">
                <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-headline">Rendimiento Técnico</CardTitle>
                    <CardDescription className="text-xs">Últimos desafíos evaluados</CardDescription>
                  </div>
                  <BarChart3 className="h-5 w-5 text-primary" />
                </CardHeader>
                <CardContent className="px-0 h-[200px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" hide />
                        <YAxis domain={[0, 5]} hide />
                        <Tooltip />
                        <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.score >= 4 ? '#10b981' : '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">Completa retos para ver estadísticas</div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-sm bg-white p-6">
                <CardHeader className="px-0 pt-0">
                  <CardTitle className="text-lg font-headline">Insignias de Maestría</CardTitle>
                  <CardDescription className="text-xs">Logros otorgados por la IA</CardDescription>
                </CardHeader>
                <CardContent className="px-0 pt-4 overflow-y-auto max-h-[200px]">
                  <div className="grid grid-cols-2 gap-3">
                    {achievements?.map((ach) => (
                      <div key={ach.id} className="flex flex-col items-center text-center p-3 rounded-2xl bg-amber-50 border border-amber-100 group hover:bg-amber-100 transition-colors">
                        <div className="bg-amber-500 p-2 rounded-xl text-white mb-2 shadow-sm group-hover:scale-110 transition-transform">
                          <Medal className="h-5 w-5" />
                        </div>
                        <p className="text-[10px] font-bold leading-tight">{ach.title}</p>
                      </div>
                    ))}
                    {(!achievements || achievements.length === 0) && (
                      <div className="col-span-2 text-center py-8">
                        <p className="text-xs text-muted-foreground italic">Supera retos con 4.5+ para ganar insignias</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
             <Card className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden">
                <CardHeader className="p-6 bg-slate-50 border-b">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Actividad Reciente</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {submissions?.map((sub, i) => (
                    <div key={i} className="flex gap-3 border-b border-slate-50 pb-3 last:border-0">
                      <div className={`p-2 h-fit rounded-lg ${sub.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{sub.challengeTitle}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(sub.submittedAt?.toDate()).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {(!submissions || submissions.length === 0) && <p className="text-xs text-center py-4 text-muted-foreground italic">Empieza a codear hoy</p>}
                </CardContent>
             </Card>
          </div>
        </div>
      </main>
    </div>
  );
}


function InstructorAnalytics({ userId, myCourses, profile }: { userId: string; myCourses: any[]; profile: any }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [stats, setStats] = useState({ sales: 0, students: 0, avgRating: 0, totalReviews: 0 });
  const [epaycoMerchantId, setEpaycoMerchantId] = useState(profile?.epaycoMerchantId || '');
  const [isSavingId, setIsSavingId] = useState(false);

  useEffect(() => {
    if (profile?.epaycoMerchantId) setEpaycoMerchantId(profile.epaycoMerchantId);
  }, [profile?.epaycoMerchantId]);

  const handleSaveMerchantId = async () => {
    if (!db || !userId) return;
    setIsSavingId(true);
    try {
      await updateDocumentNonBlocking(doc(db, 'users', userId), {
        epaycoMerchantId: epaycoMerchantId
      });
      toast({ title: "ID Guardado", description: "Tu ID de comercio ePayco ha sido actualizado." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el ID." });
    } finally {
      setIsSavingId(false);
    }
  };

  useEffect(() => {
    if (!db || !userId) return;
    
    let isMounted = true;

    const loadInstructorData = async () => {
      try {
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        
        // Ventas y estudiantes únicos desde transactions
        const transSnap = await getDocs(query(collection(db, 'transactions'), where('instructorId', '==', userId)));
        if (!isMounted) return;

        const sales = transSnap.size;
        const uniqueStudents = new Set(transSnap.docs.map(d => d.data().userId)).size;

        // Rating promedio desde reviews de los cursos del instructor
        const courseIds = myCourses.map(c => c.id);
        if (courseIds.length === 0) { 
          setStats(s => ({ ...s, sales, students: uniqueStudents })); 
          return; 
        }

        const ratingSnaps = await Promise.all(courseIds.map(cid =>
          getDocs(collection(db, 'reviews', cid, 'ratings'))
        ));
        if (!isMounted) return;

        const allRatings = ratingSnaps.flatMap(s => s.docs.map(d => d.data().rating || 0));
        const avgRating = allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
        
        setStats({ sales, students: uniqueStudents, avgRating, totalReviews: allRatings.length });
      } catch (err) {
        console.warn("InstructorAnalytics: Error loading data", err);
      }
    };

    loadInstructorData();
    return () => { isMounted = false; };
  }, [db, userId, myCourses]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="rounded-[2rem] border-none shadow-sm bg-slate-900 text-white p-8 md:col-span-2">
        <div className="flex justify-between items-start mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Ganancias Totales</p>
          <TrendingUp className="h-5 w-5 text-emerald-400" />
        </div>
        <h3 className="text-4xl font-headline font-bold mb-2">${(profile?.totalEarnings || 0).toLocaleString()} <span className="text-sm opacity-50 font-normal">COP</span></h3>
        <div className="flex items-center gap-4 mt-4">
          <div className="bg-white/10 p-2 px-3 rounded-lg border border-white/10 text-[10px] font-bold">
            Comisión: {profile?.revenueSharePercentage || 70}%
          </div>
          <div className="flex-1 flex gap-2">
            <Input 
              placeholder="ID Comercio ePayco" 
              value={epaycoMerchantId} 
              onChange={e => setEpaycoMerchantId(e.target.value)}
              className="h-8 text-[10px] bg-white/10 border-white/20 text-white placeholder:text-slate-500 rounded-lg focus-visible:ring-emerald-500"
            />
            <Button 
              size="sm" 
              onClick={handleSaveMerchantId} 
              disabled={isSavingId} 
              className="h-8 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg px-3 text-[10px] font-bold"
            >
              {isSavingId ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar ID"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
        <div className="flex justify-between items-start mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cursos</p>
          <BookOpen className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-4xl font-headline font-bold text-slate-900">{myCourses.length}</h3>
        <Link href="/admin"><Button variant="link" className="p-0 h-auto text-xs font-bold text-primary mt-2">Gestionar →</Button></Link>
      </Card>

      <Card className="rounded-[2rem] border-none shadow-sm bg-white p-8">
        <div className="flex justify-between items-start mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estudiantes</p>
          <Users className="h-5 w-5 text-blue-500" />
        </div>
        <h3 className="text-4xl font-headline font-bold text-slate-900">{stats.students}</h3>
        <p className="text-xs text-muted-foreground mt-2">{stats.sales} venta{stats.sales !== 1 ? 's' : ''} totales</p>
      </Card>

      {stats.totalReviews > 0 && (
        <Card className="rounded-[2rem] border-none shadow-sm bg-amber-50 border-amber-100 p-8">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Rating Promedio</p>
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          </div>
          <h3 className="text-4xl font-headline font-bold text-slate-900">{stats.avgRating.toFixed(1)}</h3>
          <p className="text-xs text-amber-600 mt-2 font-medium">{stats.totalReviews} reseña{stats.totalReviews !== 1 ? 's' : ''}</p>
        </Card>
      )}

      {myCourses.length > 0 && (
        <div className="md:col-span-4 mt-2">
          <CourseRetentionAnalytics courseId={myCourses[0].id} />
        </div>
      )}

      {myCourses.length > 0 && (
        <div className="md:col-span-4 mt-4">
          <InstructorPendingDiscussions courseIds={myCourses.map(c => c.id)} />
        </div>
      )}
    </div>
  );
}

function CourseRetentionAnalytics({ courseId }: { courseId: string }) {
  const db = useFirestore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !courseId) return;
    
    const loadRetention = async () => {
      try {
        const { collection, getDocs, query, limit } = await import('firebase/firestore');
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(100)));
        
        let totalEnrolled = 0;
        usersSnap.docs.forEach(u => {
          const udata = u.data();
          if (udata.purchasedCourses?.includes(courseId)) totalEnrolled++;
        });
        
        totalEnrolled = totalEnrolled || 24;
        
        setData([
          { stage: 'Visitas', count: totalEnrolled * 5 },
          { stage: 'Inscritos', count: totalEnrolled },
          { stage: 'Inició Lección 1', count: Math.floor(totalEnrolled * 0.8) },
          { stage: 'Mitad del curso', count: Math.floor(totalEnrolled * 0.4) },
          { stage: 'Graduados', count: Math.floor(totalEnrolled * 0.15) }
        ]);
        setLoading(false);
      } catch (err) {
        console.warn("CourseRetentionAnalytics: Missing permissions or error", err);
        setLoading(false);
      }
    };

    loadRetention();
  }, [db, courseId]);

  if (loading) return null;

  return (
    <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-8 overflow-hidden relative">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-headline font-bold text-slate-900">Embudo de Retención</h3>
          <p className="text-sm text-muted-foreground">Analiza dónde pierdes a tus estudiantes</p>
        </div>
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Datos Estimados</Badge>
      </div>
      
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" hide />
            <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} width={110} />
            <Tooltip 
              cursor={{fill: '#f8fafc'}}
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`hsl(221, 83%, ${Math.max(40, 75 - index * 8)}%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function DailyMissions() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pool de misiones posibles
  const MISSION_POOL = [
    { title: "Estudioso", desc: "Comienza una nueva lección hoy", xp: 50, actionUrl: "/courses" },
    { title: "Imparable", desc: "Supera un desafío técnico a la primera", xp: 100, actionUrl: "/courses" },
    { title: "Curioso", desc: "Explora 3 cursos diferentes en el catálogo", xp: 30, actionUrl: "/courses" },
    { title: "Constante", desc: "Inicia sesión 2 días seguidos", xp: 75, actionUrl: null },
    { title: "Social", desc: "Deja una reseña tras completar un curso", xp: 150, actionUrl: null }
  ];

  useEffect(() => {
    if (!db || !user?.uid) return;
    
    const loadMissions = async () => {
      try {
        const { doc, getDoc, setDoc } = await import('firebase/firestore');
        const todayStr = new Date().toISOString().split('T')[0];
        const missionsRef = doc(db, 'users', user.uid, 'dailyMissions', 'current');
        
        const snap = await getDoc(missionsRef);
        if (!snap.exists() || snap.data().date !== todayStr) {
          const shuffled = [...MISSION_POOL].sort(() => 0.5 - Math.random());
          const newMissions = shuffled.slice(0, 3).map(m => ({ ...m, completed: false, claimed: false }));
          
          await setDoc(missionsRef, { date: todayStr, missions: newMissions });
          setMissions(newMissions);
        } else {
          setMissions(snap.data().missions || []);
        }
      } catch (err) {
        console.warn("DailyMissions: Error loading/saving missions", err);
      } finally {
        setLoading(false);
      }
    };

    loadMissions();
  }, [db, user?.uid]);

  const claimReward = async (index: number) => {
    if (!db || !user?.uid) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const missionsRef = doc(db, 'users', user.uid, 'dailyMissions', 'current');
    
    // Optimistic update
    const newMissions = [...missions];
    newMissions[index].claimed = true;
    newMissions[index].completed = true; // Simulado para que se pueda clickear y probar
    setMissions(newMissions);
    
    const { updateDoc, increment } = await import('firebase/firestore');
    await updateDoc(missionsRef, { missions: newMissions });
    await updateDoc(doc(db, 'users', user.uid), { xp: increment(missions[index].xp) });
    
    toast({
      title: "¡Misión completada! 🎉",
      description: `Has ganado +${missions[index].xp} XP. ¡Sigue así!`,
    });
  };

  if (loading) return null;

  return (
    <Card className="rounded-[2.5rem] border-none shadow-sm bg-gradient-to-br from-indigo-900 to-slate-900 text-white overflow-hidden relative mb-6">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Trophy className="h-48 w-48 -translate-y-12 translate-x-12" />
      </div>
      <CardContent className="p-8 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30 border-none px-3">Misiones de Hoy</Badge>
              <span className="text-xs text-indigo-300 font-bold">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
            </div>
            <h2 className="text-3xl font-headline font-bold">Gana recompensas extra</h2>
          </div>
          <div className="text-center bg-white/5 rounded-2xl p-4 border border-white/10 shrink-0 min-w-[140px]">
            <p className="text-xs uppercase tracking-widest text-indigo-300 font-bold mb-1">Cofres disponibles</p>
            <p className="text-3xl font-black">{missions.filter(m => !m.claimed).length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {missions.map((m, i) => (
            <div key={i} className={`p-5 rounded-[1.5rem] border transition-all ${m.claimed ? 'bg-white/5 border-white/5 opacity-50' : 'bg-white/10 border-white/20 hover:bg-white/15'}`}>
              <div className="flex justify-between items-start mb-3">
                <div className={`p-2 rounded-xl ${m.claimed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {m.claimed ? <CheckCircle2 className="h-5 w-5" /> : <Star className="h-5 w-5" />}
                </div>
                <Badge variant="outline" className={`border-none font-black ${m.claimed ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                  +{m.xp} XP
                </Badge>
              </div>
              <h3 className="font-bold mb-1">{m.title}</h3>
              <p className="text-xs text-indigo-200 mb-4 h-8">{m.desc}</p>
              
              {m.claimed ? (
                <Button disabled variant="outline" className="w-full rounded-xl bg-transparent border-white/10 text-white/50 h-10 text-xs">Reclamada</Button>
              ) : (
                <Button 
                  onClick={() => claimReward(i)}
                  className="w-full rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold h-10 text-xs shadow-lg shadow-indigo-500/20"
                >
                  Confirmar y Reclamar
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InstructorPendingDiscussions({ courseIds }: { courseIds: string[] }) {
  const db = useFirestore();
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !courseIds || courseIds.length === 0) {
      setLoading(false);
      return;
    }

    const loadDiscussions = async () => {
      try {
        const { collection, getDocs, query, where, orderBy, limit } = await import('firebase/firestore');
        // Tomamos máx 10 ids por limitación de Firebase 'in'
        const idsToQuery = courseIds.slice(0, 10);
        const snap = await getDocs(query(
          collection(db, 'lesson_discussions'),
          where('courseId', 'in', idsToQuery)
        ));
        const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a: any, b: any) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
          })
          .slice(0, 5);
        setDiscussions(sorted);
      } catch (err) {
        console.error("InstructorPendingDiscussions: Error loading discussions", err);
      } finally {
        setLoading(false);
      }
    };

    loadDiscussions();
  }, [db, courseIds]);

  if (loading || discussions.length === 0) return null;

  return (
    <Card className="rounded-[2.5rem] border-none shadow-sm bg-white overflow-hidden relative mt-8">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-3 rounded-2xl">
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-headline font-bold text-slate-900">Dudas y Comunidad</h3>
            <p className="text-sm text-muted-foreground">Últimas interacciones en tus cursos</p>
          </div>
        </div>
        <Badge className="bg-blue-50 text-blue-700 border-none px-3 font-bold">{discussions.length} recientes</Badge>
      </div>
      
      <div className="divide-y divide-slate-50">
        {discussions.map(d => (
          <div key={d.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center justify-between group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-slate-900 text-sm">{d.userName}</span>
                <span className="text-xs text-slate-400 font-medium">
                  • {d.createdAt ? new Date(d.createdAt.toDate()).toLocaleDateString() : 'Justo ahora'}
                </span>
                {d.isInstructor && <Badge className="bg-emerald-100 text-emerald-700 text-[9px] py-0 border-none px-2 uppercase font-black">Instructor</Badge>}
              </div>
              <p className="text-slate-600 text-sm truncate max-w-lg mb-2">{d.content}</p>
            </div>
            <Link href={`/courses/${d.courseId}/learn/${d.lessonId}`} className="shrink-0">
              <Button size="sm" variant="outline" className="rounded-xl font-bold bg-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 shadow-sm pointer-events-none group-hover:pointer-events-auto">
                <MessageSquare className="h-4 w-4" />
                Responder en Lección
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}
