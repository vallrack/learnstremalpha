
'use client';

import { Navbar } from '@/components/layout/Navbar';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Trophy, Clock, PlayCircle, Loader2, Sparkles, Code2, BarChart3 } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  // 1. Obtener el progreso del usuario
  const progressQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, 'users', user.uid, 'courseProgress');
  }, [db, user?.uid]);
  const { data: userProgress, isLoading: isProgressLoading } = useCollection(progressQuery);

  // 2. Obtener todos los cursos
  const coursesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'courses');
  }, [db]);
  const { data: allCourses, isLoading: isCoursesLoading } = useCollection(coursesQuery);

  // 3. Obtener envíos de desafíos
  const submissionsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'users', user.uid, 'challenge_submissions'), orderBy('submittedAt', 'desc'), limit(10));
  }, [db, user?.uid]);
  const { data: submissions } = useCollection(submissionsQuery);

  // Combinar progreso con datos del curso
  const enrolledCourses = useMemoFirebase(() => {
    if (!userProgress || !allCourses) return [];
    return userProgress.map(progress => {
      const courseDetails = allCourses.find(c => c.id === progress.courseId);
      return {
        ...progress,
        courseDetails
      };
    }).filter(item => item.courseDetails);
  }, [userProgress, allCourses]);

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Estudiante';

  if (isUserLoading || isProgressLoading || isCoursesLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  const coursesInProgressCount = enrolledCourses.filter(c => c.status !== 'completed').length;
  const completedCoursesCount = enrolledCourses.filter(c => c.status === 'completed').length;
  
  // Chart data
  const chartData = submissions?.map(s => ({
    name: s.challengeTitle?.substring(0, 10) + '...',
    score: s.score
  })).reverse() || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-headline font-bold mb-2">¡Bienvenido de nuevo, {displayName}!</h1>
          <p className="text-muted-foreground">Tu progreso académico y técnico en un solo lugar.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <Card className="rounded-3xl border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cursos Activos</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{coursesInProgressCount}</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Certificados</CardTitle>
              <Trophy className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completedCoursesCount}</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Desafíos Superados</CardTitle>
              <Code2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{submissions?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border-none shadow-sm bg-primary text-primary-foreground">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-primary-foreground/70">Puntos Totales</CardTitle>
              <Sparkles className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{(enrolledCourses.length * 100) + ((submissions?.length || 0) * 50)}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Progress Chart */}
          <Card className="lg:col-span-2 rounded-3xl border-none shadow-sm bg-white p-6">
            <CardHeader className="px-0 pt-0">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl font-headline">Rendimiento en Desafíos</CardTitle>
              </div>
              <CardDescription>Tus últimas 10 calificaciones de IA (Escala 0-5)</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] px-0">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      cursor={{ fill: '#f8fafc' }} 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score >= 4 ? '#10b981' : entry.score >= 3 ? '#3b82f6' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Code2 className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">No hay datos de desafíos todavía.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="rounded-3xl border-none shadow-sm bg-white p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-xl font-headline">Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              {submissions?.slice(0, 5).map((sub, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-muted/30 transition-colors">
                  <div className={`p-2 rounded-xl ${sub.passed ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    <Code2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{sub.challengeTitle}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{new Date(sub.submittedAt?.toDate()).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${sub.score >= 4 ? 'text-emerald-600' : 'text-primary'}`}>{sub.score}/5</p>
                  </div>
                </div>
              ))}
              {(!submissions || submissions.length === 0) && (
                <p className="text-sm text-center text-muted-foreground py-8">No hay actividad reciente.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-headline font-bold">Continuar Aprendiendo</h2>
            <Link href="/courses">
              <Button variant="ghost" size="sm" className="rounded-xl">Ver catálogo</Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {enrolledCourses.length > 0 ? (
              enrolledCourses.map((item) => {
                const progress = item.progressPercentage || 0;
                const course = item.courseDetails;
                const imageSrc = course.thumbnailDataUrl || course.imageUrl || 'https://picsum.photos/seed/course/800/450';
                
                return (
                  <Card key={item.id} className="overflow-hidden border-none rounded-[2rem] shadow-sm bg-white hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row">
                      <div className="w-full sm:w-40 h-40 sm:h-auto relative shrink-0">
                        <Image 
                          src={imageSrc} 
                          alt={course.title}
                          fill
                          className="object-cover"
                          unoptimized={imageSrc.startsWith('data:')}
                        />
                      </div>
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-headline font-bold text-lg mb-4 line-clamp-1">{course.title}</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-muted-foreground">
                              <span>Progreso</span>
                              <span>{Math.round(progress)}%</span>
                            </div>
                            <Progress value={progress} className="h-2 bg-muted" />
                          </div>
                        </div>
                        <div className="mt-6 flex items-center justify-end">
                          <Link href={`/courses/${course.id}`}>
                            <Button size="sm" className="gap-2 rounded-xl h-9 bg-primary">
                              <PlayCircle className="h-4 w-4" />
                              Continuar
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-20 bg-muted/20 rounded-[3rem] border-4 border-dashed">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Comienza tu viaje hoy mismo.</p>
                <Link href="/courses" className="mt-4 inline-block">
                  <Button variant="link" className="text-primary font-bold">Explorar catálogo →</Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
