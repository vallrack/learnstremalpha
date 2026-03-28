
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, ArrowRight, PartyPopper, AlertCircle, Clock } from 'lucide-react';
import { useUser } from '@/firebase';
import { verifyEpaycoTransaction } from '@/app/actions/epayco';

export default function InstructorSuccessPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref_payco = searchParams.get('ref_payco');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function verifyInstructorPayment() {
      if (!ref_payco || !user?.uid) return;

      try {
        const result = await verifyEpaycoTransaction(ref_payco, user.uid, 'instructor', {
          userName: user.displayName || 'Postulante',
          userEmail: user.email || ''
        });

        if (result.success) {
          setStatus('success');
        } else {
          setStatus('error');
          setErrorMessage(result.message || 'La transacción no fue aprobada.');
        }
      } catch (error) {
        console.error('Error verifying payment server action:', error);
        setStatus('error');
        setErrorMessage('Error interno al validar el pago con el servidor.');
      }
    }

    if (!isUserLoading && user) {
      verifyInstructorPayment();
    }
  }, [user, isUserLoading, ref_payco]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-6" />
          <h1 className="text-3xl font-headline font-bold mb-2">Validando pago de licencia...</h1>
          <p className="text-muted-foreground">Estamos confirmando tu suscripción al programa de instructores.</p>
        </main>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full rounded-[3rem] border-none shadow-2xl overflow-hidden text-center">
            <div className="bg-rose-600 p-12 text-white">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <h2 className="text-3xl font-headline font-bold">Pago no Procesado</h2>
            </div>
            <CardContent className="p-10 space-y-6">
              <p className="text-slate-600 text-lg leading-relaxed">
                {errorMessage}
              </p>
              <Button onClick={() => router.push('/instructor/apply')} className="w-full h-14 rounded-2xl text-lg font-bold gap-2">
                Volver e Intentar de Nuevo
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="max-w-md w-full rounded-[3rem] border-none shadow-2xl overflow-hidden text-center">
          <div className="bg-slate-900 p-12 text-white">
            <div className="bg-white/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
              <Clock className="h-12 w-12 text-amber-400" />
            </div>
            <h2 className="text-3xl font-headline font-bold mb-2">¡Solicitud Recibida!</h2>
            <p className="opacity-80">Tu pago ha sido confirmado. Ahora nuestro equipo revisará tu perfil.</p>
          </div>
          <CardContent className="p-10 space-y-6">
            <p className="text-slate-600 text-lg leading-relaxed">
              Te notificaremos por correo una vez seas aprobado. Podrás acceder a tu panel de instructor y empezar a subir cursos inmediatamente.
            </p>
            <Button onClick={() => router.push('/dashboard')} className="w-full h-14 rounded-2xl text-lg font-bold gap-2">
              Volver al Dashboard
              <ArrowRight className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
