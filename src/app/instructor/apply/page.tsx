
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser, useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { 
  GraduationCap, 
  Rocket, 
  DollarSign, 
  ShieldCheck, 
  ChevronRight, 
  Loader2, 
  AlertTriangle,
  Award,
  Zap
} from 'lucide-react';
import Script from 'next/script';
import Image from 'next/image';

export default function InstructorApplyPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  
  // Form state
  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');

  const LICENSE_FEE = 250000; // Valor de la licencia de creador en COP

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
    // Permitimos que el Admin vea la página para configuración/pruebas
    if (profile?.role === 'instructor') {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router, profile]);

  const handleStartApplication = () => {
    if (!specialty.trim() || !bio.trim()) {
      toast({ variant: "destructive", title: "Campos requeridos", description: "Por favor cuéntanos sobre tu experiencia." });
      return;
    }

    if (!user?.uid) {
      toast({ variant: "destructive", title: "Error de usuario", description: "Debes iniciar sesión para postularte." });
      return;
    }

    if (!(window as any).ePayco) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la pasarela de pago." });
      return;
    }

    setIsProcessing(true);

    try {
      const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;
      const handler = (window as any).ePayco.checkout.configure({
        key: publicKey,
        test: false
      });

      const data = {
        name: "Licencia de Instructor - LearnStream",
        description: "Acceso para crear y monetizar cursos en la plataforma.",
        invoice: `INST-${Date.now()}-${user?.uid.substring(0, 5)}`,
        currency: "cop",
        amount: LICENSE_FEE.toString(),
        tax_base: "0",
        tax: "0",
        country: "co",
        lang: "es",
        external: "false",
        response: `${window.location.origin}/instructor/apply/success`,
        name_billing: user?.displayName || "Postulante Instructor",
        email_billing: user?.email || "estudiante@learnstream.app",
        extra1: user?.uid,
        extra2: specialty.substring(0, 250),
        extra3: bio.substring(0, 250),
      };

      handler.open(data);
    } catch (err) {
      console.error("ePayco error:", err);
      toast({ variant: "destructive", title: "Error", description: "Hubo un problema al abrir la pasarela." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isUserLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <Script 
        src="https://checkout.epayco.co/checkout.js" 
        onLoad={() => setIsScriptLoaded(true)}
      />
      
      <main className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-10">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-bold mb-6">
                <GraduationCap className="h-4 w-4" />
                Programa de Instructores
              </div>
              <h1 className="text-5xl lg:text-6xl font-headline font-bold mb-6 text-slate-900 leading-tight">
                Convierte tu pasión en <span className="text-primary">ingresos</span>.
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Únete a nuestra red de expertos. Crea contenido de valor, ayuda a otros a crecer y obtén el 70% de cada venta generada.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { icon: Rocket, title: "Licencia de Creador", desc: "Pago único para habilitar tu panel de instructor de por vida." },
                { icon: DollarSign, title: "Revenue Share 70/30", desc: "Ganas el 70% de cada suscripción que atraigan tus cursos." },
                { icon: Zap, title: "Herramientas IA", desc: "Usa nuestra IA para evaluar desafíos y dar feedback a tus alumnos." },
                { icon: ShieldCheck, title: "Marca Personal", desc: "Te ayudamos a posicionarte como un referente en tu tecnología." }
              ].map((item, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3">
                  <div className="bg-primary/10 p-2.5 rounded-xl w-fit">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="font-bold text-slate-900">{item.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <Card className="rounded-[3rem] border-none shadow-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white p-10 text-center relative">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Award className="h-24 w-24" />
              </div>
              <CardTitle className="text-2xl font-headline font-bold">Solicitud de Instructor</CardTitle>
              <CardDescription className="text-slate-400 mt-2">
                Completa tu perfil y activa tu licencia profesional.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-10 space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-[10px] text-muted-foreground tracking-widest ml-1">Tu Especialidad</Label>
                  <Input 
                    placeholder="Ej: Senior Frontend React Developer" 
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="rounded-2xl h-12 bg-slate-50 border-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-[10px] text-muted-foreground tracking-widest ml-1">Bio / Experiencia</Label>
                  <Textarea 
                    placeholder="Cuéntanos brevemente sobre tus proyectos y por qué quieres enseñar..." 
                    className="min-h-[120px] rounded-2xl bg-slate-50 border-none resize-none"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-dashed">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Licencia Profesional</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Pago único vitalicio</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-headline font-bold text-primary">${LICENSE_FEE.toLocaleString()}</span>
                    <p className="text-[10px] text-muted-foreground">COP</p>
                  </div>
                </div>

                <Button 
                  onClick={handleStartApplication}
                  disabled={isProcessing || !isScriptLoaded || profile?.instructorStatus === 'pending'}
                  className="w-full h-16 rounded-[1.5rem] text-xl font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
                >
                  {profile?.instructorStatus === 'pending' ? (
                    "Solicitud en revisión..."
                  ) : isProcessing ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Pagar y Postularme
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
                
                <p className="text-[10px] text-center text-muted-foreground mt-6 leading-relaxed">
                  Tu solicitud será revisada por nuestro equipo académico en un plazo de 24-48h hábiles. 
                  El pago es reembolsable si tu solicitud es rechazada.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
