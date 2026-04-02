
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, ArrowRight, PartyPopper, AlertCircle } from 'lucide-react';
import { useUser } from '@/firebase';
import { verifyEpaycoTransaction } from '@/app/actions/epayco';

export default function CheckoutSuccessPage() {
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
    async function verifyPayment() {
      if (!ref_payco) {
        setStatus('error');
        setErrorMessage('No se encontró una referencia de pago válida.');
        return;
      }

      try {
        // Obtenemos la referencia de ePayco primero para ver qué userId tiene
        const response = await fetch(`https://secure.epayco.co/validation/v1/reference/${ref_payco}`);
        const result = await response.json();
        
        if (result.success) {
          const userIdFromTransaction = result.data.x_extra1; // extra1 es donde guardamos finalUserId
          
          const resultVerify = await verifyEpaycoTransaction(ref_payco, userIdFromTransaction, 'premium');
          
          if (resultVerify.success) {
            setStatus('success');
            if (userIdFromTransaction.startsWith('guest:')) {
               localStorage.setItem('guest_email', userIdFromTransaction.split(':')[1]);
            }
          } else {
            setStatus('error');
            setErrorMessage(resultVerify.message || 'La transacción no fue aprobada.');
          }
        } else {
          setStatus('error');
          setErrorMessage('No se pudo validar la referencia con ePayco.');
        }
      } catch (error) {
        console.error('Error in verification:', error);
        setStatus('error');
        setErrorMessage('Hubo un problema al comunicar con el servidor para verificar el pago.');
      }
    }

    if (!isUserLoading) {
      verifyPayment();
    }
  }, [isUserLoading, ref_payco]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-primary/10 p-8 rounded-full mb-6">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
          <h1 className="text-3xl font-headline font-bold mb-2">Verificando tu pago...</h1>
          <p className="text-muted-foreground">Estamos validando la transacción con ePayco. Solo tardará unos segundos.</p>
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
              <h2 className="text-3xl font-headline font-bold">Estado del Pago</h2>
            </div>
            <CardContent className="p-8 space-y-6">
              <p className="text-slate-600">{errorMessage}</p>
              <Button onClick={() => router.push('/dashboard')} className="w-full h-14 rounded-2xl text-lg font-bold gap-2">
                Ir al Dashboard
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
        <Card className="max-w-md w-full rounded-[3rem] border-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">
          <div className="bg-emerald-600 p-12 text-center text-white">
            <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-headline font-bold mb-2">¡Pago Exitoso!</h2>
            <p className="opacity-80">Bienvenido a la comunidad Premium de LearnStream.</p>
          </div>
          <CardContent className="p-8 space-y-6 text-center">
            <div className="flex justify-center gap-2 text-primary font-bold">
              <PartyPopper className="h-5 w-5" />
              <span>Cuenta Activada</span>
            </div>
            <p className="text-slate-600">Tu suscripción ha sido activada correctamente a través de ePayco. ¡Es hora de empezar a aprender!</p>
            <Button onClick={() => router.push('/dashboard')} className="w-full h-14 rounded-2xl text-lg font-bold gap-2 shadow-xl shadow-primary/20">
              Ir a mi Dashboard
              <ArrowRight className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
