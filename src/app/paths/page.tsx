'use client';

import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Compass, BookOpen, Clock, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useMemoFirebase } from '@/firebase';

export default function PathsPage() {
  const db = useFirestore();

  const pathsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'paths'),
      where('isPublished', '==', true),
      orderBy('createdAt', 'desc')
    );
  }, [db]);

  const { data: paths, isLoading } = useCollection(pathsQuery);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center max-w-3xl mx-auto mb-20 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <Badge className="bg-primary/10 text-primary border-none px-4 py-1.5 uppercase font-black tracking-widest mb-6">
            Rutas de Aprendizaje
          </Badge>
          <h1 className="text-4xl md:text-6xl font-headline font-extrabold text-slate-900 mb-6 leading-tight">
            De cero a experto paso a paso
          </h1>
          <p className="text-slate-500 text-lg md:text-xl leading-relaxed">
            Nuestros Bootcamps empaquetan los mejores cursos en una hoja de ruta estructurada. Ahorra dinero y asegura tu futuro profesional con un camino trazado.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-slate-200 animate-pulse rounded-[2.5rem]" />
            ))}
          </div>
        ) : paths?.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-300">
            <Compass className="h-20 w-20 text-slate-200 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-slate-700 mb-2">Próximamente más Rutas</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Nuestros expertos están cocinando nuevas hojas de ruta completas. ¡Mantente atento!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {paths?.map((path: any) => (
              <Link key={path.id} href={`/paths/${path.id}`} className="group h-full">
                <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 flex flex-col h-full group-hover:-translate-y-2 relative">
                  <div className="absolute top-4 left-4 z-10 flex gap-2">
                    {path.level === 'Principiante' && <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-none font-bold shadow-md"><ShieldCheck className="w-3 h-3 mr-1"/> Fácil</Badge>}
                    {path.level === 'Intermedio' && <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-none font-bold shadow-md"><Zap className="w-3 h-3 mr-1"/> Intermedio</Badge>}
                    {path.level === 'Avanzado' && <Badge className="bg-rose-500 hover:bg-rose-500 text-white border-none font-bold shadow-md"><Zap className="w-3 h-3 mr-1"/> Avanzado</Badge>}
                  </div>
                  
                  <div className="relative aspect-video w-full overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent z-10" />
                    <Image 
                      src={path.imageUrl || 'https://picsum.photos/seed/path/800/600'} 
                      alt={path.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                      unoptimized
                    />
                    <div className="absolute bottom-4 left-4 z-20">
                      <h3 className="text-white font-headline font-bold text-xl drop-shadow-md">{path.title}</h3>
                    </div>
                  </div>
                  
                  <div className="p-6 md:p-8 flex-1 flex flex-col">
                    <p className="text-slate-500 text-sm line-clamp-3 mb-6 relative z-20 flex-1">
                      {path.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider mb-8">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl">
                        <BookOpen className="h-4 w-4 text-primary" /> {path.courseIds?.length || 0} Cursos
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl">
                        <Clock className="h-4 w-4 text-amber-500" /> ~{path.estimatedHours || 0} hs
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-auto">
                      <div className="font-headline">
                        {path.price > 0 ? (
                          <>
                            <p className="text-xs text-slate-400 font-bold uppercase">Precio Total</p>
                            <p className="text-2xl font-black text-slate-900">${path.price} <span className="text-sm font-medium text-slate-500">USD</span></p>
                          </>
                        ) : (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-base py-1 px-4 font-black">
                            GRATIS
                          </Badge>
                        )}
                      </div>
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors text-primary">
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
