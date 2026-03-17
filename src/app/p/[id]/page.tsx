
'use client';

import { useParams } from 'next/navigation';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Loader2, Award, Code2, Terminal, Star, Crown, ExternalLink, Trophy, CheckCircle2, UserCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import Image from 'next/image';

export default function PublicPortfolioPage() {
  const params = useParams();
  const studentId = params.id as string;
  const db = useFirestore();

  const studentRef = useMemoFirebase(() => {
    if (!db || !studentId) return null;
    return doc(db, 'users', studentId);
  }, [db, studentId]);
  const { data: student, isLoading: isStudentLoading } = useDoc(studentRef);

  const submissionsQuery = useMemoFirebase(() => {
    if (!db || !studentId) return null;
    return query(collection(db, 'users', studentId, 'challenge_submissions'), orderBy('submittedAt', 'desc'));
  }, [db, studentId]);
  const { data: submissions } = useCollection(submissionsQuery);

  const logoUrl = "https://drive.google.com/uc?export=view&id=16eSjcZhzvz1dGapFrNVFXSQ_kG4dyg0i";

  if (isStudentLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 text-center p-6 bg-[#F8FAFC]">
        <h1 className="text-2xl font-bold font-headline">Perfil no encontrado</h1>
        <p className="text-muted-foreground">Este usuario no existe o su perfil es privado.</p>
        <Link href="/"><Image src={logoUrl} alt="Logo" width={60} height={60} className="opacity-20" /></Link>
      </div>
    );
  }

  const level = Math.floor((student.xp || 0) / 1000) + 1;
  const xpInLevel = (student.xp || 0) % 1000;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header Estilo CV */}
      <header className="bg-slate-900 text-white pt-20 pb-32 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-20 opacity-5 rotate-12"><Terminal className="h-64 w-64" /></div>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8 relative z-10">
          <Avatar className="h-40 w-40 border-8 border-white/10 shadow-2xl">
            <AvatarImage src={student.profileImageUrl} />
            <AvatarFallback className="bg-primary text-white text-5xl font-bold">{student.displayName?.[0]}</AvatarFallback>
          </Avatar>
          <div className="text-center md:text-left flex-1 space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-4xl md:text-5xl font-headline font-bold">{student.displayName || 'Estudiante'}</h1>
                {student.isPremiumSubscriber && <Crown className="h-8 w-8 text-amber-400" />}
              </div>
              <p className="text-slate-400 text-lg">Talento Digital en LearnStream</p>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <Badge className="bg-primary/20 text-primary border-primary/30 px-4 py-1.5 rounded-xl font-bold">Nivel {level}</Badge>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Trophy className="h-4 w-4 text-amber-500" />
                <span className="font-bold">{student.xp || 0} XP Totales</span>
              </div>
            </div>
          </div>
          <div className="shrink-0 hidden lg:block">
             <Image src={logoUrl} alt="LearnStream" width={120} height={120} className="grayscale opacity-20" />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 -mt-16 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Stats */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-white overflow-hidden">
              <CardHeader className="bg-slate-50 border-b">
                <CardTitle className="text-xs font-bold uppercase tracking-widest text-slate-500">Progreso Académico</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Nivel {level}</span>
                    <span className="text-muted-foreground">{xpInLevel}/1000 XP</span>
                  </div>
                  <Progress value={xpInLevel / 10} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl text-center border">
                    <p className="text-2xl font-bold text-primary">{submissions?.length || 0}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Retos</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl text-center border">
                    <p className="text-2xl font-bold text-emerald-600">{submissions?.filter(s => s.passed).length || 0}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Aprobados</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white space-y-4">
               <h4 className="text-sm font-bold flex items-center gap-2">
                 <Award className="h-4 w-4 text-primary" />
                 Certificación Oficial
               </h4>
               <p className="text-xs text-slate-400 leading-relaxed">Este perfil valida las habilidades técnicas adquiridas a través de desafíos evaluados por Inteligencia Artificial en tiempo real.</p>
               <Link href="/courses">
                 <Button className="w-full rounded-xl h-10 text-xs font-bold bg-white text-slate-900 hover:bg-slate-100">Ver Catálogo LearnStream</Button>
               </Link>
            </div>
          </div>

          {/* Main Content: Submissions/Portfolio */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-2xl font-headline font-bold mb-6 flex items-center gap-3">
                <Code2 className="h-6 w-6 text-primary" />
                Proyectos y Desafíos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {submissions?.map((sub) => (
                  <Card key={sub.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden group hover:shadow-lg transition-all border border-slate-100">
                    <CardHeader className="p-6 pb-2">
                      <div className="flex justify-between items-start mb-2">
                        <Badge className={sub.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                          {sub.passed ? 'SUPERADO' : 'FALLIDO'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-bold">{new Date(sub.submittedAt?.toDate()).toLocaleDateString()}</span>
                      </div>
                      <CardTitle className="text-lg font-headline font-bold line-clamp-1">{sub.challengeTitle}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 pt-2">
                      <div className="flex items-center gap-2 mb-4">
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold">{sub.score}/5.0</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3 bg-slate-50 p-3 rounded-xl italic">
                        "{sub.feedback}"
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {(!submissions || submissions.length === 0) && (
                  <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-200">
                    <p className="text-muted-foreground font-medium italic">Este estudiante está preparando su primer gran despliegue...</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      <footer className="mt-20 text-center py-10 border-t bg-white">
        <p className="text-xs text-muted-foreground font-bold tracking-widest uppercase">Generado por LearnStream - La vida en un código</p>
      </footer>
    </div>
  );
}
