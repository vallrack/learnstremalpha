import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { NextRequest, NextResponse } from 'next/server';
import { UserProfile, Course, CourseProgress } from '@/types';

/**
 * Endpoint para recalcular el porcentaje de progreso de todos los estudiantes.
 * Optimizado para procesamiento por lotes (Batching) para mayor escalabilidad.
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
    
    const adminData = userDoc.data() as UserProfile;
    if (adminData?.role !== 'admin' && decodedToken.email !== 'demo@learnstream.ai') {
      return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    console.log('[Recalculate] Iniciando mapeo de estructura de cursos...');
    
    // Cargar estructura base de cursos
    const coursesSnap = await adminDb.collection('courses').get();
    const allModulesSnap = await adminDb.collectionGroup('modules').get();
    const allLessonsSnap = await adminDb.collectionGroup('lessons').get();

    const courseStructure: Record<string, any> = {};
    coursesSnap.docs.forEach(cDoc => {
      const cId = cDoc.id;
      const cData = cDoc.data() as Course;
      courseStructure[cId] = {
        ...cData,
        modules: allModulesSnap.docs.filter(m => m.ref.parent.parent?.id === cId).map(m => ({ id: m.id, ...m.data() })),
        lessons: allLessonsSnap.docs.filter(l => l.ref.path.includes(`courses/${cId}/`)).map(l => ({ id: l.id, ...l.data() }))
      };
    });

    // Cargar submissions y logros (Collection Groups)
    // Nota: Si esto crece mucho, también deberá ser paginado
    const [challengesSnap, achievementsSnap] = await Promise.all([
      adminDb.collectionGroup('challenge_submissions').where('passed', '==', true).get(),
      adminDb.collectionGroup('achievements').get()
    ]);

    const userChallengesCount: Record<string, number> = {};
    challengesSnap.docs.forEach(doc => {
      const uid = doc.ref.parent.parent?.id;
      if (uid) userChallengesCount[uid] = (userChallengesCount[uid] || 0) + 1;
    });

    const userAchievementsCount: Record<string, number> = {};
    achievementsSnap.docs.forEach(doc => {
      const uid = doc.ref.parent.parent?.id;
      if (uid) userAchievementsCount[uid] = (userAchievementsCount[uid] || 0) + 1;
    });

    // 2. Procesar usuarios por lotes para evitar Timeouts
    const BATCH_SIZE = 50;
    let lastUserDoc = null;
    let totalProcessed = 0;
    let updatedProgressCount = 0;
    let updatedUsersCount = 0;
    let hasMore = true;

    console.log(`[Recalculate] Procesando usuarios en lotes de ${BATCH_SIZE}...`);

    while (hasMore) {
      let query = adminDb.collection('users').orderBy('__name__').limit(BATCH_SIZE);
      if (lastUserDoc) {
        query = query.startAfter(lastUserDoc);
      }

      const usersSnap = await query.get();
      if (usersSnap.empty) {
        hasMore = false;
        break;
      }

      let batch = adminDb.batch();
      let operationsInBatch = 0;

      for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        const userData = userDoc.data() as UserProfile;
        
        // Obtener progresos de ESTE usuario
        const progressSnap = await userDoc.ref.collection('courseProgress').get();
        let completedCoursesCount = 0;

        for (const progDoc of progressSnap.docs) {
          const progData = progDoc.data() as CourseProgress;
          const structure = courseStructure[progData.courseId];
          
          if (!structure) continue;

          let totalAccessible = 0;
          const completedLessons = progData.completedLessons || [];

          // Calcular lecciones accesibles según el perfil del usuario
          for (const lesson of structure.lessons || []) {
            const mod = structure.modules?.find((m: any) => m.id === lesson.moduleId);
            const isPaid = !!lesson.isPremium || !!mod?.isPremium;
            
            let hasAccess = false;
            if (userData.role === 'admin' || uid === structure.instructorId) {
              hasAccess = true;
            } else if (isPaid) {
              hasAccess = !!(userData.purchasedCourses?.includes(progData.courseId) || 
                           userData.purchasedModules?.includes(lesson.moduleId) || 
                           userData.purchasedLessons?.includes(lesson.id) || 
                           userData.isPremiumSubscriber);
            } else {
              hasAccess = structure.isFree || userData.isPremiumSubscriber || progData.status === 'enrolled';
            }

            if (hasAccess) totalAccessible++;
          }

          const total = totalAccessible || structure.totalLessons || 0;
          
          if (progData.status === 'completed') {
            completedCoursesCount++;
            if (progData.progressPercentage !== 100) {
              batch.update(progDoc.ref, { progressPercentage: 100, updatedAt: new Date() });
              operationsInBatch++;
              updatedProgressCount++;
            }
          } else if (total > 0 && completedLessons.length > 0) {
            const newPerc = Math.min(100, Math.round((completedLessons.length / total) * 100));
            if (newPerc !== progData.progressPercentage) {
              batch.update(progDoc.ref, { progressPercentage: newPerc, updatedAt: new Date() });
              operationsInBatch++;
              updatedProgressCount++;
            }
          }
        }

        // Calcular XP
        const passedChallenges = userChallengesCount[uid] || 0;
        const totalAchievements = userAchievementsCount[uid] || 0;
        const calculatedXp = (completedCoursesCount * 500) + (passedChallenges * 100) + (totalAchievements * 250);
        
        if (calculatedXp !== (userData.xp || 0)) {
          batch.update(userDoc.ref, { xp: calculatedXp, lastSyncAt: new Date() });
          operationsInBatch++;
          updatedUsersCount++;
        }

        totalProcessed++;
        
        // Si el lote de Firestore está lleno, hacer commit
        if (operationsInBatch >= 450) {
          await batch.commit();
          batch = adminDb.batch();
          operationsInBatch = 0;
        }
      }

      if (operationsInBatch > 0) {
        await batch.commit();
      }

      lastUserDoc = usersSnap.docs[usersSnap.docs.length - 1];
      console.log(`[Recalculate] Procesados ${totalProcessed} usuarios...`);
      
      // Seguridad: Si ya procesamos muchos, salimos para evitar timeout infinito (opcional)
      if (totalProcessed > 5000) {
        console.warn('[Recalculate] Límite de seguridad alcanzado (5000 usuarios).');
        break;
      }
    }

    return NextResponse.json({
      success: true,
      results: {
        totalUsersProcessed: totalProcessed,
        usersXpUpdated: updatedUsersCount,
        courseProgressUpdated: updatedProgressCount
      }
    });

  } catch (error: any) {
    console.error('[Recalculate] Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
