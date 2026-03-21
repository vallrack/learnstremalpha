'use server';

import { adminDb } from '@/lib/firebase-admin';

export async function verifyEpaycoTransaction(
  ref_payco: string, 
  userId: string, 
  type: 'premium' | 'instructor' = 'premium',
  extraData?: { specialty?: string, bio?: string, userName?: string, userEmail?: string }
) {
  if (!ref_payco || !userId) {
    return { success: false, message: 'Faltan parámetros requeridos.' };
  }

  try {
    const response = await fetch(`https://secure.epayco.co/validation/v1/reference/${ref_payco}`);
    const result = await response.json();

    if (result.success && result.data.x_cod_response === 1) {
      // Transacción Aceptada
      const userRef = adminDb.collection('users').doc(userId);
      
      const updateData: any = {
        lastEpaycoRef: ref_payco
      };

      if (type === 'premium') {
        updateData.isPremiumSubscriber = true;
        updateData.premiumUpdatedAt = new Date().toISOString();
        await userRef.update(updateData);
      } else if (type === 'instructor') {
        updateData.instructorStatus = 'pending';
        // Creación segura de solicitud de instructor
        const applicationData = {
          userId,
          userEmail: extraData?.userEmail || '',
          userName: extraData?.userName || 'Postulante',
          paymentReference: ref_payco,
          status: 'pending',
          createdAt: new Date(),
          specialty: result.data.x_extra2 || extraData?.specialty || '',
          bio: result.data.x_extra3 || extraData?.bio || ''
        };
        await adminDb.collection('instructor_applications').add(applicationData);
        await userRef.update(updateData);
      }

      return { success: true, message: 'La transacción ha sido validada y procesada exitosamente.' };
    } else if (result.success && result.data.x_cod_response === 3) {
      return { success: false, pending: true, message: 'Tu pago está pendiente de aprobación. Se activará cuando sea procesado.' };
    } else {
      return { success: false, message: 'La transacción no fue aprobada por ePayco.' };
    }
  } catch (error) {
    console.error('Error verifying ePayco transaction in Server Action:', error);
    return { success: false, message: 'Error interno validando la transacción.' };
  }
}
