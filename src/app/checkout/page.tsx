'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  ShieldCheck, 
  Loader2, 
  ArrowRight,
  Zap,
  Star,
  Award,
  CreditCard,
  Tag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageCircle,
  BookOpen
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useBrand } from '@/lib/branding/BrandingProvider';
import { doc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPrice, getCurrency } from '@/lib/currency';
import Script from 'next/script';
import Image from 'next/image';

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId');
  const moduleId = searchParams.get('moduleId');
  const lessonId = searchParams.get('lessonId');
  const challengeId = searchParams.get('challengeId');
  const podcastId = searchParams.get('podcastId');
  const virtualClassId = searchParams.get('virtualClassId');
  const { toast } = useToast();
  const { name, supportWhatsapp, academyCurrency, academyMonthlyPrice, academyAnnualPrice } = useBrand();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);
  const [guestEmail, setGuestEmail] = useState('');

  const courseRef = useMemoFirebase(() => {
    if (!db || !courseId) return null;
    return doc(db, 'courses', courseId);
  }, [db, courseId]);
  const { data: course, isLoading: isCourseLoading } = useDoc(courseRef);

  const moduleRef = useMemoFirebase(() => {
    if (!db || !courseId || !moduleId) return null;
    return doc(db, 'courses', courseId, 'modules', moduleId);
  }, [db, courseId, moduleId]);
  const { data: moduleData, isLoading: isModuleLoading } = useDoc(moduleRef);

  const lessonRef = useMemoFirebase(() => {
    if (!db || !courseId || !moduleId || !lessonId) return null;
    return doc(db, 'courses', courseId, 'modules', moduleId, 'lessons', lessonId);
  }, [db, courseId, moduleId, lessonId]);
  const { data: lessonData, isLoading: isLessonLoading } = useDoc(lessonRef);

  const standaloneChallengeRef = useMemoFirebase(() => {
    if (!db || !challengeId) return null;
    return doc(db, 'coding_challenges', challengeId);
  }, [db, challengeId]);
  const { data: challengeData, isLoading: isChallengeLoading } = useDoc(standaloneChallengeRef);
  
  const podcastRef = useMemoFirebase(() => {
    if (!db || !podcastId) return null;
    return doc(db, 'podcasts', podcastId);
  }, [db, podcastId]);
  const { data: podcastData, isLoading: isPodcastLoading } = useDoc(podcastRef);
  
  const virtualClassRef = useMemoFirebase(() => {
    if (!db || !courseId || !virtualClassId) return null;
    return doc(db, 'courses', courseId, 'virtualClasses', virtualClassId);
  }, [db, courseId, virtualClassId]);
  const { data: virtualClassData, isLoading: isVirtualClassLoading } = useDoc(virtualClassRef);
  
  const currentCurrency = 
    virtualClassId && virtualClassData ? (virtualClassData.currency || 'COP') :
    podcastId && podcastData ? (podcastData.currency || 'COP') :
    challengeId && challengeData ? (challengeData.currency || 'COP') :
    lessonId && lessonData ? (lessonData.currency || 'COP') : 
    moduleId && moduleData ? (moduleData.currency || 'COP') : 
    courseId && course ? (course.currency || 'COP') : 
    (academyCurrency || 'COP');

  const BASE_PRICE = 
    virtualClassId && virtualClassData ? (virtualClassData.price || 0) :
    podcastId && podcastData ? (podcastData.price || 0) :
    challengeId && challengeData ? (challengeData.price || 0) : 
    lessonId && lessonData ? (lessonData.price || 0) : 
    moduleId && moduleData ? (moduleData.price || 0) : 
    courseId ? (course?.price || 0) : 
    (academyMonthlyPrice || 120000);

  const finalizedCurrency = currentCurrency || 'COP';
  const finalizedBasePrice = Number(BASE_PRICE) || 0;

  const instructorId = virtualClassData?.instructorId || podcastData?.instructorId || challengeData?.instructorId || course?.instructorId;
  const instructorRef = useMemoFirebase(() => {
    if (!db || !instructorId) return null;
    return doc(db, 'users', instructorId);
  }, [db, instructorId]);
  const { data: instructorProfile } = useDoc(instructorRef);


  useEffect(() => {
    // Solo redirigir si NO es un podcast y no hay usuario
    if (!isUserLoading && !user && !podcastId && !virtualClassId) {
      router.push('/login');
    }
    // Si ya es premium, redirigir al dashboard (a menos que compre un curso/podcast/clase específico)
    if (!courseId && !podcastId && !challengeId && !virtualClassId && profile?.isPremiumSubscriber) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router, profile, courseId, podcastId, challengeId, virtualClassId]);

  // Safety check to avoid ePayco script stuck loading
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ePayco) {
      setIsScriptLoaded(true);
    }
  }, []);

  const finalPrice = useMemo(() => {
    if (!appliedCoupon) return finalizedBasePrice;
    const discount = (finalizedBasePrice * appliedCoupon.discountPercentage) / 100;
    return Math.max(0, finalizedBasePrice - discount);
  }, [appliedCoupon, finalizedBasePrice]);

  const handleValidateCoupon = async () => {
    if (!couponCode.trim() || !db) return;
    
    setIsValidatingCoupon(true);
    try {
      const q = query(
        collection(db, 'promotions'), 
        where('code', '==', couponCode.toUpperCase().trim()),
        where('isActive', '==', true),
        limit(1)
      );
      
      const snap = await getDocs(q);
      
      if (snap.empty) {
        toast({ variant: "destructive", title: "Cupón inválido", description: "El código no existe o ha expirado." });
        setAppliedCoupon(null);
      } else {
        const promo = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
        
        if (promo.expiresAt && promo.expiresAt.toDate() < new Date()) {
          toast({ variant: "destructive", title: "Cupón vencido", description: "Esta oferta ya no está disponible." });
          return;
        }

        if (promo.usageLimit > 0 && (promo.timesUsed || 0) >= promo.usageLimit) {
          toast({ variant: "destructive", title: "Cupón agotado", description: "Se ha alcanzado el límite máximo de usos para este código." });
          return;
        }

        setAppliedCoupon(promo);
        toast({ title: "¡Cupón aplicado!", description: `Se ha descontado un ${promo.discountPercentage}% de tu total.` });
      }
    } catch (error) {
      console.error("Error validating coupon", error);
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleStartPayment = () => {
    const finalEmail = user?.email || guestEmail;
    const finalUserId = user?.uid || `guest:${guestEmail}`;

    if (!finalEmail) {
      toast({ variant: "destructive", title: "Email requerido", description: "Por favor ingresa tu correo para recibir el acceso." });
      return;
    }

    if (!finalEmail.includes('@')) {
      toast({ variant: "destructive", title: "Email inválido", description: "Ingresa un correo electrónico válido." });
      return;
    }
    
    const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;

    if (!publicKey) {
      toast({
        variant: "destructive",
        title: "Configuración incompleta",
        description: "Falta la llave pública de ePayco (NEXT_PUBLIC_EPAYCO_PUBLIC_KEY).",
      });
      console.error("ePayco key missing"); // Adding log for debugging
      return;
    }

    if (!(window as any).ePayco) {
      toast({
        variant: "destructive",
        title: "Pasarela no cargada",
        description: "El script de ePayco no se cargó. Intenta recargar la página.",
      });
      console.error("ePayco script not found on window"); // Adding log for debugging
      return;
    }

    setIsProcessing(true);

    try {
      const handler = (window as any).ePayco.checkout.configure({
        key: publicKey,
        test: false // MODO PRODUCCIÓN ACTIVADO
      });

      const purchaseName = virtualClassId && virtualClassData ? `Clase en Vivo: ${virtualClassData.title}` :
                          podcastId && podcastData ? `Podcast: ${podcastData.title}` :
                          challengeId && challengeData ? `Actividad: ${challengeData.title}` :
                          lessonId && lessonData ? `Clase: ${lessonData.title}` : 
                          moduleId && moduleData ? `Módulo: ${moduleData.title}` :
                          courseId && course ? `Curso: ${course.title}` : 
                          `${name} Premium`;

      const data = {
        name: purchaseName,
        description: virtualClassId ? "Entrada para sesión en vivo individual" :
                    podcastId ? "Acceso individual a podcast premium" :
                    challengeId ? "Acceso individual a desafío premium" :
                    lessonId ? "Acceso individual a lección premium" : 
                    moduleId ? "Acceso completo al módulo premium" :
                    courseId ? "Acceso de por vida al curso" : 
                    "Acceso vitalicio a cursos y desafíos IA",
        invoice: `LS-${Date.now()}-${finalUserId.substring(0, 5)}`,
        currency: finalizedCurrency.toLowerCase(),
        amount: finalPrice.toString(),
        tax_base: "0",
        tax: "0",
        country: currentCurrency === 'COP' ? 'co' : 'us', 
        lang: "es",
        external: "false",
        response: `${window.location.origin}/checkout/success`,
        name_billing: user?.displayName || (guestEmail && guestEmail.includes('@') ? guestEmail.split('@')[0] : `Estudiante ${name}`),
        email_billing: finalEmail,
        extra1: finalUserId, 
        extra2: appliedCoupon?.id || "none",
        extra3: `${courseId || 'none'}|${moduleId || 'none'}|${lessonId || 'none'}|${challengeId || 'none'}|${podcastId || 'none'}|${virtualClassId || 'none'}`,
      };

      // CONFIGURACIÓN DE PAGO DIVIDIDO (70/30) SI HAY INSTRUCTOR CON ID CONFIGURADO
      const appMerchantId = process.env.NEXT_PUBLIC_EPAYCO_MERCHANT_ID;
      if (appMerchantId && instructorProfile?.epaycoMerchantId) {
        const sharePercentage = instructorProfile.revenueSharePercentage || 70;
        const instructorAmount = Math.floor(finalPrice * (sharePercentage / 100));
        
        (data as any).splitpayment = "true";
        (data as any).split_app_id = appMerchantId;
        (data as any).split_merchant_id = appMerchantId;
        (data as any).split_type = "01"; // Valor fijo para mayor precisión
        (data as any).split_receivers = JSON.stringify([
          {
            id: instructorProfile.epaycoMerchantId,
            total: instructorAmount.toString()
          }
        ]);
      }

      handler.open(data);
    } catch (err) {
      console.error("ePayco error:", err);
      toast({ variant: "destructive", title: "Error al abrir pasarela", description: "Asegúrate de haber autorizado este dominio en el panel de ePayco." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isUserLoading || isCourseLoading || isModuleLoading || isLessonLoading || isChallengeLoading || isPodcastLoading || isVirtualClassLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const whatsappLink = `https://wa.me/${supportWhatsapp}?text=Hola%20${name},%20tengo%20problemas%20con%20el%20pago%20de%20mi%20suscripci%C3%B3n%20Premium%20y%20me%20gustar%C3%ADa%20recibir%20ayuda.`;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <Script 
        src="https://checkout.epayco.co/checkout.js" 
        onLoad={() => setIsScriptLoaded(true)}
      />
      
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Aviso de Configuración para el Admin con dominio exacto */}
        {(user?.email === 'varrack67@gmail.com' || user?.email === 'vallrack67@gmail.com') && (
          <div className="mb-8 p-6 bg-rose-50 border-2 border-rose-200 rounded-[2rem] flex flex-col md:flex-row items-start gap-6 animate-pulse">
            <div className="bg-rose-100 p-3 rounded-2xl">
              <AlertTriangle className="h-8 w-8 text-rose-600 shrink-0" />
            </div>
            <div className="text-sm text-rose-900 space-y-3">
              <p className="text-lg font-bold">¡Acción Requerida para habilitar el Pago!</p>
              <p>
                La pasarela se queda cargando porque <strong>ePayco bloquea dominios no autorizados</strong>. 
                Copia el siguiente dominio y agrégalo en tu panel de ePayco (<strong>Configuración &gt; Propiedades &gt; Dominios Permitidos</strong>):
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white/80 p-3 rounded-xl border border-rose-200 font-mono text-xs break-all shadow-inner">
                  {typeof window !== 'undefined' ? window.location.origin : 'Cargando dominio...'}
                </code>
                <Button size="sm" variant="outline" className="rounded-lg h-10" onClick={() => {
                  navigator.clipboard.writeText(window.location.origin);
                  toast({ title: "Dominio copiado", description: "Pégalo en el panel de ePayco." });
                }}>Copiar</Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-headline font-bold mb-4 text-slate-900">
                {virtualClassId && virtualClassData ? `Ticket: ${virtualClassData.title}` :
                 podcastId && podcastData ? `Escucha: ${podcastData.title}` :
                 challengeId && challengeData ? `Desbloquea: ${challengeData.title}` :
                 lessonId && lessonData ? `Desbloquea: ${lessonData.title}` :
                 moduleId && moduleData ? `Módulo: ${moduleData.title}` :
                 courseId && course ? `Inscríbete en: ${course.title}` : 
                 "Potencia tu carrera hoy"}
              </h1>
              <p className="text-lg text-muted-foreground">
                {virtualClassId ? "Adquiere tu entrada para esta sesión en vivo o su grabación." :
                 podcastId || challengeId || lessonId || moduleId ? "Adquiere acceso permanente a este contenido premium." :
                 courseId && course ? "Adquiere acceso de por vida a este programa certificado." : 
                 "Desbloquea herramientas profesionales con medios de pago locales a través de ePayco."}
              </p>
            </div>

            <div className="space-y-4">
              {courseId && course ? (
                [
                  { icon: Zap, title: "Pagos con Nequi y Daviplata", desc: "Usa tus billeteras digitales favoritas o PSE." },
                  { icon: BookOpen, title: "Acceso Vitalicio al Curso", desc: "Aprende a tu propio ritmo sin límites de tiempo." },
                  { icon: Award, title: "Certificado de Finalización", desc: "Diploma verificado para tu portafolio profesional." }
                ].map((feat, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="bg-primary/10 p-3 rounded-xl h-fit">
                      <feat.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{feat.title}</h4>
                      <p className="text-sm text-muted-foreground">{feat.desc}</p>
                    </div>
                  </div>
                ))
              ) : (
                [
                  { icon: Zap, title: "Pagos con Nequi y Daviplata", desc: "Usa tus billeteras digitales favoritas o PSE para activar tu cuenta al instante." },
                  { icon: Star, title: "Evaluación por IA", desc: "Feedback detallado e insignias de maestría en tus retos de código." },
                  { icon: Award, title: "Certificados de Valor", desc: "Diplomas verificados listos para compartir en tu portfolio profesional." }
                ].map((feat, i) => (
                  <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="bg-primary/10 p-3 rounded-xl h-fit">
                      <feat.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{feat.title}</h4>
                      <p className="text-sm text-muted-foreground">{feat.desc}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-400">Inversión vitalicia:</span>
                <div className="text-right">
                  {appliedCoupon && (
                    <p className="text-xs text-rose-400 line-through font-bold opacity-60">{formatPrice(finalizedBasePrice, finalizedCurrency)}</p>
                  )}
                  <span className="text-3xl font-bold">{formatPrice(finalPrice, finalizedCurrency)}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Un solo pago para siempre</p>
            </div>

            {!user && (
              <div className="p-8 bg-white rounded-[2.5rem] border-2 border-primary/20 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 text-primary">
                  <div className="p-2 bg-primary/10 rounded-xl"><CheckCircle2 className="h-5 w-5" /></div>
                  <h3 className="font-bold">Compra como invitado</h3>
                </div>
                <p className="text-sm text-muted-foreground">No necesitas registrarte. Ingresa tu email para recibir el acceso instantáneo tras el pago.</p>
                <div className="space-y-2">
                  <Label htmlFor="guestEmail" className="font-bold ml-1">Tu Correo Electrónico</Label>
                  <Input 
                    id="guestEmail"
                    type="email" 
                    placeholder="tu@email.com" 
                    value={guestEmail} 
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="rounded-xl h-12 border-slate-200 focus:border-primary transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 p-8 border-b">
              <CardTitle className="text-xl flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Resumen de Orden
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-slate-600 font-medium whitespace-pre-wrap flex-1 pr-4">
                    {virtualClassId && virtualClassData ? `Entrada Live: ${virtualClassData.title}` :
                     podcastId && podcastData ? `Podcast Premium: ${podcastData.title}` :
                     challengeId && challengeData ? `Actividad Premium: ${challengeData.title}` :
                     lessonId && lessonData ? `Clase Premium: ${lessonData.title}` :
                     moduleId && moduleData ? `Módulo Premium: ${moduleData.title}` :
                     courseId && course ? `Curso: ${course.title}` : 
                     'Plan Premium Vitalicio'}
                  </span>
                  <span className="font-bold shrink-0">{formatPrice(finalizedBasePrice, finalizedCurrency)}</span>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase ml-1">¿Tienes un cupón?</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="CÓDIGO" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="pl-10 rounded-xl h-11 font-mono font-bold" 
                        disabled={!!appliedCoupon || isValidatingCoupon}
                      />
                    </div>
                    {appliedCoupon ? (
                      <Button variant="outline" onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="rounded-xl h-11 border-rose-200 text-rose-600 hover:bg-rose-50">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleValidateCoupon} 
                        disabled={isValidatingCoupon || !couponCode.trim()} 
                        className="rounded-xl h-11 bg-slate-900 text-white"
                      >
                        {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                      </Button>
                    )}
                  </div>
                  {appliedCoupon && (
                    <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3 w-3" /> Cupón "{appliedCoupon.code}" aplicado (-{appliedCoupon.discountPercentage}%)
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <span className="text-xl font-headline font-bold">Total a pagar</span>
                  <span className="text-3xl font-headline font-bold text-primary">{formatPrice(finalPrice, finalizedCurrency)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={handleStartPayment} 
                  disabled={isProcessing || !isScriptLoaded}
                  className="w-full h-16 rounded-2xl text-xl font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] bg-primary text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Abriendo pasarela...
                    </>
                  ) : !isScriptLoaded ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Cargando ePayco...
                    </>
                  ) : (
                    <>
                      Pagar con ePayco
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
                
                <div className="pt-4 space-y-4 border-t border-dashed">
                  <p className="text-center text-xs text-muted-foreground font-medium italic">¿Prefieres pagar por transferencia manual o necesitas ayuda?</p>
                  <a 
                    href={whatsappLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full block"
                  >
                    <Button 
                      variant="outline" 
                      className="w-full h-14 rounded-2xl gap-3 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-bold transition-all"
                    >
                      <MessageCircle className="h-6 w-6" />
                      Soporte y Pagos Directos por WhatsApp
                    </Button>
                  </a>

                  <Button 
                    variant="ghost" 
                    onClick={async () => {
                      if (!user?.uid) return;
                      const { sendPaymentReminderAction } = await import('@/app/actions/email');
                      const res = await sendPaymentReminderAction(user.uid);
                      if (res.success) {
                        toast({ title: "Recordatorio enviado", description: "Revisa tu correo para continuar el proceso más tarde." });
                      } else {
                        toast({ variant: "destructive", title: "Error", description: "No pudimos enviar el recordatorio." });
                      }
                    }}
                    className="w-full h-12 rounded-xl gap-2 text-slate-500 hover:text-primary font-bold"
                  >
                    Recibir recordatorio por correo
                  </Button>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Transacción procesada de forma segura por ePayco
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 p-8 flex flex-col gap-8 border-t border-dashed">
              <div className="flex flex-wrap justify-center items-center gap-8">
                <div className="relative w-12 h-12">
                  <Image src="https://www.viajescircular.com.co/wp-content/uploads/2021/06/PSE.png" alt="PSE" fill className="object-contain" unoptimized />
                </div>
                <div className="relative w-20 h-8">
                  <Image src="https://images.seeklogo.com/logo-png/40/2/nequi-logo-png_seeklogo-404357.png" alt="Nequi" fill className="object-contain" unoptimized />
                </div>
                <div className="relative w-24 h-8">
                  <Image src="https://colombiafintech.co/wp-content/uploads/2025/03/NM_DaviPlata_Color.png" alt="Daviplata" fill className="object-contain" unoptimized />
                </div>
                <div className="relative w-20 h-8">
                  <Image src="https://images.seeklogo.com/logo-png/49/2/efecty-logo-png_seeklogo-491332.png" alt="Efecty" fill className="object-contain" unoptimized />
                </div>
              </div>
              <p className="text-[10px] text-center text-muted-foreground leading-relaxed px-4 max-w-sm font-medium">
                Tu acceso Premium se activará automáticamente una vez confirmado el pago. Soporte disponible 24/7.
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
