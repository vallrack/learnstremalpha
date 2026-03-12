'use client';

import { Navbar } from '@/components/layout/Navbar';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Trophy, Clock, PlayCircle, Loader2, Sparkles } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();

  // 1. Obtener el progreso del usuario
  const progressQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return collection(db, 'users', user.uid, 'courseProgress');
  }, [db, user?.uid]);
  const { data: userProgress, isLoading: isProgressLoading } = useCollection(progressQuery);

  // 2. Obtener todos los cursos para cruzar información (nombres, imágenes)
  const coursesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'courses');
  }, [db]);
  const { data: allCourses, isLoading: isCoursesLoading } = useCollection(coursesQuery);

  // Combinar progreso con datos del curso
  const enrolledCourses = useMemoFirebase(() => {
    if (!userProgress || !allCourses) return [];
    return userProgress.map(progress => {
      const courseDetails = allCourses.find(c => c.id === progress.courseId);
      return {
        ...progress,
        courseDetails
      };
    }).filter(item => item.courseDetails); // Solo mostrar si el curso aún existe
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-headline font-bold mb-2">¡Bienvenido de nuevo, {displayName}!</h1>
          <p className="text-muted-foreground">Continúa donde lo dejaste y alcanza tus metas.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cursos en Progreso</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{coursesInProgressCount}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cursos Completados</CardTitle>
              <Trophy className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCoursesCount}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Puntos de Aprendizaje</CardTitle>
              <Sparkles className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrolledCourses.length * 100}</div>
            </CardContent>
          </Card>
        </div>

        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-headline font-bold">Mis Cursos Actuales</h2>
            <Link href="/courses">
              <Button variant="outline" size="sm" className="rounded-xl">Explorar más</Button>
            </Link>
          </div>
          
          <div className="space-y-6">
            {enrolledCourses.length > 0 ? (
              enrolledCourses.map((item) => {
                const progress = item.progressPercentage || 0;
                const course = item.courseDetails;
                const imageSrc = course.thumbnailDataUrl || course.imageUrl || 'https://picsum.photos/seed/course/800/450';
                
                return (
                  <Card key={item.id} className="overflow-hidden border-border/50 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-64 h-48 md:h-auto relative shrink-0">
                        <Image 
                          src={imageSrc} 
                          alt={course.title}
                          fill
                          className="object-cover"
                          unoptimized={imageSrc.startsWith('data:')}
                        />
                      </div>
                      <div className="p-8 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-headline font-bold text-2xl">{course.title}</h3>
                            <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{Math.round(progress)}%</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-8 line-clamp-2">{course.description}</p>
                          <Progress value={progress} className="h-2 bg-muted" />
                        </div>
                        <div className="mt-8 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {item.status === 'completed' ? '¡Curso completado!' : 'Sigue aprendiendo'}
                          </span>
                          <Link href={`/courses/${course.id}`}>
                            <Button className="gap-2 rounded-xl px-6 h-11 bg-primary hover:bg-primary/90 transition-all">
                              <PlayCircle className="h-4 w-4" />
                              Ir al Curso
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">Aún no te has inscrito en ningún curso.</p>
                <Link href="/courses" className="mt-4 inline-block">
                  <Button variant="link" className="text-primary font-bold">Explorar catálogo de cursos →</Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
