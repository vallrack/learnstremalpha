'use server';

import { adminDb } from '@/lib/firebase-admin';
import { sendEnrollmentWelcomeAction } from './email';

/**
 * Procesa el resultado de una transacción aceptada en Firestore.
 * Esta función es el núcleo del sistema de pagos y se usa tanto en la validación manual como en el webhook.
 */
async function processAcceptedTransaction(
  data: any, 
  userId: string, 
  type: 'premium' | 'instructor', 
  extraData?: { specialty?: string, bio?: string, userName?: string, userEmail?: string }
) {
  const ref_payco = data.x_ref_payco || data.ref_payco;
  const isGuest = userId.startsWith('guest:');
  const guestEmail = isGuest ? userId.split(':')[1] : null;
  const actualUserId = isGuest ? null : userId;

  const academyDoc = await adminDb.collection('settings').doc('branding').get();
  const academyMerchantId = academyDoc.data()?.epaycoMerchantId || 'env_default';
  
  // 1. Verificar duplicados (Idempotencia)
  const existingTrans = await adminDb.collection('transactions')
    .where('ref_payco', '==', String(ref_payco))
    .limit(1)
    .get();
  
  if (!existingTrans.empty) {
    console.log(`[Payment] Transacción ${ref_payco} ya procesada anteriormente.`);
    return { success: true, message: 'Ya procesada.' };
  }

  const userRef = actualUserId ? adminDb.collection('users').doc(actualUserId) : null;
  const updateData: any = { lastEpaycoRef: String(ref_payco) };

  if (type === 'premium') {
    const extra3 = data.x_extra3 || data.extra3;
    
    if (extra3 && extra3 !== 'none' && extra3 !== 'premium') {
      const parts = extra3.split('|');
      const isComplex = parts.length >= 3;
      
      const courseId = isComplex ? parts[0] : extra3;
      const moduleId = isComplex ? parts[1] : 'none';
      const lessonId = isComplex ? parts[2] : 'none';
      const challengeId = parts.length >= 4 ? parts[3] : 'none';
      const podcastId = parts.length >= 5 ? parts[4] : 'none';
      const virtualClassId = parts.length === 6 ? parts[5] : 'none';

      const amount = Number(data.x_amount || data.amount);
      const finalEmail = extraData?.userEmail || data.x_customer_email || data.customer_email || guestEmail || '';

      // Validación de Seguridad Contra Manipulación de Precios
      let expectedPrice = 0;
      try {
        if (virtualClassId !== 'none') {
          const vcDoc = await adminDb.collection('courses').doc(courseId).collection('virtualClasses').doc(virtualClassId).get();
          expectedPrice = vcDoc.data()?.price || 0;
        } else if (challengeId !== 'none') {
          const challengeDoc = await adminDb.collection('coding_challenges').doc(challengeId).get();
          expectedPrice = challengeDoc.data()?.price || 0;
        } else if (podcastId !== 'none') {
          const podcastDoc = await adminDb.collection('podcasts').doc(podcastId).get();
          expectedPrice = podcastDoc.data()?.price || 0;
        } else if (lessonId !== 'none') {
          const lessonDoc = await adminDb.collection('courses').doc(courseId).collection('modules').doc(moduleId).collection('lessons').doc(lessonId).get();
          expectedPrice = lessonDoc.data()?.price || 0;
        } else if (moduleId !== 'none') {
          const moduleDoc = await adminDb.collection('courses').doc(courseId).collection('modules').doc(moduleId).get();
          expectedPrice = moduleDoc.data()?.price || 0;
        } else {
          const courseDoc = await adminDb.collection('courses').doc(courseId).get();
          expectedPrice = courseDoc.data()?.price || 0;
        }

        if (expectedPrice > 0 && amount < expectedPrice) {
          console.error(`[Payment Security] Intento de manipulación de precio: Pagado=${amount}, Esperado=${expectedPrice}. Usuario: ${userId}`);
          return { success: false, message: `Monto pagado (${amount}) es menor al precio real del artículo (${expectedPrice}).` };
        }
      } catch (priceErr) {
        console.warn('[Payment Security] Error consultando el precio oficial del artículo, continuando:', priceErr);
      }
      
      // Lógica de Registro de Transacción por Tipo...
      // (Para brevedad en el refactor inicial, mantenemos la estructura pero centralizada)
      
      if (virtualClassId !== 'none') {
        const vcDoc = await adminDb.collection('courses').doc(courseId).collection('virtualClasses').doc(virtualClassId).get();
        if (vcDoc.exists) {
          const vcData = vcDoc.data();
          const instructorId = vcData?.instructorId || (await adminDb.collection('courses').doc(courseId).get()).data()?.instructorId;
          
          let revenueShare = 70;
          if (instructorId) {
            const instructorDoc = await adminDb.collection('users').doc(instructorId).get();
            if (instructorDoc.exists) revenueShare = instructorDoc.data()?.revenueSharePercentage ?? 70;
          }
          
          const instructorCut = Math.floor(amount * (revenueShare / 100));
          const adminCut = amount - instructorCut;

          await adminDb.collection('transactions').add({
            userId: actualUserId, isGuest, userEmail: finalEmail, courseId, virtualClassId,
            type: 'virtual_class', courseTitle: `Clase en Vivo: ${vcData?.title || 'Sin título'}`,
            instructorId, amount, instructorShare: instructorCut, adminShare: adminCut,
            ref_payco: String(ref_payco), academyMerchantId, createdAt: new Date(), status: 'completed'
          });

          if (userRef) {
            const userSnap = await userRef.get();
            const userData = userSnap.data();
            const currentClasses = userData?.purchasedClasses || [];
            if (!currentClasses.includes(virtualClassId)) updateData.purchasedClasses = [...currentClasses, virtualClassId];
          } else if (isGuest) {
            await adminDb.collection('guest_access').add({ email: finalEmail, courseId, virtualClassId, createdAt: new Date(), ref_payco: String(ref_payco) });
          }
        }
      } else if (challengeId !== 'none') {
        const challengeDoc = await adminDb.collection('coding_challenges').doc(challengeId).get();
        if (challengeDoc.exists) {
          const challengeData = challengeDoc.data();
          const instructorId = challengeData?.instructorId;
          let revenueShare = 70;
          if (instructorId) {
            const instructorDoc = await adminDb.collection('users').doc(instructorId).get();
            if (instructorDoc.exists) revenueShare = instructorDoc.data()?.revenueSharePercentage ?? 70;
          }
          const instructorCut = Math.floor(amount * (revenueShare / 100));
          const adminCut = amount - instructorCut;

          await adminDb.collection('transactions').add({
            userId: actualUserId, isGuest, userEmail: finalEmail, challengeId, type: 'challenge',
            courseTitle: `Desafío: ${challengeData?.title || 'Sin título'}`,
            instructorId, amount, instructorShare: instructorCut, adminShare: adminCut,
            ref_payco: String(ref_payco), createdAt: new Date(), status: 'completed'
          });

          if (userRef) {
            const userSnap = await userRef.get();
            const userData = userSnap.data();
            const currentChallenges = userData?.purchasedChallenges || [];
            if (!currentChallenges.includes(challengeId)) updateData.purchasedChallenges = [...currentChallenges, challengeId];
          } else if (isGuest) {
            await adminDb.collection('guest_access').add({ email: finalEmail, challengeId, createdAt: new Date(), ref_payco: String(ref_payco) });
          }
        }
      } else if (podcastId !== 'none') {
        const podcastDoc = await adminDb.collection('podcasts').doc(podcastId).get();
        if (podcastDoc.exists) {
          const podcastData = podcastDoc.data();
          const instructorId = podcastData?.instructorId;
          let revenueShare = 70;
          if (instructorId) {
            const instructorDoc = await adminDb.collection('users').doc(instructorId).get();
            if (instructorDoc.exists) revenueShare = instructorDoc.data()?.revenueSharePercentage ?? 70;
          }
          const instructorCut = Math.floor(amount * (revenueShare / 100));
          const adminCut = amount - instructorCut;

          await adminDb.collection('transactions').add({
            userId: actualUserId, isGuest, userEmail: finalEmail, podcastId, type: 'podcast',
            courseTitle: `Podcast: ${podcastData?.title || 'Sin título'}`,
            instructorId, amount, instructorShare: instructorCut, adminShare: adminCut,
            ref_payco: String(ref_payco), createdAt: new Date(), status: 'completed'
          });

          if (userRef) {
            const userSnap = await userRef.get();
            const userData = userSnap.data();
            const currentPodcasts = userData?.purchasedPodcasts || [];
            if (!currentPodcasts.includes(podcastId)) updateData.purchasedPodcasts = [...currentPodcasts, podcastId];
          } else if (isGuest) {
            await adminDb.collection('guest_access').add({ email: finalEmail, podcastId, createdAt: new Date(), ref_payco: String(ref_payco) });
          }
        }
      } else {
        const courseDoc = await adminDb.collection('courses').doc(courseId).get();
        if (courseDoc.exists) {
          const courseData = courseDoc.data();
          const instructorId = courseData?.instructorId;
          let revenueShare = 70;
          if (instructorId) {
            const instructorDoc = await adminDb.collection('users').doc(instructorId).get();
            if (instructorDoc.exists) {
              const instData = instructorDoc.data();
              revenueShare = instData?.revenueSharePercentage ?? courseData?.instructorRevenueShare ?? 70;
            }
          }
          const instructorCut = Math.floor(amount * (revenueShare / 100));
          const adminCut = amount - instructorCut;
          let itemName = courseData?.title || 'Curso';
          if (lessonId !== 'none') itemName = `Clase: ${itemName}`;
          else if (moduleId !== 'none') itemName = `Módulo: ${itemName}`;

          await adminDb.collection('transactions').add({
            userId: actualUserId, isGuest, userEmail: finalEmail, courseId, type: 'course',
            moduleId: moduleId !== 'none' ? moduleId : null,
            lessonId: lessonId !== 'none' ? lessonId : null,
            courseTitle: itemName, instructorId, amount, instructorShare: instructorCut, adminShare: adminCut,
            ref_payco: String(ref_payco), academyMerchantId, createdAt: new Date(), status: 'completed'
          });

          if (userRef) {
            const userSnap = await userRef.get();
            const userData = userSnap.data();
            if (lessonId !== 'none') {
              const currentLessons = userData?.purchasedLessons || [];
              if (!currentLessons.includes(lessonId)) updateData.purchasedLessons = [...currentLessons, lessonId];
            } else if (moduleId !== 'none') {
              const currentModules = userData?.purchasedModules || [];
              if (!currentModules.includes(moduleId)) updateData.purchasedModules = [...currentModules, moduleId];
            } else {
              const currentPurchased = userData?.purchasedCourses || [];
              if (!currentPurchased.includes(courseId)) updateData.purchasedCourses = [...currentPurchased, courseId];
            }
          } else if (isGuest) {
            await adminDb.collection('guest_access').add({ email: finalEmail, courseId, moduleId: moduleId !== 'none' ? moduleId : null, lessonId: lessonId !== 'none' ? lessonId : null, createdAt: new Date(), ref_payco: String(ref_payco) });
          }
          
          if (actualUserId && moduleId === 'none' && lessonId === 'none') {
            try { await sendEnrollmentWelcomeAction(actualUserId, courseId); } catch (err) { console.error("Error welcome email:", err); }
          }
        }
      }
      if (userRef) await userRef.update(updateData);
    } else {
      if (userRef) {
        updateData.isPremiumSubscriber = true;
        updateData.premiumUpdatedAt = new Date().toISOString();
        await userRef.update(updateData);
      }
    }
  } else if (type === 'instructor' && userRef) {
    updateData.instructorStatus = 'pending';
    await adminDb.collection('instructor_applications').add({
      userId, userEmail: extraData?.userEmail || '', userName: extraData?.userName || 'Postulante',
      paymentReference: String(ref_payco), status: 'pending', createdAt: new Date(),
      specialty: data.x_extra2 || data.extra2 || extraData?.specialty || '',
      bio: data.x_extra3 || data.extra3 || extraData?.bio || ''
    });
    await userRef.update(updateData);
  }

  return { success: true, message: 'Procesado correctamente.' };
}

/**
 * Acción de servidor para verificar una transacción desde el cliente (Redirección ePayco).
 */
export async function verifyEpaycoTransaction(
  ref_payco: string, 
  userId: string, 
  type: 'premium' | 'instructor' = 'premium',
  extraData?: { specialty?: string, bio?: string, userName?: string, userEmail?: string }
) {
  if (!ref_payco || !userId) return { success: false, message: 'Faltan parámetros.' };

  try {
    const response = await fetch(`https://secure.epayco.co/validation/v1/reference/${ref_payco}`);
    const result = await response.json();

    if (result.success && result.data.x_cod_response === 1) {
      return await processAcceptedTransaction(result.data, userId, type, extraData);
    } else if (result.success && result.data.x_cod_response === 3) {
      return { success: false, pending: true, message: 'Pago pendiente.' };
    }
    return { success: false, message: 'Transacción no aprobada.' };
  } catch (error) {
    console.error('[Payment] Error verifyEpaycoTransaction:', error);
    return { success: false, message: 'Error interno.' };
  }
}

/**
 * Función interna para el Webhook (IPN).
 * El Webhook envía los datos directamente por POST.
 */
export async function processEpaycoWebhook(data: any) {
  const ref_payco = data.x_ref_payco || data.ref_payco;
  if (!ref_payco) {
    console.error('[Webhook] Petición sin referencia de pago');
    return { success: false };
  }

  try {
    // Verificación Pull Activa (Seguridad contra Spoofing)
    const response = await fetch(`https://secure.epayco.co/validation/v1/reference/${ref_payco}`);
    const apiResult = await response.json();

    if (!apiResult.success || !apiResult.data) {
      console.error(`[Webhook] Transacción ${ref_payco} no existe en ePayco o falló la verificación`);
      return { success: false };
    }

    const validatedData = apiResult.data;
    const userId = validatedData.x_extra1 || validatedData.extra1;
    const type = (validatedData.x_extra2 || validatedData.extra2) === 'instructor' ? 'instructor' : 'premium';

    if (!userId) {
      console.error(`[Webhook] Transacción ${ref_payco} válida pero sin userId en extra1`);
      return { success: false };
    }

    // Verificar código de respuesta oficial (1 = Aceptado)
    if (Number(validatedData.x_cod_response) === 1) {
      console.log(`[Webhook] Procesando pago exitoso verificado para usuario: ${userId}`);
      return await processAcceptedTransaction(validatedData, userId, type as any);
    }

    console.log(`[Webhook] Notificación oficial recibida con estado no aceptado: ${validatedData.x_response}`);
    return { success: true };

  } catch (error) {
    console.error('[Webhook] Error en verificación pull de webhook:', error);
    return { success: false };
  }
}
