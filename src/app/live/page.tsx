'use client';

import { useState, useMemo } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { 
  useCollection, 
  useFirestore, 
  useUser, 
  useMemoFirebase 
} from '@/firebase';
import { collectionGroup, query, where, orderBy } from 'firebase/firestore';
import { 
  Video, 
  Search, 
  CalendarIcon, 
  Clock, 
  Users, 
  Zap, 
  ArrowRight,
  Loader2,
  Sparkles,
  Ticket,
  Lock,
  PlayCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatPrice } from '@/lib/currency';
import { cn } from '@/lib/utils';

export default function LiveCatalogPage() {
  const db = useFirestore();
  const { profile } = useUser();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');

  const liveClassesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collectionGroup(db, 'virtualClasses'),
      where('showInCatalog', '==', true),
      orderBy('scheduledAt', 'asc')
    );
  }, [db]);

  const { data: classes, isLoading } = useCollection(liveClassesQuery);

  const categories = useMemo(() => {
    if (!classes) return ['Todas'];
    const techs = classes.map((c: any) => c.technology).filter(Boolean);
    return ['Todas', ...new Set(techs)];
  }, [classes]);

  const filteredClasses = useMemo(() => {
    if (!classes) return [];
    return classes.filter((c: any) => {
      const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase()) || 
                            (c.courseTitle || '').toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'Todas' || c.technology === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [classes, search, activeCategory]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <header className="mb-16">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-2xl text-blue-600 text-xs font-bold uppercase tracking-widest">
                <Video className="h-4 w-4" />
                Sesiones Síncronas
              </div>
              <h1 className="text-5xl font-headline font-bold text-slate-900 leading-tight">
                Clases <span className="text-blue-600 italic">en Vivo</span>
              </h1>
              <p className="text-lg text-muted-foreground font-medium">
                Conéctate en tiempo real con expertos y otros estudiantes. Aprende, pregunta y crece en comunidad.
              </p>
            </div>
            
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar clases o cursos..." 
                className="pl-12 rounded-2xl h-14 bg-white border-none shadow-xl shadow-slate-200/50" 
              />
            </div>
          </div>

          <div className="flex gap-3 mt-10 overflow-x-auto pb-4 scrollbar-hide">
             {categories.map(cat => (
               <Button 
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-2xl h-11 px-6 font-bold transition-all ${activeCategory === cat ? 'bg-blue-600 shadow-lg shadow-blue-500/20 scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
               >
                 {cat}
               </Button>
             ))}
          </div>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-slate-500 font-medium">Cargando cartelera...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-sm">
            <div className="bg-slate-50 p-6 rounded-3xl inline-flex mb-6">
                 <Video className="h-12 w-12 text-slate-300" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-2">No hay clases programadas</h3>
            <p className="text-slate-500 font-medium max-w-sm mx-auto">Pronto tendremos nuevas sesiones. ¡Vuelve pronto o explora nuestros cursos grabados!</p>
            <Link href="/courses" className="mt-8 inline-block">
                <Button className="rounded-2xl h-12 px-8 font-bold gap-2">Explorar Cursos</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredClasses.map((vc: any) => {
              const isPast = vc.scheduledAt ? vc.scheduledAt.toDate() < new Date() : false;
              const accessType = vc.accessType || 'course';
              
              return (
                <div 
                  key={vc.id} 
                  className={cn(
                    "group bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 flex flex-col gap-6",
                    isPast && "grayscale opacity-80"
                  )}
                >
                  <div className="relative h-48 rounded-[2rem] overflow-hidden bg-slate-100">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-indigo-600/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="p-6 bg-white/20 backdrop-blur-md rounded-full shadow-2xl">
                             <Video className="h-12 w-12 text-white" />
                        </div>
                    </div>
                    
                    <div className="absolute top-4 left-4 z-20">
                        {accessType === 'free' ? (
                            <Badge className="bg-emerald-500 text-white border-none shadow-lg">LIBRE</Badge>
                        ) : accessType === 'paid' ? (
                            <Badge className="bg-amber-500 text-white border-none shadow-lg">MASTERCLASS</Badge>
                        ) : (
                            <Badge className="bg-blue-600 text-white border-none shadow-lg">CURSO</Badge>
                        )}
                    </div>

                    {!isPast && (
                        <div className="absolute bottom-4 left-4 right-4 z-20">
                            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl text-white text-[10px] font-bold flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {vc.scheduledAt ? new Date(vc.scheduledAt.toDate()).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Próximamente'}
                            </div>
                        </div>
                    )}
                  </div>

                  <div className="space-y-4 flex-1">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 line-clamp-1">{vc.courseTitle}</p>
                        <h3 className="text-xl font-headline font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight">
                            {vc.title}
                        </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Users className="h-3.5 w-3.5" />
                            <span className="font-semibold text-slate-700">{vc.instructorName}</span>
                        </div>
                        {vc.technology && (
                            <div className="flex items-center gap-1.5">
                                <Zap className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-xs font-bold text-slate-600">{vc.technology}</span>
                            </div>
                        )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                     <div className="text-sm font-bold text-slate-900">
                        {accessType === 'free' ? (
                            <span className="text-emerald-500 uppercase tracking-widest text-[10px]">Gratis</span>
                        ) : accessType === 'paid' ? (
                            formatPrice(vc.price, vc.currency)
                        ) : (
                            <span className="text-blue-600 uppercase tracking-widest text-[10px]">Incluida en Curso</span>
                        )}
                     </div>
                     
                     <Link href={`/courses/${vc.courseId}`}>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="rounded-xl font-bold gap-2 text-blue-600 hover:bg-blue-50"
                        >
                            Ver Detalles
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                     </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Box */}
        <section className="mt-20 p-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
                <Sparkles className="h-64 w-64 text-white" />
            </div>
            <div className="relative z-10 max-w-2xl space-y-6">
                <Badge className="bg-white/20 text-white border-none rounded-lg font-bold">¿CÓMO FUNCIONA?</Badge>
                <h3 className="text-3xl font-headline font-bold">Reserva tu lugar en las mejores sesiones</h3>
                <p className="text-blue-100 text-lg leading-relaxed">
                    Las clases marcadas como <strong>Libres</strong> están abiertas a toda la comunidad. 
                    Las <strong>Masterclasses</strong> requieren un ticket individual, y las de <strong>Curso</strong> son exclusivas para inscritos.
                </p>
                <div className="flex gap-4 pt-2">
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/20">
                        <Ticket className="h-5 w-5 text-amber-300" />
                        <span className="text-sm font-bold underline">Tickets individuales</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/20">
                        <Clock className="h-5 w-5 text-blue-200" />
                        <span className="text-sm font-bold underline">Grabaciones vitalicias</span>
                    </div>
                </div>
            </div>
        </section>
      </main>
    </div>
  );
}
