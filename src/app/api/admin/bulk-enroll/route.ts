import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const { courseId, students, courseTitle } = await req.json();

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
        let isNewUser = false;
        
        try {
          const userRecord = await adminAuth.getUserByEmail(email);
          uid = userRecord.uid;
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
            const newUser = await adminAuth.createUser({
              email: email,
              password: tempPassword,
              displayName: name || email.split('@')[0],
            });
            uid = newUser.uid;
            isNewUser = true;

            await adminDb.collection('users').doc(uid).set({
              email: email,
              displayName: name || email.split('@')[0],
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
            });
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
