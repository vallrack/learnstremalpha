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

    // Proceso de clonación (Server-side es mucho más rápido y confiable)
    for (let i = 0; i < modulesToClone.length; i++) {
        const sourceModule: any = modulesToClone[i];
        const originalModuleId = sourceModule.id;

        // Crear nuevo módulo
        const newModuleData = {
          ...sourceModule,
          courseId: targetCourseId,
          instructorId: instructorId,
          orderIndex: startOrderIndex + i,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        delete newModuleData.id;

        const newModuleRef = await adminDb.collection('courses').doc(targetCourseId).collection('modules').add(newModuleData);
        const newModuleId = newModuleRef.id;

        // Clonar lecciones
        const lessonsSnapshot = await modulesRef.doc(originalModuleId).collection('lessons').orderBy('orderIndex', 'asc').get();
        
        for (const lessonDoc of lessonsSnapshot.docs) {
            const sourceLesson = lessonDoc.data();
            const originalLessonId = lessonDoc.id;

            const newLessonData = {
                ...sourceLesson,
                moduleId: newModuleId,
                instructorId: instructorId,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            };

            const newLessonRef = await adminDb.collection('courses').doc(targetCourseId).collection('modules').doc(newModuleId).collection('lessons').add(newLessonData);
            const newLessonId = newLessonRef.id;

            // Clonar Premium Data
            const premiumSnap = await modulesRef.doc(originalModuleId).collection('lessons').doc(originalLessonId).collection('premium').doc('data').get();
            if (premiumSnap.exists) {
                await adminDb.collection('courses').doc(targetCourseId).collection('modules').doc(newModuleId).collection('lessons').doc(newLessonId).collection('premium').doc('data').set({
                    ...premiumSnap.data(),
                    updatedAt: FieldValue.serverTimestamp()
                });
            }

            // Clonar Recursos
            const resourcesSnapshot = await modulesRef.doc(originalModuleId).collection('lessons').doc(originalLessonId).collection('resources').get();
            for (const resourceDoc of resourcesSnapshot.docs) {
                const resourceData = resourceDoc.data();
                await adminDb.collection('courses').doc(targetCourseId).collection('modules').doc(newModuleId).collection('lessons').doc(newLessonId).collection('resources').add({
                    ...resourceData,
                    lessonId: newLessonId,
                    instructorId: instructorId,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
            }
        }
    }

    return NextResponse.json({ message: 'Contenido clonado exitosamente' });

  } catch (error: any) {
    console.error('Clone Course Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
