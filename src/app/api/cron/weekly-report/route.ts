import { adminDb } from '@/lib/firebase-admin';
import { emailService } from '@/lib/email/email-service';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Cron job: Informe semanal automático para el administrador.
 * Se ejecuta cada sábado a las 8:00am (configurado en vercel.json).
 * Protegido con CRON_SECRET para evitar invocaciones no autorizadas.
 */
export async function GET(req: NextRequest) {
  // Verificar el secreto del cron (Vercel lo envía automáticamente)
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    console.log('[Cron] Iniciando generación de informe semanal...');

    // 1. Obtener estadísticas de usuarios
    const usersSnap = await adminDb.collection('users').get();
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    const totalStudents = users.filter(u => u.role !== 'admin').length;
    const activeStudents = users.filter(u => u.role !== 'admin' && u.isActive !== false).length;
    const newThisWeek = users.filter(u => {
      if (!u.createdAt) return false;
      const created = u.createdAt.toDate ? u.createdAt.toDate() : new Date(u.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created >= weekAgo;
    }).length;

    // 2. Obtener estadísticas de cursos
    const coursesSnap = await adminDb.collection('courses').get();
    const courses = coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    const totalCourses = courses.length;
    const activeCourses = courses.filter(c => c.isActive !== false && !c.isArchived).length;

    // 3. Obtener progresos de todos los estudiantes
    const progressSnap = await adminDb.collectionGroup('courseProgress').get();
    const allProgress = progressSnap.docs.map(d => ({ ...d.data(), _userId: d.ref.parent.parent?.id })) as any[];

    const totalEnrollments = allProgress.length;
    const completedCourses = allProgress.filter(p => p.status === 'completed').length;
    const inProgressCourses = allProgress.filter(p => p.status === 'in-progress' || p.status === 'enrolled' || p.status === 'started').length;

    // 4. Calcular progreso promedio (solo los que tienen progreso > 0)
    const withProgress = allProgress.filter(p => (p.progressPercentage || 0) > 0);
    const avgProgress = withProgress.length > 0
      ? Math.round(withProgress.reduce((sum, p) => sum + (p.progressPercentage || 0), 0) / withProgress.length)
      : 0;

    // 5. Top cursos por inscripciones
    const enrollmentsByCourse: Record<string, number> = {};
    allProgress.forEach(p => {
      if (p.courseId) {
        enrollmentsByCourse[p.courseId] = (enrollmentsByCourse[p.courseId] || 0) + 1;
      }
    });

    const topCourses = Object.entries(enrollmentsByCourse)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([courseId, count]) => {
        const course = courses.find(c => c.id === courseId);
        return { title: course?.title || 'Curso desconocido', count };
      });

    // 6. Estudiantes que completaron cursos esta semana
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const completedThisWeek = allProgress.filter(p => {
      if (p.status !== 'completed' || !p.completedAt) return false;
      const completedAt = p.completedAt.toDate ? p.completedAt.toDate() : new Date(p.completedAt);
      return completedAt >= weekAgo;
    }).length;

    // 7. Enviar el correo
    const reportDate = new Date().toLocaleDateString('es-CO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const result = await emailService.sendWeeklyAdminReport({
      reportDate,
      stats: {
        totalStudents,
        activeStudents,
        newThisWeek,
        totalCourses,
        activeCourses,
        totalEnrollments,
        completedCourses,
        inProgressCourses,
        avgProgress,
        completedThisWeek,
        topCourses,
      }
    });

    if (!result.success) {
      throw new Error(result.error || 'Error al enviar el informe');
    }

    console.log('[Cron] Informe semanal enviado correctamente.');
    return NextResponse.json({
      message: 'Informe semanal enviado correctamente',
      stats: { totalStudents, newThisWeek, totalEnrollments, completedThisWeek }
    });

  } catch (error: any) {
    console.error('[Cron] Error al generar informe semanal:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
