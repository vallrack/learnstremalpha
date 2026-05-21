import { NextRequest, NextResponse } from 'next/server';
import { processEpaycoWebhook } from '@/app/actions/epayco';

/**
 * Endpoint de Webhook (IPN) para ePayco.
 * ePayco enviará una petición POST a esta URL cuando cambie el estado de una transacción.
 */
export async function POST(req: NextRequest) {
  try {
    // ePayco envía los datos como x_www_form_urlencoded por defecto
    const contentType = req.headers.get('content-type');
    let data: any;

    if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      data = Object.fromEntries(formData.entries());
    } else {
      data = await req.json();
    }

    console.log(`[Webhook ePayco] Recibida notificación para ref: ${data.x_ref_payco || data.ref_payco}`);

    // Procesar la transacción
    const result = await processEpaycoWebhook(data);

    if (result.success) {
      // Responder 200 OK para confirmar recepción a ePayco
      return new NextResponse('OK', { status: 200 });
    } else {
      return new NextResponse('Error en procesamiento', { status: 400 });
    }

  } catch (error: any) {
    console.error('[Webhook ePayco] Error crítico:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Permitir GET solo para pruebas rápidas si es necesario (opcional)
export async function GET() {
  return new NextResponse('Webhook ePayco activo. Esperando peticiones POST.', { status: 200 });
}
