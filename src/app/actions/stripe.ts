'use server';

import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';

/**
 * Creates a Stripe Checkout Session for the Premium Subscription.
 * This is a server-side action that returns the secure URL to redirect the user.
 */
export async function createCheckoutSession(userId: string, userEmail: string) {
  // Validar configuración antes de proceder
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder_key_missing') {
    throw new Error('La pasarela de pagos no está configurada correctamente (Falta STRIPE_SECRET_KEY). Contacta al administrador.');
  }

  try {
    const origin = (await headers()).get('origin');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'LearnStream Premium - Acceso Ilimitado',
              description: 'Acceso de por vida a todos los cursos, desafíos evaluados por IA y certificados oficiales.',
              images: ['https://drive.google.com/uc?export=view&id=16eSjcZhzvz1dGapFrNVFXSQ_kG4dyg0i'],
            },
            unit_amount: 2999, // $29.99 USD in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      customer_email: userEmail,
      metadata: {
        userId: userId,
      },
    });

    return { url: session.url };
  } catch (error: any) {
    console.error('Stripe Session Error:', error);
    throw new Error('No pudimos iniciar el proceso de pago. Verifica la configuración de tu cuenta de Stripe.');
  }
}
