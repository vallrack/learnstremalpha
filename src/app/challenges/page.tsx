
'use client';

import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Code2, Terminal, ArrowRight, Loader2, Sparkles, Layout, Lock, Unlock, LogIn, EyeOff, HelpCircle, MessageSquare, Gamepad2, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, doc, where } from 'firebase/firestore';
import Link from 'next/link';
import { useState, useMemo } from 'react';

export default function ChallengesCataloguePage() {
  const db = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  const isAdmin = profile?.role === 'admin';

  // Solo traemos los retos públicos para el catálogo
  const challengesQuery = useMemoFirebase(() => {
    if (!db) return null;
    // Si es admin, puede ver todo para auditar, si no solo públicos
    if (isAdmin) {
      return collection(db, 'coding_challenges');
    }
    return query(collection(db, 'coding_challenges'), where('visibility', '==', 'public'));
  }, [db, isAdmin]);

  const { data: allChallenges, isLoading: isChallengesLoading } = useCollection(challengesQuery);

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Principiante': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'Intermedio': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'Avanzado': return 'bg-rose-500/10 text-rose-600 border-rose-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const filteredChallenges = useMemo(() => {
    if (!allChallenges) return [];
    return allChallenges.filter(challenge => 
      !searchTerm || 
      challenge.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      challenge.technology?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allChallenges, searchTerm]);

  const groupedChallenges = useMemo(() => {
    return filteredChallenges.reduce((acc, challenge) => {
      const tech = challenge.technology || 'Otros';
      if (!acc[tech]) acc[tech] = [];
      acc[tech].push(challenge);
      return acc;
    }, {} as Record<string, any[]>);
  }, [filteredChallenges]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-16 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6">
            <Sparkles className="h-4 w-4" />
            Supera tus límites técnicos
          </div>
          <h1 className="text-4xl md:text-6xl font-headline font-bold mb-6 text-foreground tracking-tight">Desafíos de Código & IA</h1>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            Actividades interactivas evaluadas por IA. Sube de nivel, gana insignias y construye un portfolio que enamore a las empresas.
          </p>
          
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Busca por lenguaje, tecnología o tema..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 rounded-2xl shadow-sm border-muted-foreground/20 focus:ring-primary bg-white text-lg" 
            />
          </div>
        </header>

        {/* Featured Interview Challenge */}
        <section className="mb-16">
          <Card className="rounded-[3rem] border-none shadow-2xl bg-slate-900 text-white overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-opacity">
               <MessageSquare className="h-40 w-40" />
            </div>
            <CardContent className="p-10 md:p-16 relative z-10">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-black uppercase tracking-widest border border-primary/30">
                       <Zap className="h-3.5 w-3.5 fill-current" />
                       Novedad: Voice-to-Voice
                    </div>
                    <h2 className="text-4xl md:text-5xl font-headline font-bold leading-tight">Mock Interviews de Alta Complejidad</h2>
                    <p className="text-slate-400 text-lg leading-relaxed font-medium">
                      Habla con nuestra IA en tiempo real. Entrena tu inglés técnico y prepárate para las preguntas más difíciles de la industria con feedback instantáneo.
                    </p>
                    <div className="flex flex-wrap gap-4 pt-2">
                       <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700 rounded-xl px-3 py-1.5">Español & English</Badge>
                       <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700 rounded-xl px-3 py-1.5">+100 XP por sesión</Badge>
                    </div>
                  </div>
                  <div className="flex justify-center lg:justify-end">
                     <Link href="/challenges/interview">
                        <Button className="h-20 px-12 rounded-[2rem] text-xl font-black bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/40 gap-4 group-hover:scale-105 transition-transform">
                          Probar Entrevista IA
                          <ArrowRight className="h-6 w-6" />
                        </Button>
                     </Link>
                  </div>
               </div>
            </CardContent>
          </Card>
        </section>

        {isChallengesLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-medium text-muted-foreground">Cargando retos...</p>
          </div>
        ) : filteredChallenges.length > 0 ? (
          <div className="space-y-20">
            {(Object.entries(groupedChallenges) as [string, any[]][]).map(([tech, techChallenges]) => (
              <section key={tech}>
                <div className="flex items-center gap-4 mb-8 border-b pb-4 border-slate-200">
                  <div className="bg-primary p-2.5 rounded-2xl shadow-lg shadow-primary/20">
                    <Terminal className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-headline font-bold text-foreground">{tech}</h2>
                    <p className="text-sm text-muted-foreground">{techChallenges.length} {techChallenges.length === 1 ? 'actividad disponible' : 'actividades disponibles'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {techChallenges.map((challenge: any) => (
                    <Card key={challenge.id} className="group rounded-[2.5rem] overflow-hidden border-slate-200 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 flex flex-col bg-white relative">
                      <CardHeader className="p-8 pb-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`p-2 rounded-xl ${challenge.type === 'quiz' ? 'bg-amber-100 text-amber-600' : challenge.type === 'interview' ? 'bg-blue-100 text-blue-600' : challenge.type === 'wordsearch' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                            {challenge.type === 'quiz' ? <HelpCircle className="h-5 w-5" /> : challenge.type === 'interview' ? <MessageSquare className="h-5 w-5" /> : challenge.type === 'wordsearch' ? <Gamepad2 className="h-5 w-5" /> : <Terminal className="h-5 w-5" />}
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline" className={`rounded-xl border ${getDifficultyColor(challenge.difficulty)} font-bold`}>
                              {challenge.difficulty}
                            </Badge>
                            {challenge.isFree ? (
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-xl"><Unlock className="h-3 w-3 mr-1" /> Libre</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-amber-100 rounded-xl"><Lock className="h-3 w-3 mr-1" /> Premium</Badge>
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-2xl font-headline font-bold line-clamp-2 group-hover:text-primary transition-colors text-slate-900 leading-tight">
                          {challenge.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 pt-0 flex-1">
                        <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed mb-6">
                          {challenge.description}
                        </p>
                        {isAdmin && challenge.visibility === 'private' && (
                          <div className="mt-4 p-2 bg-slate-50 rounded-lg border border-dashed flex items-center gap-2">
                            <EyeOff className="h-3 w-3 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Visible solo para admin (Privado)</span>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="p-8 pt-0 mt-auto">
                        {challenge.isFree || profile?.isPremiumSubscriber || isAdmin ? (
                          <Button className="w-full h-12 rounded-2xl gap-2 font-bold shadow-sm group-hover:shadow-md transition-all" asChild>
                            <Link href={`/challenges/${challenge.id}`}>
                              Empezar Actividad
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="outline" className="w-full h-12 rounded-2xl gap-2 font-bold border-amber-200 text-amber-600 hover:bg-amber-50 shadow-sm" asChild>
                            <Link href="/checkout">
                              <Lock className="h-4 w-4" />
                              Mejorar a Premium
                            </Link>
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
            <Terminal className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold text-xl">No encontramos retos que coincidan con tu búsqueda.</p>
            <Button variant="link" onClick={() => setSearchTerm('')} className="text-primary font-bold">Ver todo el catálogo</Button>
          </div>
        )}
      </main>
    </div>
  );
}
