'use client';

import { Navbar } from '@/components/layout/Navbar';
import { CourseCard } from '@/components/courses/CourseCard';
import { Input } from '@/components/ui/input';
import { Search, Filter, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

export default function CoursesPage() {
  const db = useFirestore();
  
  const coursesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'courses');
  }, [db]);

  const { data: courses, isLoading } = useCollection(coursesQuery);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-headline font-bold mb-4">Explorar Cursos</h1>
          <p className="text-muted-foreground text-lg mb-8">Descubre nuevas habilidades en nuestra biblioteca de contenido real.</p>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Busca cursos, temas o instructores..." className="pl-10 h-12 rounded-xl" />
            </div>
            <Button variant="outline" className="h-12 rounded-xl gap-2">
              <Filter className="h-4 w-4" />
              Filtrar
            </Button>
          </div>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Cargando catálogo...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses?.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
            {courses?.length === 0 && (
              <div className="col-span-full text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
                <p className="text-muted-foreground">Aún no hay cursos disponibles. Vuelve pronto.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
