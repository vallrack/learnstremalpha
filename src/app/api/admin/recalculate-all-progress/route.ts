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

    // 2. Mapear estructura de cursos (Lecciones y Módulos)
    console.log('--- Iniciando mapeo de estructura de cursos ---');
    const coursesSnap = await adminDb.collection('courses').get();
    const courseStructure: Record<string, any> = {};
    
    // Obtener todos los módulos y lecciones de forma eficiente
    const allModulesSnap = await adminDb.collectionGroup('modules').get();
    const allLessonsSnap = await adminDb.collectionGroup('lessons').get();

    console.log(`Estructura: ${coursesSnap.size} cursos, ${allModulesSnap.size} módulos, ${allLessonsSnap.size} lecciones encontradas.`);

    coursesSnap.docs.forEach(cDoc => {
        const cId = cDoc.id;
        const cData = cDoc.data();
        
        courseStructure[cId] = {
            id: cId,
            isFree: cData.isFree ?? true,
            totalLessons: cData.totalLessons || 0,
            instructorId: cData.instructorId,
            modules: allModulesSnap.docs.filter(m => m.ref.parent.parent?.id === cId).map(m => ({ id: m.id, ...m.data() })),
            lessons: allLessonsSnap.docs.filter(l => {
              // Buscar el courseId en el path o en el documento
              const data = l.data();
              if (data.courseId === cId) return true;
              // Fallback: revisar el path (courses/{cId}/modules/{mId}/lessons/{lId})
              return l.ref.path.includes(`courses/${cId}/`);
            }).map(l => ({ id: l.id, ...l.data() }))
        };
    });

    console.log('Mapeo de estructura completado.');

    // 3. Obtener datos globales para el cálculo de XP (Collection Groups)
    console.log('--- Obteniendo datos de submissions y logros ---');
    const [challengesSnap, achievementsSnap, progressSnap] = await Promise.all([
        adminDb.collectionGroup('challenge_submissions').get(),
        adminDb.collectionGroup('achievements').get(),
        adminDb.collectionGroup('courseProgress').get()
    ]);


    // Mapear conteos por Usuario
    const userChallengesIds: Record<string, Set<string>> = {};
    challengesSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.passed === true && data.challengeId) { 
            const uid = doc.ref.parent.parent?.id;
            if (uid) {
                if (!userChallengesIds[uid]) userChallengesIds[uid] = new Set();
                userChallengesIds[uid].add(data.challengeId);
            }
        }
    });

    const userAchievementsIds: Record<string, Set<string>> = {};
    achievementsSnap.docs.forEach(doc => {
        const data = doc.data();
        const challengeId = data.challengeId;
        const uid = doc.ref.parent.parent?.id;
        
        if (uid && challengeId) {
            if (!userAchievementsIds[uid]) userAchievementsIds[uid] = new Set();
            userAchievementsIds[uid].add(challengeId);
        }
    });

    const userProgressList: Record<string, any[]> = {};
    progressSnap.docs.forEach(doc => {
        const uid = doc.ref.parent.parent?.id;
        if (uid) {
            if (!userProgressList[uid]) userProgressList[uid] = [];
            userProgressList[uid].push({ ref: doc.ref, data: doc.data() });
        }
    });

    // 4. Procesar usuarios y sus progresos
    const usersSnap = await adminDb.collection('users').get();
    console.log(`--- Procesando ${usersSnap.size} usuarios ---`);
    
    let updatedProgressCount = 0;
    let updatedUsersCount = 0;
    let totalProcessed = 0;

    let batch = adminDb.batch();
    let batchSize = 0;

    for (const userDoc of usersSnap.docs) {
      if (totalProcessed % 100 === 0 && totalProcessed > 0) {
        console.log(`Procesados ${totalProcessed} de ${usersSnap.size} usuarios...`);
      }

      const uid = userDoc.id;
      const userData = userDoc.data() || {};
      const userProgs = userProgressList[uid] || [];
      
      // A. Recalcular Progreso de cada curso y Módulos Completados
      let completedCoursesCount = 0;
      let completedModulesCount = 0;

      for (const prog of userProgs) {
          const courseId = prog.data.courseId;
          const structure = courseStructure[courseId];
          const totalGlobal = structure?.totalLessons || 0;
          let totalAccessible = 0;
          const completedLessons = prog.data.completedLessons || [];

          if (structure) {
            for (const lesson of structure.lessons || []) {
                const mod = (structure.modules as any[]).find(m => m.id === lesson.moduleId);
                const isLessonPremium = !!lesson.isPremium;
                const isModulePremium = !!mod?.isPremium;
                const isPaidActivity = (isLessonPremium && (lesson.price || 0) > 0) || (isModulePremium && (mod?.price || 0) > 0);
                
                let hasAccess = false;
                if (userData.role === 'admin' || uid === structure.instructorId) {
                    hasAccess = true;
                } else if (isPaidActivity) {
                    const hasPurchased = (userData.purchasedCourses?.includes(courseId)) || (userData.purchasedModules?.includes(lesson.moduleId)) || (userData.purchasedLessons?.includes(lesson.id));
                    hasAccess = hasPurchased || userData.isPremiumSubscriber;
                } else {
                    hasAccess = structure.isFree || (userData.purchasedCourses?.includes(courseId)) || userData.isPremiumSubscriber || prog.data.status === 'enrolled';
                }

                if (hasAccess) totalAccessible++;
            }
          }

          const total = totalAccessible || totalGlobal;
          
          if (prog.data.status === 'completed') {
              completedCoursesCount++;
              // Si ya está completado, el progreso DEBE ser 100% — nunca lo bajamos
              if ((prog.data.progressPercentage || 0) !== 100) {
                  batch.update(prog.ref, { progressPercentage: 100, updatedAt: new Date() });
                  batchSize++;
                  updatedProgressCount++;
              }
          } else if (total > 0 && completedLessons.length > 0) {
              // Solo recalcular si tenemos lecciones completadas — evita resetear a 0 por error de estructura
              const newPerc = Math.min(100, Math.round((completedLessons.length / total) * 100));
              if (newPerc !== (prog.data.progressPercentage || 0)) {
                  batch.update(prog.ref, { progressPercentage: newPerc, updatedAt: new Date() });
                  batchSize++;
                  updatedProgressCount++;
              }
          } else if (total > 0 && completedLessons.length === 0 && (prog.data.progressPercentage || 0) > 0) {
              // Si hay total de lecciones pero ninguna completada y el progreso guardado es > 0,
              // puede ser un error de estructura del curso. Preservamos el progreso existente y lo dejamos intacto.
              console.warn(`[Recalculate] Preservando progreso existente (${prog.data.progressPercentage}%) para usuario ${uid} en curso ${courseId} — completedLessons está vacío pero progressPercentage > 0. Puede indicar un problema de estructura.`);
          }

      }

      // B. Recalcular XP Total (Fórmula Evolucionada v3.0)
      const passedChallenges = userChallengesIds[uid]?.size || 0;
      const totalAchievements = userAchievementsIds[uid]?.size || 0;
      
      const calculatedXp = (completedCoursesCount * 500) + (completedModulesCount * 100) + (passedChallenges * 100) + (totalAchievements * 250);
      
      if (calculatedXp !== (userData.xp || 0)) {
          batch.update(userDoc.ref, { xp: calculatedXp, lastSyncAt: new Date() });
          batchSize++;
          updatedUsersCount++;
      }

      totalProcessed++;

      if (batchSize >= 450) {
          await batch.commit();
          batch = adminDb.batch();
          batchSize = 0;
      }
    }

    if (batchSize > 0) {
        await batch.commit();
    }

    return NextResponse.json({
      message: 'Sincronización masiva de Progreso y Ranking completada',
      results: {
          totalUsersProcessed: totalProcessed,
          usersXpUpdated: updatedUsersCount,
          courseProgressUpdated: updatedProgressCount
      }
    });

  } catch (error: any) {
    console.error('Recalculate Progress Error:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
