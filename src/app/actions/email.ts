'use server';

import { emailService } from '@/lib/email/email-service';
import { adminDb } from '@/lib/firebase-admin';

/**
 * Acción para enviar el certificado por correo tras finalizar el curso
 */
export async function sendCertificateAction(userId: string, courseId: string) {
  if (!userId || !courseId) return { success: false, error: 'Faltan parámetros' };

  try {
    // Obtener datos del usuario y del curso desde Admin SDK para mayor seguridad
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();

    if (!userDoc.exists || !courseDoc.exists) {
      return { success: false, error: 'Usuario o curso no encontrado' };
    }

    const userData = userDoc.data();
    const courseData = courseDoc.data();

    const email = userData?.email;
    const name = userData?.displayName || 'Estudiante';
    const courseTitle = courseData?.title || 'Curso Finalizado';
    const technology = courseData?.technology || 'Programación';

    if (!email) return { success: false, error: 'El usuario no tiene correo asociado' };

    return await emailService.sendCertificateEmail({ email, name, courseTitle, technology });
  } catch (err) {
    console.error('Error in sendCertificateAction:', err);
    return { success: false, error: 'Error interno de servidor' };
  }
}

/**
 * Acción para enviar un recordatorio de pago a un usuario específico
 */
export async function sendPaymentReminderAction(userId: string) {
  if (!userId) return { success: false, error: 'ID de usuario requerido' };

  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) return { success: false, error: 'Usuario no encontrado' };

    const userData = userDoc.data();
    const email = userData?.email;
    const name = userData?.displayName || 'Estudiante';

    if (!email) return { success: false, error: 'El usuario no tiene correo' };

    return await emailService.sendPaymentReminder({ email, name });
  } catch (err) {
    console.error('Error in sendPaymentReminderAction:', err);
    return { success: false, error: 'Error interno de servidor' };
  }
}
