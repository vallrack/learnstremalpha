'use client';

import { Navbar } from '@/components/layout/Navbar';
import { MOCK_COURSES } from '@/lib/mock-data';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Trophy, Clock, PlayCircle, Loader2 } from 'lucide-react';
import { useUser } from '@/firebase';
import Image from 'next/image';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const enrolledCourses = MOCK_COURSES.slice(0, 2);

  // Fallback name logic
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Estudiante';

  if (isUserLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-headline font-bold mb-2">¡Bienvenido de nuevo, {displayName}!</h1>
          <p className="text-muted-foreground">Has completado el 45% de tus objetivos este mes.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cursos en Progreso</CardTitle>
              <BookOpen className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Horas de Aprendizaje</CardTitle>
              <Clock className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24.5</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Certificados</CardTitle>
              <Trophy className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
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
            {enrolledCourses.map((course, i) => {
              const progress = i === 0 ? 65 : 12;
              return (
                <Card key={course.id} className="overflow-hidden border-border/50 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row">
                    <div className="w-full md:w-64 h-48 md:h-auto relative shrink-0">
                      <Image 
                        src={course.thumbnail} 
                        alt={course.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="p-8 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-headline font-bold text-2xl">{course.title}</h3>
                          <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{progress}%</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-8 line-clamp-2">{course.description}</p>
                        <Progress value={progress} className="h-2 bg-muted" />
                      </div>
                      <div className="mt-8 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Último acceso hace 2 días</span>
                        <Link href={`/courses/${course.id}/learn/${course.modules[0].lessons[0].id}`}>
                          <Button className="gap-2 rounded-xl px-6 h-11 bg-primary hover:bg-primary/90 transition-all">
                            <PlayCircle className="h-4 w-4" />
                            Continuar Aprendiendo
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
