'use client';

import { Navbar } from '@/components/layout/Navbar';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, Users, Star, Clock, Globe, BookOpen, CheckCircle2, Loader2, Zap } from 'lucide-react';
import Link from 'next/link';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function CourseDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const db = useFirestore();

  const courseRef = useMemoFirebase(() => {
    if (!db || !id) return null;
    return doc(db, 'courses', id);
  }, [db, id]);

  const { data: course, isLoading } = useDoc(courseRef);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Curso no encontrado</h1>
          <Link href="/courses">
            <Button variant="outline">Volver al catálogo</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <div className="bg-primary py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="max-w-7xl mx-auto relative z-10 text-white">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Badge className="bg-white/20 hover:bg-white/30 text-white border-none rounded-lg">{course.category}</Badge>
            <div className="flex items-center gap-1 text-sm text-white/80">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-white">4.9</span> (Nueva entrega)
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-headline font-bold mb-6 max-w-3xl leading-tight">
            {course.title}
          </h1>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl leading-relaxed">
            {course.description}
          </p>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2"><Users className="h-4 w-4" /> Instructor: {course.instructorName || 'Experto'}</div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Acceso de por vida</div>
            <div className="flex items-center gap-2"><Globe className="h-4 w-4" /> Español</div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 -mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section className="bg-card p-8 rounded-2xl border shadow-sm mt-20 md:mt-0">
              <h2 className="text-2xl font-headline font-bold mb-6">Lo que aprenderás</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span>Dominio de conceptos fundamentales y prácticos de {course.category}.</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-headline font-bold mb-6">Contenido del Curso</h2>
              <div className="p-12 text-center bg-muted/10 rounded-3xl border-2 border-dashed">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Los módulos y lecciones estarán disponibles próximamente.</p>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-card rounded-2xl border shadow-xl overflow-hidden sticky top-24">
              <div className="relative aspect-video">
                <Image 
                  src={course.thumbnail} 
                  alt={course.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <PlayCircle className="h-16 w-16 text-white cursor-pointer hover:scale-110 transition-transform" />
                </div>
              </div>
              <div className="p-8">
                <div className="text-3xl font-headline font-bold mb-6">
                  {course.isFree ? 'Gratis' : '$29.99'}
                  {course.isFree && <span className="text-sm font-normal text-muted-foreground ml-2">por tiempo limitado</span>}
                </div>
                
                <div className="space-y-4">
                  <Button className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 rounded-xl">
                    Comenzar ahora
                  </Button>
                  <Button variant="outline" className="w-full h-12 text-lg font-bold rounded-xl">
                    Guardar curso
                  </Button>
                </div>

                <div className="mt-8 space-y-4">
                  <p className="font-semibold text-sm">Este curso incluye:</p>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-center gap-3"><Clock className="h-4 w-4" /> Acceso ilimitado</li>
                    <li className="flex items-center gap-3"><BookOpen className="h-4 w-4" /> Material descargable</li>
                    <li className="flex items-center gap-3"><Zap className="h-4 w-4" /> Asistente de IA integrado</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
