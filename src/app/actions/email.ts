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

/**
 * Acción para enviar un correo de bienvenida cuando un usuario se inscribe en un curso
 */
export async function sendEnrollmentWelcomeAction(userId: string, courseId: string) {
  if (!userId || !courseId) return { success: false, error: 'Faltan parámetros' };

  try {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();

    if (!userDoc.exists || !courseDoc.exists) {
      return { success: false, error: 'Usuario o curso no encontrado' };
    }

    const userData = userDoc.data();
    const courseData = courseDoc.data();

    const email = userData?.email;
    const name = userData?.displayName || 'Estudiante';
    const courseTitle = courseData?.title || 'Curso';
    const password = userData?.tempPassword || ''; // Si existe clave temporal

    if (!email) return { success: false, error: 'El usuario no tiene correo asociado' };

    // Usamos el mismo template de bulk welcome o uno similar
    return await emailService.sendBulkWelcomeEmail({ email, name, password, courseTitle });
  } catch (err) {
    console.error('Error in sendEnrollmentWelcomeAction:', err);
    return { success: false, error: 'Error interno de servidor' };
  }
}

/**
 * Acción para enviar un correo personalizado a un estudiante
 */
export async function sendCustomEmailAction(studentEmail: string, studentName: string, subject: string, message: string) {
  try {
    const result = await emailService.sendCustomEmail({ 
      email: studentEmail, 
      name: studentName, 
      subject, 
      message 
    });
    return result;
  } catch (error: any) {
    console.error("Error in sendCustomEmailAction:", error);
    return { success: false, error: error.message };
  }
}

export async function sendBulkCustomEmailAction(recipients: { email: string, name: string }[], subject: string, message: string) {
  try {
    if (!recipients || recipients.length === 0) throw new Error("No hay destinatarios seleccionados");
    
    console.log(`Iniciando envío masivo a ${recipients.length} destinatarios`);
    
    const results = await Promise.all(recipients.map(recipient => 
      emailService.sendCustomEmail({
        email: recipient.email,
        name: recipient.name,
        subject,
        message
      }).catch(err => ({ success: false, error: err.message, email: recipient.email }))
    ));

    const successCount = results.filter((r: any) => r.success).length;
    const failCount = results.length - successCount;

    return { 
      success: true, 
      summary: `Enviados: ${successCount}, Fallidos: ${failCount}`,
      details: results 
    };
  } catch (error: any) {
    console.error("Error in sendBulkCustomEmailAction:", error);
    return { success: false, error: error.message };
  }
}

