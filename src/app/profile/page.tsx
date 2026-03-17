
'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { User, CreditCard, Shield, Crown, CheckCircle, Loader2, Save, UserCircle, ShieldAlert, Code2, Award, Terminal, Star, ExternalLink, Share2, Copy } from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  
  const { data: profile, isLoading: isProfileLoading } = useDoc(profileRef);

  const submissionsQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, 'users', user.uid, 'challenge_submissions'), orderBy('submittedAt', 'desc'));
  }, [db, user?.uid]);
  const { data: submissions } = useCollection(submissionsQuery);
  
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
    }
  }, [profile]);

  const handleUpdateProfile = () => {
    if (!db || !user?.uid || !displayName.trim()) return;
    
    setSaving(true);
    updateDocumentNonBlocking(doc(db, 'users', user.uid), {
      displayName: displayName.trim()
    });
    
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Perfil actualizado", description: "Tu nombre ha sido guardado correctamente." });
    }, 500);
  };

  const copyPortfolioLink = () => {
    if (!user?.uid) return;
    const link = `${window.location.origin}/p/${user.uid}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "¡Enlace copiado!",
      description: "Ya puedes compartir tu portfolio con reclutadores.",
    });
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col"><Navbar /><main className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main></div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-12 flex flex-col md:flex-row items-center gap-8 bg-white p-10 rounded-[3rem] border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-5"><Terminal className="h-40 w-40" /></div>
          <Avatar className="h-40 w-40 border-8 border-white shadow-2xl">
            <AvatarImage src={profile?.profileImageUrl} />
            <AvatarFallback className="bg-primary/10 text-primary text-5xl font-bold">{displayName?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="text-center md:text-left flex-1 space-y-4 relative z-10">
            <div>
              <h1 className="text-5xl font-headline font-bold text-slate-900">{displayName || 'Estudiante'}</h1>
              <p className="text-lg text-muted-foreground font-medium">{user?.email}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <Badge className="bg-primary/10 text-primary border-primary/20 rounded-xl px-4 py-1.5 font-bold h-auto">Nivel {Math.floor((profile?.xp || 0) / 1000) + 1}</Badge>
              {profile?.isPremiumSubscriber ? (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1 rounded-xl px-4 py-1.5 font-bold h-auto"><Crown className="h-3.5 w-3.5" /> Miembro Premium</Badge>
              ) : (
                <Badge variant="outline" className="text-slate-500 rounded-xl px-4 py-1.5 font-bold h-auto">Cuenta Estándar</Badge>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <Button onClick={copyPortfolioLink} className="rounded-2xl h-14 px-8 gap-3 font-bold shadow-xl shadow-primary/20">
              <Share2 className="h-5 w-5" />
              Compartir Portfolio
            </Button>
          </div>
        </header>

        <Tabs defaultValue="portfolio" className="space-y-8">
          <TabsList className="bg-slate-200/50 p-1.5 rounded-2xl w-full md:w-fit">
            <TabsTrigger value="portfolio" className="rounded-xl gap-2 px-6 h-11 font-bold"><Terminal className="h-4 w-4" /> Portfolio Técnico</TabsTrigger>
            <TabsTrigger value="account" className="rounded-xl gap-2 px-6 h-11 font-bold"><User className="h-4 w-4" /> Mi Perfil</TabsTrigger>
            <TabsTrigger value="subscription" className="rounded-xl gap-2 px-6 h-11 font-bold"><CreditCard className="h-4 w-4" /> Planes</TabsTrigger>
          </TabsList>

          <TabsContent value="portfolio" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {submissions?.map((sub) => (
                <Card key={sub.id} className="rounded-[2rem] border-none shadow-sm bg-white overflow-hidden group hover:shadow-xl transition-all">
                  <CardHeader className="p-6 bg-slate-50 border-b">
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-white rounded-xl border shadow-sm"><Code2 className="h-5 w-5 text-primary" /></div>
                      <Badge className={sub.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                        {sub.passed ? 'APROBADO' : 'PENDIENTE'}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-headline font-bold line-clamp-1">{sub.challengeTitle}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Calificación IA</span>
                      <span className="font-bold text-lg">{sub.score}/5.0</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 italic">"{sub.feedback}"</p>
                  </CardContent>
                  <CardFooter className="p-6 pt-0">
                    <Button variant="outline" className="w-full rounded-xl gap-2 text-xs font-bold group-hover:bg-primary group-hover:text-white" asChild>
                      <Link href={`/challenges/${sub.challengeId}`}><ExternalLink className="h-3 w-3" /> Ver Código</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              {(!submissions || submissions.length === 0) && (
                <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-4 border-dashed">
                   <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                   <p className="text-muted-foreground font-bold">Aún no tienes proyectos en tu portfolio.</p>
                   <p className="text-sm text-muted-foreground mb-6">Completa desafíos de código para demostrar tu talento.</p>
                   <Link href="/challenges"><Button className="rounded-xl font-bold">Ver Catálogo de Retos</Button></Link>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="account">
            <Card className="rounded-[2.5rem] overflow-hidden border-none shadow-sm bg-white">
              <CardHeader className="bg-slate-50 p-8">
                <CardTitle className="text-2xl font-headline font-bold">Ajustes Personales</CardTitle>
                <CardDescription>Esta información es la que verán los reclutadores en tu portfolio público.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-bold uppercase text-[10px] text-muted-foreground tracking-widest">Nombre Completo</Label>
                      <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="rounded-xl h-12" placeholder="Tu nombre real..." />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold uppercase text-[10px] text-muted-foreground tracking-widest">Email Académico</Label>
                      <Input value={user?.email || ''} disabled className="rounded-xl h-12 bg-slate-50 opacity-60" />
                    </div>
                    <div className="pt-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                       <p className="text-xs font-bold text-primary mb-2 flex items-center gap-2"><Share2 className="h-3 w-3" /> Tu Enlace Público:</p>
                       <div className="flex gap-2">
                         <Input value={`${window.location.origin}/p/${user?.uid}`} readOnly className="h-9 text-[10px] rounded-lg bg-white" />
                         <Button size="icon" variant="outline" onClick={copyPortfolioLink} className="h-9 w-9 rounded-lg"><Copy className="h-3 w-3" /></Button>
                       </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Estado de Progresión</h4>
                    <div className="flex justify-between items-end">
                       <span className="text-4xl font-bold text-primary">{profile?.xp || 0}</span>
                       <span className="text-sm font-bold text-muted-foreground uppercase">XP Totales</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-bold"><span>Nivel Actual</span><span>{Math.floor((profile?.xp || 0) / 1000) + 1}</span></div>
                      <Progress value={((profile?.xp || 0) % 1000) / 10} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-50/50 p-8 flex justify-end">
                <Button onClick={handleUpdateProfile} disabled={saving} className="rounded-xl h-12 px-8 gap-2 font-bold shadow-lg shadow-primary/20">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Actualizar Datos
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className={`rounded-[2.5rem] border-4 overflow-hidden ${profile?.isPremiumSubscriber ? 'border-amber-400 bg-amber-50/20' : 'border-slate-100'}`}>
                  <CardHeader className="p-8 pb-4">
                    <div className="flex justify-between items-center mb-4">
                      <Badge className="bg-slate-900 text-white rounded-lg">PLAN ACTUAL</Badge>
                      {profile?.isPremiumSubscriber && <Crown className="h-8 w-8 text-amber-500" />}
                    </div>
                    <CardTitle className="text-3xl font-headline font-bold">
                      {profile?.isPremiumSubscriber ? 'PRO MEMBER' : 'ESTUDIANTE'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 pt-0 space-y-6">
                    <p className="text-muted-foreground leading-relaxed">
                      {profile?.isPremiumSubscriber 
                        ? 'Tienes acceso ilimitado a todos los cursos, retos avanzados y certificaciones profesionales.' 
                        : 'Disfruta de nuestros cursos gratuitos y retos fundamentales.'}
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-2 text-sm font-medium"><CheckCircle className="h-4 w-4 text-emerald-500" /> Acceso a Retos de IA</li>
                      <li className="flex items-center gap-2 text-sm font-medium"><CheckCircle className="h-4 w-4 text-emerald-500" /> Portfolio Técnico</li>
                      {profile?.isPremiumSubscriber && (
                        <>
                          <li className="flex items-center gap-2 text-sm font-medium"><CheckCircle className="h-4 w-4 text-emerald-500" /> Certificados Profesionales</li>
                          <li className="flex items-center gap-2 text-sm font-medium"><CheckCircle className="h-4 w-4 text-emerald-500" /> Cursos de Última Tendencia</li>
                        </>
                      )}
                    </ul>
                  </CardContent>
                  {!profile?.isPremiumSubscriber && (
                    <CardFooter className="p-8 bg-slate-50">
                       <Button className="w-full h-14 rounded-2xl text-lg font-bold bg-amber-500 hover:bg-amber-600 shadow-xl shadow-amber-200">Mejorar Plan Ahora</Button>
                    </CardFooter>
                  )}
                </Card>
             </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
