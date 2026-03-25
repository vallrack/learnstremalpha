
'use client';

import { Navbar } from '@/components/layout/Navbar';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Trophy, Medal, Star, Target, Zap, Crown, Award, User, ChevronRight, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/use-translation';

export default function LeaderboardPage() {
  const db = useFirestore();
  const { t } = useTranslation();

  const leaderboardQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, 'users'),
      orderBy('xp', 'desc'),
      limit(50)
    );
  }, [db]);

  const { data: topUsers, isLoading } = useCollection(leaderboardQuery);

  const top3 = topUsers?.slice(0, 3) || [];
  const theRest = topUsers?.slice(3) || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
        <header className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] uppercase tracking-widest font-black border border-amber-500/20">
             <Trophy className="h-3.5 w-3.5" />
             {t.leaderboard.top3Title}
          </div>
          <h1 className="text-4xl lg:text-6xl font-headline font-extrabold text-slate-900 tracking-tight">
            {t.leaderboard.title}
          </h1>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
            {t.leaderboard.subtitle}
          </p>
        </header>

        {isLoading ? (
          <div className="space-y-8 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               {[1,2,3].map(i => <div key={i} className="h-64 bg-white rounded-[3rem] border shadow-sm" />)}
            </div>
            <div className="h-96 bg-white rounded-[3rem] border shadow-sm" />
          </div>
        ) : (
          <div className="space-y-16">
            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
              {/* Silver - Rank 2 */}
              {top3[1] && (
                <div className="order-2 md:order-1 flex flex-col items-center">
                  <LeaderboardCard user={top3[1]} rank={2} variant="silver" />
                </div>
              )}
              
              {/* Gold - Rank 1 */}
              {top3[0] && (
                <div className="order-1 md:order-2 flex flex-col items-center">
                  <LeaderboardCard user={top3[0]} rank={1} variant="gold" />
                </div>
              )}

              {/* Bronze - Rank 3 */}
              {top3[2] && (
                <div className="order-3 flex flex-col items-center">
                  <LeaderboardCard user={top3[2]} rank={3} variant="bronze" />
                </div>
              )}
            </div>

            {/* List Table */}
            <div className="bg-white rounded-[3rem] shadow-2xl border overflow-hidden">
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50 border-b">
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">{t.leaderboard.rank}</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">{t.leaderboard.student}</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">{t.leaderboard.level}</th>
                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono text-right">{t.leaderboard.xp}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {theRest.map((user, index) => (
                        <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <span className="text-xl font-headline font-black text-slate-300 group-hover:text-primary transition-colors">#{index + 4}</span>
                          </td>
                          <td className="px-8 py-6">
                            <Link href={`/u/${user.id}`} className="flex items-center gap-4 group/item">
                              <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-sm ring-1 ring-slate-100">
                                {user.photoURL ? (
                                  <Image src={user.photoURL} alt={user.displayName} width={48} height={48} className="object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">
                                    {user.displayName?.[0] || '?'}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 group-hover/item:text-primary transition-colors">{user.displayName || 'Estudiante'}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">IA Verified Learner</p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-2">
                               <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-600">NV {Math.floor(Math.sqrt((user.xp || 0) / 100)) + 1}</div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                             <span className="text-lg font-headline font-black text-slate-900">{user.xp || 0}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function LeaderboardCard({ user, rank, variant }: { user: any, rank: number, variant: 'gold' | 'silver' | 'bronze' }) {
    const level = Math.floor(Math.sqrt((user.xp || 0) / 100)) + 1;
    
    const colors = {
      gold: {
        bg: 'bg-gradient-to-br from-amber-400 via-amber-200 to-amber-500',
        ring: 'ring-amber-200',
        border: 'border-amber-200',
        text: 'text-amber-600',
        badgeBg: 'bg-amber-100',
        icon: <Crown className="h-10 w-10 text-amber-500" />
      },
      silver: {
        bg: 'bg-gradient-to-br from-slate-300 via-slate-100 to-slate-400',
        ring: 'ring-slate-100',
        border: 'border-slate-100',
        text: 'text-slate-600',
        badgeBg: 'bg-slate-100',
        icon: <Medal className="h-8 w-8 text-slate-400" />
      },
      bronze: {
        bg: 'bg-gradient-to-br from-orange-400 via-orange-100 to-orange-500',
        ring: 'ring-orange-100',
        border: 'border-orange-100',
        text: 'text-orange-600',
        badgeBg: 'bg-orange-100',
        icon: <Award className="h-8 w-8 text-orange-500" />
      }
    };

    const c = colors[variant];

    return (
      <Link href={`/u/${user.id}`} className={`w-full max-w-[300px] bg-white rounded-[3rem] border transition-all hover:scale-[1.03] hover:shadow-2xl flex flex-col items-center p-8 relative overflow-hidden group shadow-xl ${rank === 1 ? 'md:scale-110 md:pb-12 z-10' : ''}`}>
         {/* Rank Badge */}
         <div className={`absolute top-6 left-6 w-12 h-12 rounded-2xl flex items-center justify-center font-headline font-black text-2xl shadow-inner ${c.bg} ${c.text}`}>
            {rank}
         </div>

         <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity ${c.text}`}>
            <TrendingUp className="h-24 w-24" />
         </div>

         <div className={`w-32 h-32 rounded-full p-1 mb-6 relative z-10 ${c.bg} shadow-2xl`}>
            <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-slate-200 relative">
               {user.photoURL ? (
                 <Image src={user.photoURL} alt={user.displayName} fill className="object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-400">
                    {user.displayName?.[0] || '?'}
                 </div>
               )}
            </div>
            
            <div className="absolute -bottom-2 -right-2 bg-white rounded-2xl shadow-lg border p-2">
                {c.icon}
            </div>
         </div>

         <div className="text-center relative z-10 space-y-2 mb-6">
            <h3 className="text-xl font-headline font-black text-slate-900 truncate max-w-[200px]">{user.displayName || 'Estudiante'}</h3>
            <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${c.badgeBg} ${c.text}`}>
               Nivel de Programador {level}
            </div>
         </div>

         <div className="w-full mt-auto relative z-10">
            <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center group-hover:bg-primary group-hover:text-white transition-colors duration-500 shadow-inner border">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Puntos Totales</span>
                <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-amber-500 fill-amber-500 group-hover:text-white group-hover:fill-white" />
                    <span className="text-2xl font-headline font-black">{user.xp || 0}</span>
                </div>
            </div>
         </div>
      </Link>
    );
}
