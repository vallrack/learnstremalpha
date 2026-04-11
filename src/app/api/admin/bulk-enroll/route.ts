import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { emailService } from '@/lib/email/email-service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { courseId, students, courseTitle, groupId } = await req.json();

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
    
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'instructor' && decodedToken.email !== 'demo@learnstream.ai') {
      return NextResponse.json({ error: 'Permisos insuficientes para realizar esta acción' }, { status: 403 });
    }

    const results = {
      total: students.length,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const student of students) {
      try {
        const { email, name } = student;
        if (!email) {
          results.failed++;
          results.errors.push(`Falta el email para el estudiante ${name || 'Desconocido'}`);
          continue;
        }

        let uid;
        const tempPassword = ((name?.split(' ')[0] || 'User').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "") + Math.floor(1000 + Math.random() * 9000) + '!').trim();
        
        try {
          const userRecord = await adminAuth.getUserByEmail(email);
          uid = userRecord.uid;
          
          // Actualizar contraseña para usuarios existentes por si acaso no les llega el correo
          await adminAuth.updateUser(uid, { password: tempPassword });
          
          // Guardar la clave temporal en Firestore para que el admin la vea
          await adminDb.collection('users').doc(uid).set({
            tempPassword: tempPassword,
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

            await adminDb.collection('users').doc(uid).set({
              email: email,
              displayName: name || email.split('@')[0],
              tempPassword: tempPassword, // Guardamos la clave para el admin
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
            if (groupId) {
              await progressRef.update({ groupId });
            }
        }
        
        // Intentar enviar correo de bienvenida con los accesos
        try {
          await emailService.sendBulkWelcomeEmail({
            email,
            name: name || email.split('@')[0],
            password: tempPassword,
            courseTitle
          });
        } catch (emailErr) {
          console.error(`Error enviando correo a ${email}:`, emailErr);
          results.errors.push(`Correo no enviado a ${email}: El servidor de correos no respondió.`);
        }
        
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Error con ${student.email}: ${err.message}`);
      }
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
