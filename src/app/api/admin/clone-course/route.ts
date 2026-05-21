import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { sourceCourseId, targetCourseId, instructorId, options = {} } = await req.json();

    if (!sourceCourseId || !targetCourseId || !instructorId) {
      return NextResponse.json(
        { error: 'Parámetros faltantes: sourceCourseId, targetCourseId e instructorId' },
        { status: 400 }
      );
    }

    // 1. Autorización
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

    const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const adminData = adminDoc.data();
    if (adminData?.role !== 'admin' && adminData?.role !== 'instructor') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const { moduleIds, startOrderIndex = 0 } = options;

    // 2. Obtener módulos del curso origen
    const modulesRef = adminDb.collection('courses').doc(sourceCourseId).collection('modules');
    const modulesSnapshot = await modulesRef.orderBy('orderIndex', 'asc').get();
    
    const sourceModules = modulesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const modulesToClone = moduleIds 
      ? sourceModules.filter(m => moduleIds.includes(m.id))
      : sourceModules;

    // Proceso de clonación (Optimizada con lectura paralela y escritura en lotes/Batches)
    const modulesWithContent = await Promise.all(
      modulesToClone.map(async (sourceModule: any) => {
        const originalModuleId = sourceModule.id;
        
        // Obtener todas las lecciones del módulo
        const lessonsSnapshot = await modulesRef.doc(originalModuleId).collection('lessons').orderBy('orderIndex', 'asc').get();
        
        const lessonsWithContent = await Promise.all(
          lessonsSnapshot.docs.map(async (lessonDoc) => {
            const originalLessonId = lessonDoc.id;
            const sourceLesson = lessonDoc.data();

            // Obtener premium data y recursos en paralelo
            const [premiumSnap, resourcesSnapshot] = await Promise.all([
              modulesRef.doc(originalModuleId).collection('lessons').doc(originalLessonId).collection('premium').doc('data').get(),
              modulesRef.doc(originalModuleId).collection('lessons').doc(originalLessonId).collection('resources').get()
            ]);

            return {
              originalLessonId,
              sourceLesson,
              premiumData: premiumSnap.exists ? premiumSnap.data() : null,
              resources: resourcesSnapshot.docs.map(r => r.data())
            };
          })
        );

        return {
          originalModuleId,
          sourceModule,
          lessons: lessonsWithContent
        };
      })
    );

    let batch = adminDb.batch();
    let writeCount = 0;

    const commitBatchIfNeeded = async () => {
      if (writeCount >= 400) {
        await batch.commit();
        batch = adminDb.batch();
        writeCount = 0;
      }
    };

    for (let i = 0; i < modulesWithContent.length; i++) {
      const { sourceModule, lessons } = modulesWithContent[i];
      
      // Crear nueva referencia de módulo (ID generado sin llamadas de red)
      const newModuleRef = adminDb.collection('courses').doc(targetCourseId).collection('modules').doc();
      const newModuleData = {
        ...sourceModule,
        courseId: targetCourseId,
        instructorId: instructorId,
        orderIndex: startOrderIndex + i,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      delete newModuleData.id;

      batch.set(newModuleRef, newModuleData);
      writeCount++;
      await commitBatchIfNeeded();

      for (const lesson of lessons) {
        const { sourceLesson, premiumData, resources } = lesson;
        
        // Crear nueva referencia de lección
        const newLessonRef = newModuleRef.collection('lessons').doc();
        const newLessonData = {
          ...sourceLesson,
          moduleId: newModuleRef.id,
          instructorId: instructorId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        batch.set(newLessonRef, newLessonData);
        writeCount++;
        await commitBatchIfNeeded();

        // Premium Data
        if (premiumData) {
          const premiumRef = newLessonRef.collection('premium').doc('data');
          batch.set(premiumRef, {
            ...premiumData,
            updatedAt: FieldValue.serverTimestamp()
          });
          writeCount++;
          await commitBatchIfNeeded();
        }

        // Recursos
        for (const resourceData of resources) {
          const resourceRef = newLessonRef.collection('resources').doc();
          batch.set(resourceRef, {
            ...resourceData,
            lessonId: newLessonRef.id,
            instructorId: instructorId,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          writeCount++;
          await commitBatchIfNeeded();
        }
      }
    }

    // Guardar el último lote si tiene cambios pendientes
    if (writeCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({ message: 'Contenido clonado exitosamente' });

  } catch (error: any) {
    console.error('Clone Course Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
