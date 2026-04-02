'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { 
  useCollection, 
  useFirestore, 
  useUser, 
  useDoc, 
  useMemoFirebase 
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { 
  Mic2, 
  Search, 
  Play, 
  Lock, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Headphones,
  Music4
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PodcastPlayer } from '@/components/podcasts/PodcastPlayer';
import { Youtube, Music2, Share2, Video } from 'lucide-react';
import Link from 'next/link';
import { formatPrice } from '@/lib/currency';

export default function PodcastsPage() {
  const { user } = useUser();
  const db = useFirestore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [selectedPodcast, setSelectedPodcast] = useState<any>(null);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  
  const handleSelectPodcast = (podcast: any) => {
    setSelectedPodcast(podcast);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const podcastsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return collection(db, 'podcasts');
  }, [db]);
  const { data: podcasts, isLoading } = useCollection(podcastsQuery);

  useEffect(() => {
    if (typeof window !== 'undefined' && podcasts && podcasts.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const playId = urlParams.get('playId');
      if (playId) {
        const p = podcasts.find((p: any) => p.id === playId);
        if (p) {
            setSelectedPodcast(p);
            setTimeout(() => {
                window.history.replaceState({}, '', '/podcasts');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
        }
      }
    }
  }, [podcasts]);

  const categories = ['Todas', 'Tecnología', 'Carrera', 'Englishtech', 'Mentalidad'];

  const filteredPodcasts = (podcasts || []).filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
                          p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'Todas' || p.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPodcast = podcasts?.[0]; // Simplificación: el primero es el destacado

  const hasAccess = (podcast: any) => {
    if (!podcast) return false;
    if (podcast.isFree || profile?.role === 'admin' || profile?.isPremiumSubscriber) return true;
    return profile?.purchasedPodcasts?.includes(podcast.id);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <header className="mb-16">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-2xl text-primary text-xs font-bold uppercase tracking-widest">
                <Mic2 className="h-4 w-4" />
                Explora el Conocimiento
              </div>
              <h1 className="text-5xl font-headline font-bold text-slate-900 leading-tight">
                LearnStream <span className="text-primary italic">Podcasts</span>
              </h1>
              <p className="text-lg text-muted-foreground font-medium">
                Aprende de los mejores expertos mientras viajas, haces ejercicio o te relajas. Contenido técnico y profesional en audio.
              </p>
            </div>
            
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar episodios..." 
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
                className={`rounded-2xl h-11 px-6 font-bold transition-all ${activeCategory === cat ? 'shadow-lg shadow-primary/20 scale-105' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
               >
                 {cat}
               </Button>
             ))}
          </div>
        </header>

        {/* Featured Section / Active Player */}
        <section className="mb-20">
          {selectedPodcast ? (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
               <div className="flex items-center justify-between">
                  <h3 className="font-headline font-bold text-slate-400 text-sm uppercase tracking-widest">Reproduciendo ahora</h3>
                  <Button variant="ghost" onClick={() => setSelectedPodcast(null)} className="h-8 text-xs font-bold text-primary hover:text-primary/80">
                    Cerrar Reproductor
                  </Button>
               </div>
               <PodcastPlayer 
                podcast={selectedPodcast} 
                hasAccess={hasAccess(selectedPodcast)} 
                onPurchaseClick={() => {
                    // Lógica para redirigir al checkout
                }}
               />
            </div>
          ) : featuredPodcast && (
            <div className="relative rounded-[3.5rem] overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent z-10" />
               <img 
                src={featuredPodcast.thumbnailUrl || "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&q=80&w=1200"} 
                alt="" 
                className="w-full h-[450px] object-cover group-hover:scale-105 transition-transform duration-1000"
               />
               <div className="absolute inset-0 z-20 flex flex-col justify-center p-12 md:p-20 max-w-3xl space-y-6">
                  <Badge className="w-fit bg-primary hover:bg-primary border-none rounded-lg font-bold">RECOMENDADO</Badge>
                  <h2 className="text-4xl md:text-6xl font-headline font-bold text-white leading-tight">
                    {featuredPodcast.title}
                  </h2>
                  <p className="text-slate-300 text-lg line-clamp-2 italic">
                    "{featuredPodcast.description}"
                  </p>
                  <div className="flex items-center gap-6 pt-4">
                    <Button 
                        size="lg" 
                        onClick={() => handleSelectPodcast(featuredPodcast)}
                        className="rounded-2xl h-16 px-10 gap-3 text-lg font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-2xl transition-all hover:translate-y-[-2px] active:translate-y-0"
                    >
                        <Play className="h-6 w-6 fill-current" /> Reproducir Ahora
                    </Button>
                    <div className="flex flex-col text-white/60">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Duración</span>
                        <span className="text-sm font-bold flex items-center gap-2">
                            <Clock className="h-4 w-4" /> {featuredPodcast.duration || '45 min'}
                        </span>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </section>

        {/* Catalog Grid */}
        <section className="space-y-10">
           <div className="flex items-center justify-between">
              <h2 className="text-3xl font-headline font-bold text-slate-900 flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-primary" />
                Episodios Recientes
              </h2>
           </div>

           {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1,2,3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-[2.5rem] animate-pulse" />)}
             </div>
           ) : filteredPodcasts.length === 0 ? (
             <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed">
                <Headphones className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-400 font-medium">No se encontraron episodios en esta categoría.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPodcasts.map(p => (
                   <div 
                    key={p.id} 
                    onClick={() => handleSelectPodcast(p)}
                    className="group bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 cursor-pointer flex flex-col gap-6"
                   >
                      <div className="relative h-48 rounded-[1.75rem] overflow-hidden bg-slate-100">
                         {p.thumbnailUrl ? (
                           <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-300">
                             <Music4 className="h-12 w-12" />
                           </div>
                         )}
                         <div className="absolute top-4 left-4 z-20">
                            {p.sourceType === 'youtube' && (
                                <div className="bg-red-600 text-white p-1.5 rounded-lg shadow-lg">
                                    <Youtube className="h-3.5 w-3.5" />
                                </div>
                            )}
                            {p.sourceType === 'anchor' && (
                                <div className="bg-emerald-500 text-white p-1.5 rounded-lg shadow-lg">
                                    <Music2 className="h-3.5 w-3.5" />
                                </div>
                            )}
                         </div>
                         <div className="absolute top-4 right-4">
                            {!hasAccess(p) && !p.isFree && (
                                <div className="bg-black/60 backdrop-blur-md p-2 rounded-xl text-white">
                                    <Lock className="h-4 w-4" />
                                </div>
                            )}
                         </div>
                         <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
                                <Play className="h-5 w-5 fill-current ml-1" />
                            </div>
                         </div>
                      </div>

                      <div className="space-y-4 flex-1">
                         <div className="flex items-center justify-between">
                            <Badge variant="outline" className="rounded-lg border-primary/20 bg-primary/5 text-primary text-[10px] font-bold uppercase">{p.category}</Badge>
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock className="h-3 w-3" /> {p.duration}</span>
                         </div>
                         <h4 className="text-xl font-headline font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">{p.title}</h4>
                         <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed font-medium">{p.description}</p>
                      </div>

                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                         <div className="text-sm font-bold text-slate-900">
                            {p.isFree ? <span className="text-emerald-500 uppercase tracking-widest text-[10px]">Gratis</span> : formatPrice(p.price, p.currency)}
                         </div>
                         <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                   </div>
                ))}
             </div>
           )}
        </section>

        {/* CTA Section */}
        {!profile?.isPremiumSubscriber && (
            <section className="mt-32 p-12 md:p-20 bg-slate-900 rounded-[4rem] text-center space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <Headphones className="h-64 w-64 text-white" />
                </div>
                <h3 className="text-3xl md:text-5xl font-headline font-bold text-white relative z-10">Subscríbete para descargar todo</h3>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto relative z-10">
                    Únete a LearnStream Premium y obtén descarga ilimitada de todos los podcasts, lecciones en video y retos interactivos.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
                    <Link href="/checkout">
                        <Button className="rounded-2xl h-16 px-10 text-lg font-bold bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">
                            Mejorar a Premium
                        </Button>
                    </Link>
                    <Link href="/checkout?academy=true">
                        <Button variant="outline" className="rounded-2xl h-16 px-10 text-lg font-bold border-white/10 text-white hover:bg-white/5">
                            Ver Planes Mensuales
                        </Button>
                    </Link>
                </div>
            </section>
        )}
      </main>
    </div>
  );
}
