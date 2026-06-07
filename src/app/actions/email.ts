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
async function logEmailToFirestore(emailData: { 
  userId?: string, 
  email: string, 
  name: string, 
  subject: string, 
  message: string,
  type: 'custom' | 'bulk' | 'certificate' | 'welcome'
}) {
  try {
    await adminDb.collection('sentEmails').add({
      ...emailData,
      sentAt: new Date(),
      status: 'sent'
    });
  } catch (err) {
    console.error("Error logging email to Firestore:", err);
  }
}

export async function sendCustomEmailAction(studentEmail: string, studentName: string, subject: string, message: string, studentId?: string) {
  try {
    const result = await emailService.sendCustomEmail({ 
      email: studentEmail, 
      name: studentName, 
      subject, 
      message 
    });

    if (result.success) {
      await logEmailToFirestore({
        userId: studentId,
        email: studentEmail,
        name: studentName,
        subject,
        message,
        type: 'custom'
      });
    }

    return result;
  } catch (error: any) {
    console.error("Error in sendCustomEmailAction:", error);
    return { success: false, error: error.message };
  }
}

export async function sendBulkCustomEmailAction(recipients: { email: string, name: string, id?: string }[], subject: string, message: string) {
  try {
    if (!recipients || recipients.length === 0) throw new Error("No hay destinatarios seleccionados");
    
    console.log(`Iniciando envío masivo a ${recipients.length} destinatarios`);
    
    const results = await Promise.all(recipients.map(async (recipient) => {
      const res = await emailService.sendCustomEmail({
        email: recipient.email,
        name: recipient.name,
        subject,
        message
      }).catch(err => ({ success: false, error: err.message, email: recipient.email }));

      if (res.success) {
        await logEmailToFirestore({
          userId: recipient.id,
          email: recipient.email,
          name: recipient.name,
          subject,
          message,
          type: 'bulk'
        });
      }
      return res;
    }));

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

/**
 * Notifica sobre un nuevo curso a todos los alumnos y al admin
 */
export async function notifyNewCourseAction(courseId: string) {
  if (!courseId) return { success: false, error: 'ID de curso requerido' };

  try {
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) return { success: false, error: 'Curso no encontrado' };

    const courseData = courseDoc.data();
    const courseTitle = courseData?.title || 'Nuevo Curso';
    const description = courseData?.description || '';
    const instructorId = courseData?.instructorId;
    const instructorName = courseData?.instructorName || 'Instructor';

    // 1. Notificar al Admin
    await emailService.sendCourseAdminAlert({
      subject: 'Nuevo Curso Publicado',
      message: `El instructor ${instructorName} ha publicado el curso: ${courseTitle}`
    });

    // 2. Notificar al Docente
    if (instructorId) {
      const instructorDoc = await adminDb.collection('users').doc(instructorId).get();
      if (instructorDoc.exists) {
        const instructorData = instructorDoc.data();
        if (instructorData?.email) {
          await emailService.sendCourseTeacherNotification({
            email: instructorData.email,
            name: instructorData.displayName || instructorName,
            courseTitle,
            action: 'created'
          });
        }
      }
    }

    // 3. Notificar a todos los Estudiantes (Usuarios con rol 'student' o sin rol definido que no sean admin)
    // Nota: Limitamos a 500 para evitar abusos en una sola pasada, pero LearnStream suele ser más pequeño
    const studentsSnap = await adminDb.collection('users')
      .where('role', 'in', ['student', null])
      .limit(500)
      .get();
    
    const students = studentsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() as any }))
      .filter((s: any) => s.email && s.role !== 'admin');

    console.log(`Enviando anuncio de nuevo curso a ${students.length} estudiantes`);

    // Enviamos en paralelo para mayor velocidad
    await Promise.all(students.map(student => 
      emailService.sendCourseCreatedEmail({
        email: student.email,
        name: student.displayName || 'Estudiante',
        courseTitle,
        description,
        courseId
      })
    ));

    return { success: true, count: students.length };
  } catch (err: any) {
    console.error('Error in notifyNewCourseAction:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Notifica sobre la actualización de un curso a los alumnos inscritos
 */
export async function notifyCourseUpdateAction(courseId: string) {
  if (!courseId) return { success: false, error: 'ID de curso requerido' };

  try {
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) return { success: false, error: 'Curso no encontrado' };

    const courseData = courseDoc.data();
    const courseTitle = courseData?.title || 'Curso Actualizado';
    const instructorId = courseData?.instructorId;
    const instructorName = courseData?.instructorName || 'Instructor';

    // 1. Notificar al Docente
    if (instructorId) {
      const instructorDoc = await adminDb.collection('users').doc(instructorId).get();
      if (instructorDoc.exists) {
        const instructorData = instructorDoc.data();
        if (instructorData?.email) {
          await emailService.sendCourseTeacherNotification({
            email: instructorData.email,
            name: instructorData.displayName || instructorName,
            courseTitle,
            action: 'updated'
          });
        }
      }
    }

    // 2. Notificar a los alumnos inscritos (usando Collection Group en Firestore Admin)
    const enrollmentsSnap = await adminDb.collectionGroup('courseProgress')
      .where('courseId', '==', courseId)
      .get();
    
    const studentIds = [...new Set(enrollmentsSnap.docs.map(doc => doc.ref.parent.parent?.id).filter(Boolean))];

    if (studentIds.length > 0) {
      console.log(`Enviando notificación de actualización a ${studentIds.length} estudiantes inscritos`);
      
      // Obtener datos de los estudiantes
      const studentDocs = await Promise.all(studentIds.map(id => adminDb.collection('users').doc(id!).get()));
      
      await Promise.all(studentDocs.map(doc => {
        const studentData = doc.data();
        if (studentData?.email) {
          return emailService.sendCourseUpdatedEmail({
            email: studentData.email,
            name: studentData.displayName || 'Estudiante',
            courseTitle,
            courseId
          });
        }
        return Promise.resolve();
      }));
    }

    return { success: true, count: studentIds.length };
  } catch (err: any) {
    console.error('Error in notifyCourseUpdateAction:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Server Action para enviar email de aprobación a un instructor
 */
export async function sendInstructorApprovedEmailAction(email: string, name: string, role: string) {
  try {
    return await emailService.sendInstructorApprovedEmail({ email, name, role });
  } catch (error: any) {
    console.error("Error in sendInstructorApprovedEmailAction:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Server Action para enviar email de rechazo a un instructor
 */
export async function sendInstructorRejectedEmailAction(email: string, name: string, feedback: string) {
  try {
    return await emailService.sendInstructorRejectedEmail({ email, name, feedback });
  } catch (error: any) {
    console.error("Error in sendInstructorRejectedEmailAction:", error);
    return { success: false, error: error.message };
  }
}



