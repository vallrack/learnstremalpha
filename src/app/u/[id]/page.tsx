import { adminDb } from '@/lib/firebase-admin';
import { Navbar } from '@/components/layout/Navbar';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Shield, Star, CheckCircle, Code, Terminal, Clock, Medal, Zap, LayoutDashboard, Crown } from 'lucide-react';
import Image from 'next/image';

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;

  const userDoc = await adminDb.collection('users').doc(id).get();
  
  if (!userDoc.exists) {
    return notFound();
  }

  const profile = userDoc.data() as any;

  // Obtenemos los logros (badges)
  const achievementsSnap = await adminDb.collection('users').doc(id).collection('achievements').orderBy('unlockedAt', 'desc').get();
  const achievements = achievementsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

  // Obtenemos los retos aprobados
  const submissionsSnap = await adminDb.collection('users').doc(id).collection('challenge_submissions').where('passed', '==', true).orderBy('submittedAt', 'desc').limit(15).get();
  const submissions = submissionsSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

  // Matemáticas de Gamificación
  const xp = profile.xp || 0;
  // Nivel simple: cada nivel requiere más y más XP (función cuadrática)
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const progressPercentage = Math.min(100, (xp / xpForNextLevel) * 100);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />
      
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        {/* Profile Header */}
        <div className="bg-white rounded-[3rem] p-10 flex flex-col md:flex-row items-center md:items-start gap-10 shadow-2xl border mb-12 relative overflow-hidden">
          {profile.isPremiumSubscriber && (
             <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-orange-500 text-white font-bold tracking-widest text-xs py-2 px-10 shadow-lg transform translate-x-8 translate-y-6 rotate-45 flex items-center gap-2">
                <Crown className="h-4 w-4" /> PRO
             </div>
          )}
          
          <div className="relative">
            <div className="w-40 h-40 rounded-full border-8 border-slate-50 shadow-xl overflow-hidden bg-slate-200 shrink-0 relative flex items-center justify-center">
              {profile.photoURL ? (
                <Image src={profile.photoURL} alt={profile.displayName || 'Estudiante'} fill className="object-cover" />
              ) : (
                <span className="text-6xl font-bold text-slate-400">{(profile.displayName || 'U')[0].toUpperCase()}</span>
              )}
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-blue-600 text-white font-bold px-6 py-1.5 rounded-full shadow-lg border-4 border-white flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-300" />
              Nivel {level}
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left pt-4">
            <h1 className="text-4xl md:text-5xl font-headline font-bold text-slate-900 mb-2">
              {profile.displayName || 'Estudiante Sin Nombre'}
            </h1>
            <p className="text-xl text-slate-500 font-medium mb-6">
              {profile.role === 'admin' ? 'Administrador Plataforma' : profile.role === 'instructor' ? 'Instructor Verificado' : 'Desarrollador en Formación'}
            </p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <div className="bg-indigo-50 px-5 py-3 rounded-2xl border border-indigo-100 flex items-center gap-3">
                <Star className="h-6 w-6 text-indigo-500" />
                <div>
                  <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Experiencia total</p>
                  <p className="text-xl font-headline font-bold text-slate-900">{xp} XP</p>
                </div>
              </div>
              <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-emerald-500" />
                <div>
                  <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Retos Aprobados</p>
                  <p className="text-xl font-headline font-bold text-slate-900">{submissions.length}</p>
                </div>
              </div>
              <div className="bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100 flex items-center gap-3">
                <Trophy className="h-6 w-6 text-amber-500" />
                <div>
                  <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Insignias IA</p>
                  <p className="text-xl font-headline font-bold text-slate-900">{achievements.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Columna Izquierda: Actividades Recientes */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-center gap-4">
              <div className="bg-slate-200 p-2.5 rounded-2xl"><Terminal className="h-6 w-6 text-slate-700" /></div>
              <h2 className="text-2xl font-headline font-bold text-slate-900">Retos Superados Recientemente</h2>
            </div>
            
            <div className="space-y-4">
              {submissions.length === 0 ? (
                <div className="bg-white border-2 border-dashed p-12 text-center rounded-[2.5rem]">
                  <p className="text-slate-500 font-medium">Aún no hay retos técnicos superados en el historial.</p>
                </div>
              ) : (
                submissions.map(sub => (
                  <div key={sub.id} className="bg-white p-6 rounded-[2rem] border shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center gap-6">
                    <div className="bg-emerald-100 p-4 rounded-[1.5rem] shrink-0">
                      <Code className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold font-headline text-slate-900 leading-tight mb-2">{sub.challengeTitle}</h4>
                      <p className="text-sm text-slate-500 font-medium italic">"{sub.feedback}"</p>
                    </div>
                    <div className="shrink-0 text-right md:border-l md:pl-6">
                       <Badge className="bg-emerald-500 hover:bg-emerald-600 h-8 px-4 text-sm font-bold mb-2">Score: {sub.score?.toFixed(1)}/5.0</Badge>
                       <p className="text-xs text-slate-400 font-medium flex items-center justify-end gap-1">
                         <Clock className="h-3 w-3" />
                         {sub.submittedAt?.toDate ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : 'Recientemente'}
                       </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Columna Derecha: Insignias */}
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="bg-amber-100 p-2.5 rounded-2xl"><Medal className="h-6 w-6 text-amber-600" /></div>
              <h2 className="text-2xl font-headline font-bold text-slate-900">Vitrina de Trofeos</h2>
            </div>
            
            <div className="bg-white rounded-[2.5rem] border shadow-xl p-8">
              {achievements.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                  <Shield className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Vitrina Vacía</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {achievements.map((ach) => (
                    <div key={ach.id} className="bg-slate-50 border p-4 rounded-[1.5rem] flex flex-col items-center text-center gap-3 hover:-translate-y-1 transition-transform group tooltip-trigger">
                      <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Medal className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 leading-tight">{ach.title}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">IA Validada</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
