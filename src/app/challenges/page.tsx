
'use client';

import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Code2, Terminal, ArrowRight, Loader2, Sparkles, Layout } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import Link from 'next/link';

export default function ChallengesCataloguePage() {
  const db = useFirestore();

  const challengesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'coding_challenges'), orderBy('createdAt', 'desc'));
  }, [db]);

  const { data: challenges, isLoading } = useCollection(challengesQuery);

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Principiante': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'Intermedio': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'Avanzado': return 'bg-rose-500/10 text-rose-600 border-rose-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        <header className="mb-16 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-6">
            <Sparkles className="h-4 w-4" />
            Supera tus límites técnicos
          </div>
          <h1 className="text-4xl md:text-6xl font-headline font-bold mb-6">Desafíos de Código</h1>
          <p className="text-lg text-muted-foreground mb-10">
            Pon a prueba tu lógica con algoritmos o tu creatividad con retos de diseño UI/UX. 
            Aprende practicando con problemas reales del mundo del software.
          </p>
          
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Busca por lenguaje, dificultad o tema..." className="pl-12 h-14 rounded-2xl shadow-sm border-muted-foreground/20 focus:ring-primary" />
          </div>
        </header>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="font-medium text-muted-foreground">Preparando los retos...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {challenges?.map(challenge => (
              <Card key={challenge.id} className="group rounded-[2rem] overflow-hidden border-muted-foreground/10 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 flex flex-col bg-white">
                <CardHeader className="p-8 pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <Badge variant="outline" className={`rounded-xl border ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty}
                    </Badge>
                    <div className="p-2 bg-muted rounded-xl">
                      {challenge.technology.includes('HTML') || challenge.technology.includes('CSS') || challenge.technology.includes('Figma')
                        ? <Layout className="h-5 w-5 text-muted-foreground" />
                        : <Terminal className="h-5 w-5 text-muted-foreground" />
                      }
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-headline font-bold line-clamp-1 group-hover:text-primary transition-colors">
                    {challenge.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0 flex-1">
                  <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed mb-6">
                    {challenge.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="rounded-lg font-bold text-[10px] uppercase tracking-wider bg-slate-100">
                      {challenge.technology}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="p-8 pt-0 mt-auto">
                  <Button className="w-full h-12 rounded-2xl gap-2 font-bold group-hover:bg-primary transition-all shadow-lg shadow-transparent group-hover:shadow-primary/20" asChild>
                    <Link href={`/challenges/${challenge.id}`}>
                      Aceptar Desafío
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
            
            {challenges?.length === 0 && (
              <div className="col-span-full py-20 text-center bg-muted/20 rounded-[3rem] border-4 border-dashed">
                <Code2 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
                <p className="text-xl font-headline font-bold text-muted-foreground">Aún no hay desafíos disponibles.</p>
                <p className="text-muted-foreground mt-2">Nuestros instructores están preparando nuevos retos para ti.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
