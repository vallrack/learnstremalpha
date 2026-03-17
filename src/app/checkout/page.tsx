'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  XCircle
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function CheckoutPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const BASE_PRICE = 120000; // Valor base en COP

  const profileRef = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return doc(db, 'users', user.uid);
  }, [db, user?.uid]);
  const { data: profile } = useDoc(profileRef);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
    if (profile?.isPremiumSubscriber) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router, profile]);

  const finalPrice = useMemo(() => {
    if (!appliedCoupon) return BASE_PRICE;
    const discount = (BASE_PRICE * appliedCoupon.discountPercentage) / 100;
    return Math.max(0, BASE_PRICE - discount);
  }, [appliedCoupon]);

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
        
        // Validar expiración
        if (promo.expiresAt && promo.expiresAt.toDate() < new Date()) {
          toast({ variant: "destructive", title: "Cupón vencido", description: "Esta oferta ya no está disponible." });
          return;
        }

        // Validar límite de uso
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
    if (!user?.uid || !user.email) return;
    
    const publicKey = process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY;
    
    if (!publicKey) {
      toast({
        variant: "destructive",
        title: "Configuración incompleta",
        description: "Falta la llave pública de ePayco. Contacta al administrador.",
      });
      return;
    }

    setIsProcessing(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.epayco.co/checkout.js';
    script.async = true;
    script.onload = () => {
      const handler = (window as any).ePayco.checkout.configure({
        key: publicKey,
        test: false 
      });

      const data = {
        name: "LearnStream Premium - Acceso Ilimitado",
        description: appliedCoupon 
          ? `Acceso vitalicio (Cupón: ${appliedCoupon.code})` 
          : "Acceso de por vida a todos los cursos y desafíos de IA",
        invoice: `LS-${Date.now()}`,
        currency: "cop",
        amount: finalPrice.toString(),
        tax_base: "0",
        tax: "0",
        country: "co",
        lang: "es",
        external: "false",
        response: `${window.location.origin}/checkout/success`,
        name_billing: user.displayName || "Estudiante",
        email_billing: user.email,
        extra1: user.uid, 
        extra2: appliedCoupon?.id || "", // Pasamos el ID del cupón para tracking
      };

      handler.open(data);
      setIsProcessing(false);
    };
    
    document.body.appendChild(script);
  };

  if (isUserLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-headline font-bold mb-4 text-slate-900">Potencia tu carrera hoy</h1>
              <p className="text-lg text-muted-foreground">Desbloquea herramientas profesionales con medios de pago locales a través de ePayco.</p>
            </div>

            <div className="space-y-4">
              {[
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
              ))}
            </div>

            <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-400">Inversión vitalicia:</span>
                <div className="text-right">
                  {appliedCoupon && (
                    <p className="text-xs text-rose-400 line-through font-bold opacity-60">$120.000 COP</p>
                  )}
                  <span className="text-3xl font-bold">${finalPrice.toLocaleString()}<span className="text-sm font-normal opacity-60"> COP</span></span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Un solo pago para siempre</p>
            </div>
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
                  <span className="text-slate-600 font-medium">Plan Premium Vitalicio</span>
                  <span className="font-bold">$120.000</span>
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
                        className="rounded-xl h-11 bg-slate-900"
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
                  <span className="text-3xl font-headline font-bold text-primary">${finalPrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  onClick={handleStartPayment} 
                  disabled={isProcessing}
                  className="w-full h-16 rounded-2xl text-xl font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] bg-primary"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      Iniciando ePayco...
                    </>
                  ) : (
                    <>
                      Pagar con ePayco
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
                
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Transacción procesada de forma segura por ePayco
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50/50 p-6 flex flex-col gap-4">
              <div className="flex flex-wrap justify-center gap-4 opacity-60 grayscale h-6">
                <img src="https://multimedia.epayco.co/epayco-landing/v2/pse.png" alt="PSE" className="h-full" />
                <img src="https://multimedia.epayco.co/epayco-landing/v2/nequi.png" alt="Nequi" className="h-full" />
                <img src="https://multimedia.epayco.co/epayco-landing/v2/daviplata.png" alt="Daviplata" className="h-full" />
                <img src="https://multimedia.epayco.co/epayco-landing/v2/efecty.png" alt="Efecty" className="h-full" />
              </div>
              <p className="text-[10px] text-center text-muted-foreground leading-relaxed px-4">
                Tu acceso Premium se activará automáticamente una vez confirmado el pago por ePayco.
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
