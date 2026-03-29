'use client';

import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Compass, BookOpen, Clock, PlayCircle, Loader2, ArrowRight, ShieldCheck, Zap, Lock, Map, Layers } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useDoc, useFirestore, useUser, useMemoFirebase, useCollection, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, query, where, documentId } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function PathDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const pathId = params.id as string;

  const [isEnrolling, setIsEnrolling] = useState(false);

  const pathRef = useMemoFirebase(() => {
    if (!db || !pathId) return null;
    return doc(db, 'paths', pathId);
  }, [db, pathId]);
  const { data: pathData, isLoading: isPathLoading } = useDoc(pathRef);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  // Consultar todos los cursos de esta ruta
  const coursesQuery = useMemoFirebase(() => {
    if (!db || !pathData?.courseIds || pathData.courseIds.length === 0) return null;
    return query(
      collection(db, 'courses'),
      where(documentId(), 'in', pathData.courseIds.slice(0, 10))
    );
  }, [db, pathData?.courseIds]);
  const { data: coursesData, isLoading: isCoursesLoading } = useCollection(coursesQuery);

  const isEnrolledInAll = useMemoFirebase(() => {
    if (!profile?.purchasedCourses || !pathData?.courseIds) return false;
    return pathData.courseIds.every((cid: string) => profile.purchasedCourses?.includes(cid));
  }, [profile?.purchasedCourses, pathData?.courseIds]);

  const handleEnrollPath = async () => {
    if (!user || user.isAnonymous) {
      router.push(`/login?redirect=/paths/${pathId}`);
      return;
    }
    
    // Si la ruta cobra, pasamos por checkout
    if (pathData?.price > 0 && profile?.role !== 'admin' && !profile?.isPremiumSubscriber) {
      // Nota: Implementar /checkout?pathId=..
      router.push(`/checkout?pathId=${pathId}`);
      return;
    }

    setIsEnrolling(true);
    try {
      const { arrayUnion, updateDoc } = await import('firebase/firestore');
      const userDocRef = doc(db!, 'users', user.uid);
      
      // Inscribir a todos los cursos de la ruta
      await updateDoc(userDocRef, {
        purchasedCourses: arrayUnion(...(pathData?.courseIds || []))
      });

      // Registrar inicio para analíticas cruzadas opcionalmente
      pathData.courseIds.forEach((cid: string) => {
        setDocumentNonBlocking(doc(db!, 'users', user.uid, 'courseProgress', cid), {
          courseId: cid,
          status: 'in_progress',
          progressPercentage: 0,
          enrolledAt: new Date()
        }, { merge: true });
      });

      toast({ title: '¡Inscripción Exitosa!', description: 'Has desbloqueado todos los cursos de esta ruta.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo procesar la inscripción.' });
    } finally {
      setIsEnrolling(false);
    }
  };


  if (isPathLoading || !db) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!pathData) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-center py-20 px-6">
        <Navbar />
        <Compass className="h-20 w-20 mx-auto opacity-20 mb-6" />
        <h1 className="text-3xl font-bold font-headline">Ruta no encontrada</h1>
        <Button className="mt-8 rounded-full" asChild><Link href="/paths">Ver todas las Rutas</Link></Button>
      </div>
    );
  }

  // Ordenar los cursos como están en el array de la ruta
  const orderedCourses = (coursesData || []).sort((a: any, b: any) => {
    return pathData.courseIds.indexOf(a.id) - pathData.courseIds.indexOf(b.id);
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      {/* Hero Header */}
      <section className="bg-slate-900 border-b border-white/10 relative overflow-hidden py-24 px-6 md:px-12 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-primary/20 to-slate-900 opacity-60 z-0" />
        <div className="absolute right-0 top-0 translate-x-1/3 -translate-y-1/3">
          <Map className="h-96 w-96 text-white/5 opacity-50 stroke-1" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="flex gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full"><BookOpen className="w-4 h-4 text-emerald-400" /> {pathData.courseIds?.length || 0} CURSOS</span>
              <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full"><Clock className="w-4 h-4 text-amber-400" /> ~{pathData.estimatedHours || 0} HORAS</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-headline font-extrabold leading-tight">
              {pathData.title}
            </h1>
            
            <p className="text-slate-400 text-lg md:text-xl max-w-xl leading-relaxed">
              {pathData.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              {isEnrolledInAll ? (
                <Button disabled className="h-16 px-10 text-xl font-bold rounded-full bg-emerald-500 hover:bg-emerald-600 gap-3 text-white border-none shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] cursor-default">
                  <ShieldCheck className="h-6 w-6" /> Completamente Inscrito
                </Button>
              ) : (
                <Button 
                  onClick={handleEnrollPath}
                  disabled={isEnrolling}
                  className="h-16 px-10 text-xl font-bold rounded-full bg-primary hover:bg-primary/90 gap-3 shadow-[0_0_40px_-5px_var(--tw-colors-primary)] transition-transform hover:scale-105"
                >
                  {isEnrolling ? <Loader2 className="h-6 w-6 animate-spin" /> : <PlayCircle className="h-6 w-6" />}
                  {pathData.price > 0 ? `Inscribirme por $${pathData.price}` : 'Comenzar Ruta Gratis'}
                </Button>
              )}
            </div>
          </div>
          
          <div className="h-[400px] w-full rounded-[3rem] overflow-hidden shadow-2xl shadow-primary/20 relative group border-4 border-slate-800">
             <Image 
                src={pathData.imageUrl || 'https://picsum.photos/seed/path/800/600'} 
                alt={pathData.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                unoptimized
              />
              <div className="absolute inset-0 bg-slate-900/20 mix-blend-overlay pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Course List Flow */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <Badge className="bg-primary/10 text-primary border-none text-[10px] py-1 px-3 uppercase tracking-widest font-black mb-4">El Camino a Recorrer</Badge>
          <h2 className="text-3xl md:text-5xl font-headline font-extrabold text-slate-900">Módulos del Bootcamp</h2>
        </div>

        {isCoursesLoading ? (
           <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 text-primary animate-spin" /></div>
        ) : orderedCourses.length === 0 ? (
           <p className="text-center text-muted-foreground">Todavía no hay cursos añadidos a esta ruta.</p>
        ) : (
           <div className="relative">
             {/* Línea central (Tronco de la ruta) */}
             <div className="absolute left-10 md:left-1/2 top-4 bottom-4 w-1.5 bg-slate-200 transform md:-translate-x-1/2 rounded-full hidden md:block" />

             <div className="space-y-12 md:space-y-24">
               {orderedCourses.map((course: any, idx: number) => {
                  const isEven = idx % 2 === 0;
                  const isUserEnrolled = profile?.purchasedCourses?.includes(course.id);
                  const isFreeAccess = course.isFree || profile?.role === 'admin' || profile?.isPremiumSubscriber;
                  const hasAccess = isUserEnrolled || isFreeAccess;

                  return (
                    <div key={course.id} className="relative flex flex-col md:flex-row items-center justify-between w-full group">
                      
                      {/* Nodo central */}
                      <div className="absolute left-10 md:left-1/2 w-12 h-12 bg-white rounded-full border-4 border-slate-200 transform md:-translate-x-1/2 shadow-xl flex items-center justify-center font-black text-slate-400 z-10 hidden md:flex group-hover:border-primary group-hover:text-primary transition-colors">
                        {idx + 1}
                      </div>

                      {/* Tarjeta del Curso (Intercalado izq/der en MD) */}
                      <div className={`w-full md:w-5/12 ml-16 md:ml-0 ${!isEven ? 'md:col-start-2 ml-auto' : 'mr-auto'}`}>
                        <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm hover:shadow-xl transition-all border border-slate-100 flex gap-6 items-center overflow-hidden relative">
                           {/* Decorative background number */}
                           <div className="absolute -right-4 -bottom-4 text-9xl font-black text-slate-50 opacity-50 pointer-events-none md:hidden">{idx + 1}</div>

                           <div className="hidden sm:block w-24 h-24 rounded-[1.5rem] bg-slate-100 shrink-0 relative overflow-hidden shadow-inner">
                             <Image src={course.thumbnailDataUrl || course.imageUrl || 'https://picsum.photos/400'} alt="Course" fill className="object-cover" unoptimized/>
                           </div>
                           
                           <div className="flex-1 space-y-2 text-left relative z-10">
                             <div className="flex gap-2">
                               {hasAccess && <Badge className="bg-emerald-50 text-emerald-600 border-none px-2 shadow-sm font-black text-[10px]">C. Desbloqueado</Badge>}
                               <Badge className="bg-slate-100 text-slate-500 border-none px-2 shadow-sm font-bold text-[10px]">{course.technology}</Badge>
                             </div>
                             <h3 className="font-headline font-bold text-xl">{course.title}</h3>
                             <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">{course.description}</p>
                             
                             <div className="pt-3">
                               <Link href={`/courses/${course.id}`}>
                                 <Button variant={hasAccess ? "default" : "outline"} className={`rounded-xl font-bold h-10 px-6 ${hasAccess ? 'shadow-lg shadow-primary/20' : ''}`}>
                                   {hasAccess ? 'Ir al curso' : 'Ver temario'}
                                 </Button>
                               </Link>
                             </div>
                           </div>
                        </div>
                      </div>

                      {/* Espaciador invisible para mantener el layout de 5/12 izq y der en desktop */}
                      <div className={`hidden md:block w-5/12 ${isEven ? 'md:order-last' : 'md:order-first'}`} />
                    </div>
                  );
               })}
             </div>
           </div>
        )}
      </section>
    </div>
  );
}
