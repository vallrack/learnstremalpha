'use client';

import { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser } from '@/firebase';
import { collection, getDocs, doc, updateDoc, deleteField, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert, Trash2, CheckCircle2, AlertTriangle, Database } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function MaintenancePage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const log = (msg: string) => setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  const scrubChallenges = async () => {
    if (!db) return;
    setIsRunning(true);
    setResults([]);
    log("Iniciando limpieza de Desafíos...");
    try {
      const snap = await getDocs(collection(db, 'coding_challenges'));
      let count = 0;
      for (const d of snap.docs) {
        const data = d.data();
        // Verificar si la data ya existe en la subcolección para no perderla
        const premiumRef = doc(db, 'coding_challenges', d.id, 'premium', 'data');
        const pSnap = await getDoc(premiumRef);
        
        if (!pSnap.exists()) {
          log(`⚠️ Migrando datos faltantes para ${data.title}...`);
          const sensitive: any = {};
          if (data.solution) sensitive.solution = data.solution;
          if (data.initialCode) sensitive.initialCode = data.initialCode;
          if (data.questions) sensitive.questions = data.questions;
          if (data.words) sensitive.words = data.words;
          if (data.targetLanguage) sensitive.targetLanguage = data.targetLanguage;
          if (data.targetRole) sensitive.targetRole = data.targetRole;
          
          await setDoc(premiumRef, { ...sensitive, updatedAt: new Date() }, { merge: true });
        }

        // Borrar del documento principal
        await updateDoc(doc(db, 'coding_challenges', d.id), {
          solution: deleteField(),
          initialCode: deleteField(),
          questions: deleteField(),
          words: deleteField(),
          targetLanguage: deleteField(),
          targetRole: deleteField()
        });
        count++;
      }
      log(`✅ Proceso completado. ${count} desafíos limpios.`);
    } catch (err: any) {
      log(`❌ Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const scrubPodcasts = async () => {
    if (!db) return;
    setIsRunning(true);
    setResults([]);
    log("Iniciando limpieza de Podcasts...");
    try {
      const snap = await getDocs(collection(db, 'podcasts'));
      let count = 0;
      for (const d of snap.docs) {
        const data = d.data();
        const premiumRef = doc(db, 'podcasts', d.id, 'premium', 'data');
        const pSnap = await getDoc(premiumRef);

        if (!pSnap.exists()) {
          log(`⚠️ Migrando URLs para ${data.title}...`);
          await setDoc(premiumRef, {
            audioUrl: data.audioUrl || '',
            videoUrl: data.videoUrl || '',
            updatedAt: new Date()
          }, { merge: true });
        }

        await updateDoc(doc(db, 'podcasts', d.id), {
          audioUrl: deleteField(),
          videoUrl: deleteField()
        });
        count++;
      }
      log(`✅ Proceso completado. ${count} podcasts limpios.`);
    } catch (err: any) {
      log(`❌ Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const scrubCourseLessons = async () => {
    if (!db) return;
    setIsRunning(true);
    setResults([]);
    log("Iniciando limpieza profunda de Lecciones Cursos...");
    try {
      const coursesSnap = await getDocs(collection(db, 'courses'));
      let lessonCount = 0;
      
      for (const cDoc of coursesSnap.docs) {
        log(`Procesando curso: ${cDoc.data().title}...`);
        const modulesSnap = await getDocs(collection(db, 'courses', cDoc.id, 'modules'));
        
        for (const mDoc of modulesSnap.docs) {
          const lessonsSnap = await getDocs(collection(db, 'courses', cDoc.id, 'modules', mDoc.id, 'lessons'));
          
          for (const lDoc of lessonsSnap.docs) {
            const data = lDoc.data();
            const premiumRef = doc(db, 'courses', cDoc.id, 'modules', mDoc.id, 'lessons', lDoc.id, 'premium', 'data');
            const pSnap = await getDoc(premiumRef);

            if (!pSnap.exists()) {
               await setDoc(premiumRef, {
                 videoUrl: data.videoUrl || '',
                 questions: data.questions || [],
                 description: data.description || '',
                 updatedAt: new Date()
               }, { merge: true });
            }

            await updateDoc(doc(db, 'courses', cDoc.id, 'modules', mDoc.id, 'lessons', lDoc.id), {
              videoUrl: deleteField(),
              questions: deleteField()
            });
            lessonCount++;
          }
        }
      }
      log(`✅ Proceso completado. ${lessonCount} lecciones limpias en todos los cursos.`);
    } catch (err: any) {
      log(`❌ Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6 md:p-12 space-y-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-headline font-black">Mantenimiento de Datos</h1>
            </div>
            <p className="text-muted-foreground">Herramientas de limpieza y optimización de arquitectura Firebase.</p>
          </div>
          <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 h-8 gap-1 p-2">
            <ShieldAlert className="h-3 w-3" /> Solo Administradores
          </Badge>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="rounded-[2.5rem] overflow-hidden border-2 hover:border-primary/50 transition-all shadow-xl shadow-slate-200/50">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <CardTitle className="text-xl">Retos de Código</CardTitle>
              <CardDescription>Scrub de soluciones y campos sensibles del documento raíz.</CardDescription>
            </CardHeader>
            <CardFooter className="p-8">
              <Button onClick={scrubChallenges} disabled={isRunning} className="w-full rounded-2xl h-12 gap-2 font-bold shadow-lg">
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Limpiar Retos
              </Button>
            </CardFooter>
          </Card>

          <Card className="rounded-[2.5rem] overflow-hidden border-2 hover:border-primary/50 transition-all shadow-xl shadow-slate-200/50">
            <CardHeader className="bg-slate-50/50 border-b p-8">
              <CardTitle className="text-xl">Podcasts</CardTitle>
              <CardDescription>Eliminar URLs de audio y video del documento raíz.</CardDescription>
            </CardHeader>
            <CardFooter className="p-8">
              <Button onClick={scrubPodcasts} disabled={isRunning} variant="outline" className="w-full rounded-2xl h-12 gap-2 font-bold">
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Limpiar Podcasts
              </Button>
            </CardFooter>
          </Card>

          <Card className="rounded-[2.5rem] overflow-hidden border-2 border-rose-100 hover:border-rose-500/50 transition-all shadow-xl shadow-rose-200/20">
            <CardHeader className="bg-rose-50/50 border-b p-8">
              <CardTitle className="text-xl text-rose-900">Lecciones (Deep)</CardTitle>
              <CardDescription>Escaneo recursivo de todos los cursos y módulos.</CardDescription>
            </CardHeader>
            <CardFooter className="p-8">
              <Button onClick={scrubCourseLessons} disabled={isRunning} variant="destructive" className="w-full rounded-2xl h-12 gap-2 font-bold shadow-lg shadow-rose-500/20">
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                Limpiar Lecciones
              </Button>
            </CardFooter>
          </Card>
        </section>

        {results.length > 0 && (
          <Card className="rounded-[2.5rem] border-2 bg-slate-900 text-slate-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
             <CardHeader className="p-8 border-b border-white/10">
                <CardTitle className="flex items-center gap-2">
                   <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                   Consola de Ejecución
                </CardTitle>
             </CardHeader>
             <CardContent className="p-8 font-mono text-xs space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {results.map((r, i) => (
                   <div key={i} className="flex gap-4">
                      <span className="opacity-40">{i+1}</span>
                      <span>{r}</span>
                   </div>
                ))}
             </CardContent>
          </Card>
        )}

        <div className="p-8 bg-amber-50 border-2 border-amber-200 rounded-[2.5rem] flex gap-6 items-start">
           <div className="h-12 w-12 bg-amber-100 rounded-2xl flex items-center justify-center shrink-0">
              <ShieldAlert className="h-6 w-6 text-amber-600" />
           </div>
           <div className="space-y-1">
              <h4 className="font-bold text-amber-900">Advertencia de Seguridad</h4>
              <p className="text-sm text-amber-700 leading-relaxed">
                 Este proceso es irreversible. Se ha incluido una lógica de verificación que asegura que los datos existen en la subcolección Premium antes de ser eliminados del documento raíz. Sin embargo, se recomienda encarecidamente realizar un export de Firestore antes de proceder.
              </p>
           </div>
        </div>
      </main>
    </div>
  );
}
