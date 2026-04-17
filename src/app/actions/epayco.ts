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

  const isGuest = userId.startsWith('guest:');
  const guestEmail = isGuest ? userId.split(':')[1] : null;
  const actualUserId = isGuest ? null : userId;
  const academyDoc = await adminDb.collection('settings').doc('branding').get();
  const academyMerchantId = academyDoc.data()?.epaycoMerchantId || 'env_default';
  let instructorMerchantId: string | undefined = undefined;

  try {
    // 1. Verificar si la transacción ya fue procesada (Evitar ataques de Replay)
    const existingTrans = await adminDb.collection('transactions')
      .where('ref_payco', '==', ref_payco)
      .limit(1)
      .get();
    
    if (!existingTrans.empty) {
      return { success: false, message: 'Esta transacción ya ha sido procesada anteriormente.' };
    }

    const response = await fetch(`https://secure.epayco.co/validation/v1/reference/${ref_payco}`);
    const result = await response.json();

    if (result.success && result.data.x_cod_response === 1) {
      // Transacción Aceptada
      const userRef = actualUserId ? adminDb.collection('users').doc(actualUserId) : null;
      
      const updateData: any = {
        lastEpaycoRef: ref_payco
      };

      if (type === 'premium') {
        const extra3 = result.data.x_extra3;
        
        if (extra3 && extra3 !== 'none' && extra3 !== 'premium') {
          // Nueva lógica: extra3 puede ser "courseId|moduleId|lessonId|challengeId|podcastId"
          const parts = extra3.split('|');
          const isComplex = parts.length >= 3;
          
          const courseId = isComplex ? parts[0] : extra3;
          const moduleId = isComplex ? parts[1] : 'none';
          const lessonId = isComplex ? parts[2] : 'none';
          const challengeId = parts.length >= 4 ? parts[3] : 'none';
          const podcastId = parts.length >= 5 ? parts[4] : 'none';
          const virtualClassId = parts.length === 6 ? parts[5] : 'none';

          const amount = Number(result.data.x_amount);
          const finalEmail = extraData?.userEmail || result.data.x_customer_email || guestEmail || '';
          
          if (virtualClassId !== 'none') {
            // COMPRA DE CLASE VIRTUAL INDEPENDIENTE
            const vcDoc = await adminDb.collection('courses').doc(courseId).collection('virtualClasses').doc(virtualClassId).get();
            if (vcDoc.exists) {
              const vcData = vcDoc.data();
              const instructorId = vcData?.instructorId || (await adminDb.collection('courses').doc(courseId).get()).data()?.instructorId;
              
              let revenueShare = 70;
              if (instructorId) {
                const instructorDoc = await adminDb.collection('users').doc(instructorId).get();
                if (instructorDoc.exists) {
                  revenueShare = instructorDoc.data()?.revenueSharePercentage ?? 70;
                }
              }
              
              const instructorCut = Math.floor(amount * (revenueShare / 100));
              const adminCut = amount - instructorCut;

              await adminDb.collection('transactions').add({
                userId: actualUserId,
                isGuest,
                userEmail: finalEmail,
                courseId,
                virtualClassId,
                type: 'virtual_class',
                courseTitle: `Clase en Vivo: ${vcData?.title || 'Sin título'}`,
                instructorId,
                amount,
                instructorShare: instructorCut,
                adminShare: adminCut,
                ref_payco,
                academyMerchantId,
                instructorMerchantId: instructorMerchantId || null,
                createdAt: new Date(),
                status: 'completed'
              });

              if (userRef) {
                const userSnap = await userRef.get();
                const userData = userSnap.data();
                const currentClasses = userData?.purchasedClasses || [];
                if (!currentClasses.includes(virtualClassId)) {
                  updateData.purchasedClasses = [...currentClasses, virtualClassId];
                }
              } else if (isGuest) {
                await adminDb.collection('guest_access').add({
                  email: finalEmail,
                  courseId,
                  virtualClassId,
                  createdAt: new Date(),
                  ref_payco
                });
              }
            }
          } else if (challengeId !== 'none') {
            // COMPRA DE DESAFÍO INDEPENDIENTE
            const challengeDoc = await adminDb.collection('coding_challenges').doc(challengeId).get();
            if (challengeDoc.exists) {
              const challengeData = challengeDoc.data();
              const instructorId = challengeData?.instructorId;
              
              // Obtener porcentaje del perfil del instructor o usar 70 por defecto
              let revenueShare = 70;
              if (instructorId) {
                const instructorDoc = await adminDb.collection('users').doc(instructorId).get();
                if (instructorDoc.exists) {
                  revenueShare = instructorDoc.data()?.revenueSharePercentage ?? 70;
                }
              }
              
              const instructorCut = Math.floor(amount * (revenueShare / 100));
              const adminCut = amount - instructorCut;

              await adminDb.collection('transactions').add({
                userId: actualUserId,
                isGuest,
                userEmail: finalEmail,
                challengeId,
                type: 'challenge', // Diferenciación de tipo
                courseTitle: `Desafío: ${challengeData?.title || 'Sin título'}`,
                instructorId,
                amount,
                instructorShare: instructorCut,
                adminShare: adminCut,
                ref_payco,
                createdAt: new Date(),
                status: 'completed'
              });

              if (userRef) {
                const userSnap = await userRef.get();
                const userData = userSnap.data();
                const currentChallenges = userData?.purchasedChallenges || [];
                if (!currentChallenges.includes(challengeId)) {
                  updateData.purchasedChallenges = [...currentChallenges, challengeId];
                }
              } else if (isGuest) {
                // Registrar acceso de invitado
                await adminDb.collection('guest_access').add({
                  email: finalEmail,
                  challengeId,
                  createdAt: new Date(),
                  ref_payco
                });
              }
            }
          } else if (podcastId !== 'none') {
            // COMPRA DE PODCAST INDEPENDIENTE
            const podcastDoc = await adminDb.collection('podcasts').doc(podcastId).get();
            if (podcastDoc.exists) {
              const podcastData = podcastDoc.data();
              const instructorId = podcastData?.instructorId;
              
              // Obtener porcentaje del perfil del instructor o usar 70 por defecto
              let revenueShare = 70;
              if (instructorId) {
                const instructorDoc = await adminDb.collection('users').doc(instructorId).get();
                if (instructorDoc.exists) {
                  revenueShare = instructorDoc.data()?.revenueSharePercentage ?? 70;
                }
              }
              
              const instructorCut = Math.floor(amount * (revenueShare / 100));
              const adminCut = amount - instructorCut;

              await adminDb.collection('transactions').add({
                userId: actualUserId,
                isGuest,
                userEmail: finalEmail,
                podcastId,
                type: 'podcast', // Diferenciación de tipo
                courseTitle: `Podcast: ${podcastData?.title || 'Sin título'}`,
                instructorId,
                amount,
                instructorShare: instructorCut,
                adminShare: adminCut,
                ref_payco,
                createdAt: new Date(),
                status: 'completed'
              });

              if (userRef) {
                const userSnap = await userRef.get();
                const userData = userSnap.data();
                const currentPodcasts = userData?.purchasedPodcasts || [];
                if (!currentPodcasts.includes(podcastId)) {
                  updateData.purchasedPodcasts = [...currentPodcasts, podcastId];
                }
              } else if (isGuest) {
                // Registrar acceso de invitado para Podcast
                await adminDb.collection('guest_access').add({
                  email: finalEmail,
                  podcastId,
                  createdAt: new Date(),
                  ref_payco
                });
              }
            }
          } else {
            // COMPRA DE CURSO / MÓDULO / LECCIÓN
            const courseDoc = await adminDb.collection('courses').doc(courseId).get();
            
            if (courseDoc.exists) {
              const courseData = courseDoc.data();
              const instructorId = courseData?.instructorId;
              
              // Obtener porcentaje del perfil del instructor o usar el del curso o 70
              let revenueShare = 70;
              if (instructorId) {
                const instructorDoc = await adminDb.collection('users').doc(instructorId).get();
                if (instructorDoc.exists) {
                  const instData = instructorDoc.data();
                  revenueShare = instData?.revenueSharePercentage ?? 
                                 courseData?.instructorRevenueShare ?? 
                                 70;
                  instructorMerchantId = instData?.epaycoMerchantId;
                } else {
                  revenueShare = courseData?.instructorRevenueShare ?? 70;
                }
              }
              
              const instructorCut = Math.floor(amount * (revenueShare / 100));
              const adminCut = amount - instructorCut;

              let itemName = courseData?.title || 'Curso';
              if (lessonId !== 'none') itemName = `Clase vinculada a: ${itemName}`;
              else if (moduleId !== 'none') itemName = `Módulo vinculado a: ${itemName}`;

              await adminDb.collection('transactions').add({
                userId: actualUserId,
                isGuest,
                userEmail: finalEmail,
                courseId,
                type: 'course', // Diferenciación de tipo
                moduleId: moduleId !== 'none' ? moduleId : null,
                lessonId: lessonId !== 'none' ? lessonId : null,
                courseTitle: itemName,
                instructorId,
                amount,
                instructorShare: instructorCut,
                adminShare: adminCut,
                ref_payco,
                academyMerchantId,
                instructorMerchantId: instructorMerchantId || null,
                createdAt: new Date(),
                status: 'completed'
              });

              if (userRef) {
                const userSnap = await userRef.get();
                const userData = userSnap.data();
                
                if (lessonId !== 'none') {
                  const currentLessons = userData?.purchasedLessons || [];
                  if (!currentLessons.includes(lessonId)) {
                    updateData.purchasedLessons = [...currentLessons, lessonId];
                  }
                } else if (moduleId !== 'none') {
                  const currentModules = userData?.purchasedModules || [];
                  if (!currentModules.includes(moduleId)) {
                    updateData.purchasedModules = [...currentModules, moduleId];
                  }
                } else {
                  const currentPurchased = userData?.purchasedCourses || [];
                  if (!currentPurchased.includes(courseId)) {
                    updateData.purchasedCourses = [...currentPurchased, courseId];
                  }
                }
              } else if (isGuest) {
                 await adminDb.collection('guest_access').add({
                    email: finalEmail,
                    courseId,
                    moduleId: moduleId !== 'none' ? moduleId : null,
                    lessonId: lessonId !== 'none' ? lessonId : null,
                    createdAt: new Date(),
                    ref_payco
                 });
              }
            }
          }
          if (userRef) await userRef.update(updateData);
        } else {
          // Suscripción Premium Global Vitalicia
          if (userRef) {
            updateData.isPremiumSubscriber = true;
            updateData.premiumUpdatedAt = new Date().toISOString();
            await userRef.update(updateData);
          }
        }
      } else if (type === 'instructor' && userRef) {
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
        
        // Notify Admins
        await adminDb.collection('notifications').add({
          userId: 'admin',
          title: 'Nueva Solicitud de Instructor',
          message: `${extraData?.userName || 'Un postulante'} ha pagado su licencia y espera revisión.`,
          read: false,
          link: '/admin/applications',
          type: 'info',
          createdAt: new Date()
        });
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
