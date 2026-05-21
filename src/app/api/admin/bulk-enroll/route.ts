import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { emailService } from '@/lib/email/email-service';
import { NextRequest, NextResponse } from 'next/server';
import { UserProfile } from '@/types';

interface StudentInput {
  email: string;
  name?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { courseId, students, courseTitle, groupId } = await req.json() as { 
      courseId: string; 
      students: StudentInput[]; 
      courseTitle: string; 
      groupId?: string 
    };

    if (!courseId || !students || !Array.isArray(students)) {
      return NextResponse.json(
        { error: 'Parámetros inválidos. Se requiere courseId y un array de students.' },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 });
    }

    const userDocRef = adminDb.collection('users').doc(decodedToken.uid);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 });
    }
    
    const userData = userDoc.data() as UserProfile;
    if (userData?.role !== 'admin' && userData?.role !== 'instructor') {
      return NextResponse.json({ error: 'Permisos insuficientes para realizar esta acción' }, { status: 403 });
    }

    const results = {
      total: students.length,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Procesar en lotes de 5 para optimizar velocidad sin saturar el servicio de correo
    const batchSize = 5;
    for (let i = 0; i < students.length; i += batchSize) {
      const batchChunk = students.slice(i, i + batchSize);
      
      await Promise.all(batchChunk.map(async (student) => {
        try {
          const { email, name } = student;
          if (!email) {
            results.failed++;
            results.errors.push(`Falta el email para el estudiante ${name || 'Desconocido'}`);
            return;
          }

          let uid: string;
          let emailPasswordToSend: string;
          const tempPassword = ((name?.split(' ')[0] || 'User').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "") + Math.floor(1000 + Math.random() * 9000) + '!').trim();
          
          try {
            const userRecord = await adminAuth.getUserByEmail(email);
            uid = userRecord.uid;
            emailPasswordToSend = 'Tu contraseña habitual (ya estabas registrado en la plataforma)';
            
            // NO actualizamos su contraseña en Firebase Auth ni guardamos tempPassword en Firestore
            await adminDb.collection('users').doc(uid).set({
              displayName: name || userRecord.displayName || email.split('@')[0],
            }, { merge: true });

          } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
              const newUser = await adminAuth.createUser({
                email: email,
                password: tempPassword,
                displayName: name || email.split('@')[0],
              });
              uid = newUser.uid;
              emailPasswordToSend = tempPassword;

              await adminDb.collection('users').doc(uid).set({
                email: email,
                displayName: name || email.split('@')[0],
                tempPassword: tempPassword,
                role: 'student',
                isActive: true,
                profileImageUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${name || email}&backgroundColor=0f172a,1d4ed8,047857&textColor=ffffff`,
                createdAt: FieldValue.serverTimestamp(),
              });
            } else {
              throw error;
            }
          }

          const progressRef = adminDb.collection('users').doc(uid).collection('courseProgress').doc(courseId);
          const progressDoc = await progressRef.get();
          
          if (!progressDoc.exists) {
            // Nuevo estudiante — inicializar progreso desde cero
            await progressRef.set({
              courseId: courseId,
              status: 'enrolled',
              progressPercentage: 0,
              completedLessons: [],
              enrollmentDate: FieldValue.serverTimestamp(),
              lastAccessedAt: FieldValue.serverTimestamp(),
              groupId: groupId || null,
            });
          } else {
            // Estudiante existente — solo actualizar estado y grupo, SIN tocar el progreso
            const updateData: any = {
              status: 'enrolled',
              updatedAt: FieldValue.serverTimestamp(),
            };
            if (groupId) updateData.groupId = groupId;
            await progressRef.update(updateData);
          }
          
          try {
            const emailResult = await emailService.sendBulkWelcomeEmail({
              email,
              name: name || email.split('@')[0],
              password: emailPasswordToSend,
              courseTitle
            });
            
            if (!emailResult.success) {
              results.errors.push(`Correo no enviado a ${email}: ${emailResult.error}`);
            }
          } catch (emailErr) {
            console.error(`Error enviando correo a ${email}:`, emailErr);
            results.errors.push(`Correo no enviado a ${email}: Error de conexión.`);
          }
          
          results.success++;
        } catch (err: any) {
          results.failed++;
          results.errors.push(`Error con ${student.email}: ${err.message}`);
        }
      }));
    }

    // Notificar al Admin
    await adminDb.collection('notifications').add({
      userId: 'admin',
      title: 'Matriculación Masiva Completada',
      message: `Se procesaron ${results.total} estudiantes para el curso ${courseTitle}. Éxitos: ${results.success}, Fallos: ${results.failed}`,
      type: results.failed > 0 ? 'warning' : 'success',
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      link: '/admin/students'
    });

    // Notificar al usuario que lo activó si no es el admin
    if (decodedToken.uid) {
      await adminDb.collection('notifications').add({
        userId: decodedToken.uid,
        title: 'Matriculación Masiva Finalizada',
        message: `El proceso para "${courseTitle}" terminó. Éxito: ${results.success}, Fallidos: ${results.failed}.`,
        type: results.failed > 0 ? 'alert' : 'success',
        read: false,
        createdAt: new Date(),
        link: '/admin/students'
      });
    }

    return NextResponse.json({
      message: 'Proceso de matriculación masiva completado',
      results
    });

  } catch (error: any) {
    console.error('Bulk Enroll Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
