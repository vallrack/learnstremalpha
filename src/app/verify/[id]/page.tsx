'use client';

import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, XCircle, Loader2, Calendar, Award, User, ChevronLeft } from 'lucide-react';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function VerifyCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const certId = params.id as string;
  const db = useFirestore();
  
  const [loading, setLoading] = useState(true);
  const [certData, setCertData] = useState<any>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!db || !certId) return;
    
    const verifyDocument = async () => {
      try {
        const docRef = doc(db, 'certificates', certId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().isValid !== false) {
          setCertData(docSnap.data());
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Error verifying certificate:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    verifyDocument();
  }, [db, certId]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 py-20 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl translate-y-1/2" />
        
        <div className="w-full max-w-lg z-10 space-y-6">
          <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver a LearnStream
          </Button>

          <Card className="rounded-[2rem] border-none shadow-2xl overflow-hidden bg-white">
            {loading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium animate-pulse">Verificando en blockchain criptográfica...</p>
              </div>
            ) : error || !certData ? (
              <div className="p-12 text-center space-y-6">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2 animate-in zoom-in duration-500">
                  <XCircle className="h-12 w-12 text-red-500" />
                </div>
                <h1 className="text-3xl font-headline font-bold text-slate-900">Certificado No Encontrado</h1>
                <p className="text-slate-600 leading-relaxed">
                  El código de identificación <strong>{certId}</strong> no corresponde a ninguna certificación oficial válida emitida por nuestra institución.
                </p>
                <div className="pt-4">
                  <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 px-4 py-2 text-sm">
                    Estado: Inválido o Falsificado
                  </Badge>
                </div>
              </div>
            ) : (
              <div>
                <div className="bg-emerald-500 p-8 text-center text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 opacity-10">
                    <ShieldCheck className="w-48 h-48 -translate-y-1/4 translate-x-1/4" />
                  </div>
                  <div className="relative z-10">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-white/50 shadow-lg animate-in zoom-in duration-500">
                      <ShieldCheck className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-headline font-extrabold mb-2">Credencial Válida</h1>
                    <p className="text-emerald-50 font-medium">Emitida oficialmente por LearnStream</p>
                  </div>
                </div>

                <CardContent className="p-8 space-y-8">
                  <div className="text-center space-y-2 border-b border-slate-100 pb-6">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Estudiante Certificado</p>
                    <h2 className="text-4xl font-headline font-black text-slate-900">{certData.studentName}</h2>
                  </div>

                  <div className="space-y-5">
                    <div className="flex gap-4 items-start">
                      <div className="bg-primary/10 p-3 rounded-2xl text-primary shrink-0">
                        <Award className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Programa</p>
                        <p className="text-lg font-bold text-slate-900 leading-tight">{certData.courseTitle}</p>
                        <Badge variant="secondary" className="mt-2 bg-slate-100">{certData.technology || 'Desarrollo'}</Badge>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start">
                      <div className="bg-amber-100 p-3 rounded-2xl text-amber-600 shrink-0">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Instructor</p>
                        <p className="font-medium text-slate-800">{certData.instructorName || 'Equipo LearnStream'}</p>
                      </div>
                    </div>

                    <div className="flex gap-4 items-start">
                      <div className="bg-slate-100 p-3 rounded-2xl text-slate-600 shrink-0">
                        <Calendar className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Fecha de Emisión</p>
                        <p className="font-medium text-slate-800">
                          {certData.issuedAt?.toDate ? new Date(certData.issuedAt.toDate()).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border">
                    <div className="text-xs text-slate-500 font-mono">
                      ID: {certId}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <ShieldCheck className="h-4 w-4" /> Auténtico
                    </div>
                  </div>
                </CardContent>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
