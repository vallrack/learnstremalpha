
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
  TrendingUp
} from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, orderBy, limit, doc, where } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
  );
}

function InstructorAnalytics({ userId, myCourses, profile }: { userId: string; myCourses: any[]; profile: any }) {
  const db = useFirestore();
  const [stats, setStats] = useState({ sales: 0, students: 0, avgRating: 0, totalReviews: 0 });

  useEffect(() => {
    if (!db || !userId) return;
    import('firebase/firestore').then(({ collection, getDocs, query, where, collectionGroup }) => {
      // Ventas y estudiantes únicos desde transactions
      getDocs(query(collection(db, 'transactions'), where('instructorId', '==', userId))).then(snap => {
        const sales = snap.size;
        const uniqueStudents = new Set(snap.docs.map(d => d.data().userId)).size;

        // Rating promedio desde reviews de los cursos del instructor
        const courseIds = myCourses.map(c => c.id);
        if (courseIds.length === 0) { setStats(s => ({ ...s, sales, students: uniqueStudents })); return; }
        Promise.all(courseIds.map(cid =>
          getDocs(collection(db, 'reviews', cid, 'ratings'))
        )).then(snaps => {
          const allRatings = snaps.flatMap(s => s.docs.map(d => d.data().rating || 0));
          const avgRating = allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
          setStats({ sales, students: uniqueStudents, avgRating, totalReviews: allRatings.length });
        }).catch(() => {});
      }).catch(() => {});
    });
  }, [db, userId, myCourses]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="rounded-[2rem] border-none shadow-sm bg-slate-900 text-white p-8 md:col-span-2">
        <div className="flex justify-between items-start mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Ganancias Totales</p>
          <TrendingUp className="h-5 w-5 text-emerald-400" />
        </div>
        <h3 className="text-4xl font-headline font-bold mb-2">${(profile?.totalEarnings || 0).toLocaleString()} <span className="text-sm opacity-50 font-normal">COP</span></h3>
        <p className="text-xs text-slate-500">Comisión activa: {profile?.revenueSharePercentage || 70}%</p>
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
    </div>
  );
}
