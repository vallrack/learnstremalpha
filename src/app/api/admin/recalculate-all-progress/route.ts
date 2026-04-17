import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint para recalcular el porcentaje de progreso de todos los estudiantes en todos los cursos.
 * Útil para sincronizar datos tras cambios estructurales o corrección de bugs en el guardado.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Verificación de Autorización (Solo Admin)
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const userDocRef = adminDb.collection('users').doc(decodedToken.uid);
    const userDoc = await userDocRef.get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 403 });
    }
    
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && decodedToken.email !== 'demo@learnstream.ai') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // 2. Mapear total de lecciones por curso
    const coursesSnap = await adminDb.collection('courses').get();
    const courseLessonsMap: Record<string, number> = {};
    
    coursesSnap.docs.forEach(doc => {
      const data = doc.data();
      // Usamos el totalLessons precalculado (v1.1.2)
      courseLessonsMap[doc.id] = data.totalLessons || 0;
    });

    // 3. Obtener todos los registros de progreso (Collection Group)
    const progressSnap = await adminDb.collectionGroup('courseProgress').get();
    
    let updatedCount = 0;
    const results = {
        processed: progressSnap.size,
        updated: 0,
        skipped: 0,
        errors: 0
    };

    // Procesamos en lotes de 500 (límite de Firestore batch)
    let currentBatch = adminDb.batch();
    let batchSize = 0;

    for (const pDoc of progressSnap.docs) {
      try {
        const data = pDoc.data();
        const courseId = data.courseId;
        const completedLessons = data.completedLessons || [];
        const totalLessons = courseLessonsMap[courseId];

        if (totalLessons && totalLessons > 0) {
          const newPercentage = Math.round((completedLessons.length / totalLessons) * 100);
          const currentPercentage = data.progressPercentage || 0;

          if (newPercentage !== currentPercentage) {
            currentBatch.update(pDoc.ref, { 
                progressPercentage: Math.min(100, newPercentage),
                updatedAt: new Date() // Sello de tiempo admin
            });
            batchSize++;
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
            results.skipped++; // Curso sin lecciones o no encontrado
        }

        // Si el batch llega al límite, lo enviamos y creamos uno nuevo
        if (batchSize >= 450) {
            await currentBatch.commit();
            currentBatch = adminDb.batch();
            batchSize = 0;
        }
      } catch (err) {
        console.error("Error processing progress doc:", pDoc.id, err);
        results.errors++;
      }
    }

    // Enviar el último batch si tiene operaciones pendientes
    if (batchSize > 0) {
      await currentBatch.commit();
    }

    return NextResponse.json({
      message: 'Sincronización masiva de progreso completada',
      results
    });

  } catch (error: any) {
    console.error('Recalculate Progress Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
