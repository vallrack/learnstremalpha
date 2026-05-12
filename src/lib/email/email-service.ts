import { Resend } from 'resend';
import { BrevoClient } from '@getbrevo/brevo';
import { DEFAULT_BRANDING } from '../branding/branding-config';

// Configuración de Resend
const resend = new Resend(process.env.RESEND_API_KEY || 're_E8feRJYo_7ei253LwNVE7PQahPkqFoiPi');

// Configuración de Brevo (V5 Moderno)
const brevo = new BrevoClient({ 
  apiKey: process.env.BREVO_API_KEY || 'YOUR_BREVO_API_KEY'
});

// Remitente verificado en Brevo (vallrack67@gmail.com)
const VERIFIED_SENDER = {
  name: "LearnStream", 
  email: "vallrack67@gmail.com"
};


export const emailService = {
  /**
   * Envía un correo de certificado usando Brevo (Cambiado de Resend para simplificar)
   */
  async sendCertificateEmail({ email, name, courseTitle, technology }: { 
    email: string, 
    name: string, 
    courseTitle: string, 
    technology: string 
  }) {
    try {
      console.log(`Intentando enviar certificado a ${email} desde ${VERIFIED_SENDER.email}...`);
      
      const response = await brevo.transactionalEmails.sendTransacEmail({
        subject: `¡Felicidades! Tu certificado de ${courseTitle} está listo - ${DEFAULT_BRANDING.name}`,
        sender: VERIFIED_SENDER,
        to: [{ email: email, name: name }],
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #6366f1;">¡Lo lograste, ${name}!</h1>
            <p style="font-size: 16px; line-height: 1.5; color: #374151;">
              Has completado exitosamente el curso <strong>${courseTitle}</strong> y has demostrado tu maestría en <strong>${technology}</strong>.
            </p>
            <p style="font-size: 16px; line-height: 1.5; color: #374151;">
              Tu certificado ya está disponible en tu perfil de ${DEFAULT_BRANDING.name}. ¡Sigue aprendiendo y alcanzando nuevas metas!
            </p>
            <div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px; text-align: center;">
              <a href="https://${DEFAULT_BRANDING.domain}/profile" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver mi Certificado</a>
            </div>
            <hr style="margin-top: 40px; border: 0; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              Enviado por ${DEFAULT_BRANDING.name} - ${DEFAULT_BRANDING.tagline}
            </p>
          </div>
        `,
      });

      console.log('Certificado enviado exitosamente via Brevo:', response);
      return { success: true, data: response };
    } catch (err: any) {
      console.error('Error enviando certificado con Brevo:', err?.response?.body || err);
      return { success: false, error: err?.response?.body?.message || err.message || 'Error desconocido en Brevo' };
    }
  },

  /**
   * Envía un recordatorio de pago usando Brevo (Sib)
   */
  async sendPaymentReminder({ email, name }: { email: string, name: string }) {
    try {
      const response = await brevo.transactionalEmails.sendTransacEmail({
        subject: `No pierdas tu progreso - Pásate a Premium en ${DEFAULT_BRANDING.name}`,
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">¡Hola ${name}!</h2>
            <p>Hemos notado que has estado aprendiendo mucho en ${DEFAULT_BRANDING.name}. ¡Felicidades por tu compromiso!</p>
            <p>Para desbloquear todos los retos con IA, obtener certificados verificados y acceso vitalicio a todo el contenido, considera pasarte a nuestro plan <strong>Premium</strong>.</p>
            <p>Es un único pago para siempre. ¡Invierte en tu futuro hoy!</p>
            <div style="margin: 30px 0;">
              <a href="https://${DEFAULT_BRANDING.domain}/checkout" style="background-color: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold;">Obtener Acceso Vitalicio</a>
            </div>
            <p style="font-size: 12px; color: #64748b;">Si tienes alguna duda, responde a este correo y nuestro equipo te ayudará.</p>
          </div>
        `,
        sender: VERIFIED_SENDER,
        to: [{ email: email, name: name }]
      });
      return { success: true, data: response };
    } catch (err: any) {
      console.error('Error sending payment reminder with Brevo:', err?.response?.body || err);
      return { success: false, error: err?.response?.body?.message || err.message };
    }
  },

  /**
   * Envía un correo de bienvenida tras una matrícula masiva usando Brevo
   */
  async sendBulkWelcomeEmail({ email, name, password, courseTitle }: { 
    email: string, 
    name: string, 
    password: string,
    courseTitle: string 
  }) {
    try {
      console.log(`Intentando enviar bienvenida a ${email} desde ${VERIFIED_SENDER.email}...`);
      
      const response = await brevo.transactionalEmails.sendTransacEmail({
        subject: `¡Accesos Listos! Curso: ${courseTitle} - ${DEFAULT_BRANDING.name}`,
        sender: VERIFIED_SENDER,
        to: [{ email: email, name: name }],
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 20px;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #0f172a; margin: 0; font-size: 24px;">¡Hola, ${name}!</h1>
              <p style="color: #64748b; margin-top: 10px;">Tu cuenta ha sido activada para el curso <strong>${courseTitle}</strong>.</p>
            </div>
            
            <div style="background-color: #f8fafc; padding: 25px; border-radius: 15px; margin-bottom: 25px;">
              <p style="margin: 0 0 15px 0; color: #334155; font-weight: bold;">Se te ha asignado el usuario y la clave para tu acceso:</p>
              
              <div style="display: flex; flex-direction: column; gap: 10px;">
                <p style="margin: 0; color: #475569;"><strong>Usuario/Email:</strong> ${email}</p>
                <p style="margin: 0; color: #475569;"><strong>Contraseña Temporal:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${password}</span></p>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="https://${DEFAULT_BRANDING.domain}/login" style="display: inline-block; background-color: #6366f1; color: white; padding: 14px 30px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">Iniciar Sesión Ahora</a>
            </div>

            <p style="margin-top: 25px; color: #64748b; font-size: 14px; line-height: 1.6;">
              Hemos incluido toda la información necesaria para que comiences tu aprendizaje. Te recomendamos cambiar tu contraseña una vez ingreses por primera vez en tu perfil.
            </p>

            <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
              Enviado por ${DEFAULT_BRANDING.name} - ${DEFAULT_BRANDING.tagline}
            </p>
          </div>
        `,
      });
      console.log('Correo de bienvenida enviado exitosamente via Brevo:', response);
      return { success: true, data: response };
    } catch (err: any) {
      console.error('Error sending welcome email with Brevo:', err?.response?.body || err);
      return { success: false, error: err?.response?.body?.message || err.message };
    }
  },

  /**
   * Envía un correo personalizado desde el panel de administración
   */
  async sendCustomEmail({ email, name, subject, message }: {
    email: string,
    name: string,
    subject: string,
    message: string
  }) {
    try {
      console.log(`Enviando correo personalizado a ${email} con asunto: ${subject}`);
      
      const response = await brevo.transactionalEmails.sendTransacEmail({
        subject: subject,
        sender: VERIFIED_SENDER,
        to: [{ email: email, name: name }],
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 20px;">
            <div style="margin-bottom: 25px;">
              <h2 style="color: #0f172a; margin: 0;">Hola, ${name}</h2>
            </div>
            
            <div style="color: #334155; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">
              ${message}
            </div>

            <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
              Comunicación oficial de ${DEFAULT_BRANDING.name} - ${DEFAULT_BRANDING.tagline}
            </p>
          </div>
        `,
      });
      return { success: true, data: response };
    } catch (err: any) {
      console.error('Error enviando correo personalizado:', err?.response?.body || err);
      return { success: false, error: err?.response?.body?.message || err.message };
    }
  },

  /**
   * Envía un correo de anuncio de nuevo curso
   */
  async sendCourseCreatedEmail({ email, name, courseTitle, description, courseId }: {
    email: string,
    name: string,
    courseTitle: string,
    description: string,
    courseId: string
  }) {
    try {
      const response = await brevo.transactionalEmails.sendTransacEmail({
        subject: `🚀 ¡Nuevo Curso Disponible!: ${courseTitle} - ${DEFAULT_BRANDING.name}`,
        sender: VERIFIED_SENDER,
        to: [{ email, name }],
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 20px;">
            <h1 style="color: #6366f1; margin: 0;">¡Hola, ${name}!</h1>
            <p style="font-size: 18px; color: #334155; margin-top: 10px;">Tenemos una nueva oportunidad de aprendizaje para ti.</p>
            
            <div style="background-color: #f8fafc; padding: 25px; border-radius: 15px; margin: 25px 0; border: 1px solid #e2e8f0;">
              <h2 style="color: #0f172a; margin: 0 0 10px 0;">${courseTitle}</h2>
              <p style="color: #64748b; font-size: 14px; line-height: 1.6;">${description}</p>
            </div>

            <div style="text-align: center;">
              <a href="https://${DEFAULT_BRANDING.domain}/courses/${courseId}" style="display: inline-block; background-color: #6366f1; color: white; padding: 14px 30px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">Ver Detalles del Curso</a>
            </div>

            <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              ${DEFAULT_BRANDING.name} - ${DEFAULT_BRANDING.tagline}
            </p>
          </div>
        `,
      });
      return { success: true, data: response };
    } catch (err: any) {
      console.error('Error sending course creation email:', err?.response?.body || err);
      return { success: false, error: err?.response?.body?.message || err.message };
    }
  },

  /**
   * Envía un correo de actualización de curso a alumnos inscritos
   */
  async sendCourseUpdatedEmail({ email, name, courseTitle, courseId }: {
    email: string,
    name: string,
    courseTitle: string,
    courseId: string
  }) {
    try {
      const response = await brevo.transactionalEmails.sendTransacEmail({
        subject: `✨ Actualización en tu curso: ${courseTitle}`,
        sender: VERIFIED_SENDER,
        to: [{ email, name }],
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 20px;">
            <h2 style="color: #0f172a; margin: 0;">¡Hola, ${name}!</h2>
            <p style="font-size: 16px; color: #334155; line-height: 1.6;">
              Te informamos que el curso <strong>${courseTitle}</strong> en el que estás inscrito ha sido actualizado con nuevo contenido o mejoras.
            </p>
            
            <p style="color: #64748b; font-size: 14px;">¡Entra ahora para descubrir las novedades y continuar tu aprendizaje!</p>

            <div style="text-align: center; margin-top: 25px;">
              <a href="https://${DEFAULT_BRANDING.domain}/courses/${courseId}" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: bold;">Continuar Aprendiendo</a>
            </div>

            <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e2e8f0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">
              Enviado por ${DEFAULT_BRANDING.name}
            </p>
          </div>
        `,
      });
      return { success: true, data: response };
    } catch (err: any) {
      console.error('Error sending course update email:', err?.response?.body || err);
      return { success: false, error: err?.response?.body?.message || err.message };
    }
  },

  /**
   * Envía una alerta al administrador sobre eventos de cursos
   */
  async sendCourseAdminAlert({ subject, message }: { subject: string, message: string }) {
    try {
      const response = await brevo.transactionalEmails.sendTransacEmail({
        subject: `🔔 Admin Alert: ${subject}`,
        sender: VERIFIED_SENDER,
        to: [{ email: VERIFIED_SENDER.email, name: 'Admin LearnStream' }],
        htmlContent: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #fee2e2; border-radius: 10px; background-color: #fef2f2;">
            <h2 style="color: #b91c1c; margin-top: 0;">Notificación Administrativa</h2>
            <p style="font-size: 16px; color: #450a0a;">${message}</p>
            <hr style="border: 0; border-top: 1px solid #fecaca; margin: 20px 0;" />
            <p style="font-size: 12px; color: #991b1b;">Este es un mensaje automático del sistema LearnStream.</p>
          </div>
        `,
      });
      return { success: true, data: response };
    } catch (err: any) {
      console.error('Error sending admin alert email:', err?.response?.body || err);
      return { success: false, error: err?.response?.body?.message || err.message };
    }
  },

  /**
   * Envía confirmación al docente sobre su curso
   */
  async sendCourseTeacherNotification({ email, name, courseTitle, action }: {
    email: string,
    name: string,
    courseTitle: string,
    action: 'created' | 'updated'
  }) {
    const actionText = action === 'created' ? 'creado y publicado' : 'actualizado';
    try {
      const response = await brevo.transactionalEmails.sendTransacEmail({
        subject: `✅ Tu curso "${courseTitle}" ha sido ${actionText}`,
        sender: VERIFIED_SENDER,
        to: [{ email, name }],
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #dcfce7; border-radius: 20px; background-color: #f0fdf4;">
            <h2 style="color: #166534; margin-top: 0;">¡Excelente trabajo, ${name}!</h2>
            <p style="font-size: 16px; color: #14532d; line-height: 1.6;">
              Te confirmamos que tu curso <strong>${courseTitle}</strong> ha sido ${actionText} exitosamente en la plataforma.
            </p>
            <p style="color: #166534; font-size: 14px;">Tus alumnos ya pueden ver los cambios.</p>
            <div style="text-align: center; margin-top: 25px;">
              <a href="https://${DEFAULT_BRANDING.domain}/admin/courses" style="display: inline-block; background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: bold;">Ir a mi Panel</a>
            </div>
          </div>
        `,
      });
      return { success: true, data: response };
    } catch (err: any) {
      console.error('Error sending teacher notification:', err?.response?.body || err);
      return { success: false, error: err?.response?.body?.message || err.message };
    }
  },

  /**
   * Envía el informe semanal automático al administrador
   */
  async sendWeeklyAdminReport({ reportDate, stats }: {
    reportDate: string,
    stats: {
      totalStudents: number,
      activeStudents: number,
      newThisWeek: number,
      totalCourses: number,
      activeCourses: number,
      totalEnrollments: number,
      completedCourses: number,
      inProgressCourses: number,
      avgProgress: number,
      completedThisWeek: number,
      topCourses: { title: string, count: number }[]
    }
  }) {
    const { totalStudents, activeStudents, newThisWeek, totalCourses, activeCourses,
            totalEnrollments, completedCourses, inProgressCourses, avgProgress,
            completedThisWeek, topCourses } = stats;

    const topCoursesHtml = topCourses.map((c, i) => `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #64748b; font-weight: bold;">#${i + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${c.title}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #6366f1; font-weight: bold; text-align: right;">${c.count} inscritos</td>
      </tr>
    `).join('');

    try {
      const response = await brevo.transactionalEmails.sendTransacEmail({
        subject: `📊 Informe Semanal ${DEFAULT_BRANDING.name} — ${reportDate}`,
        sender: VERIFIED_SENDER,
        to: [{ email: VERIFIED_SENDER.email, name: 'Administrador' }],
        htmlContent: `
          <div style="font-family: 'Segoe UI', sans-serif; max-width: 680px; margin: 0 auto; background: #f8fafc; padding: 30px;">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 20px; padding: 35px; text-align: center; margin-bottom: 28px;">
              <p style="color: rgba(255,255,255,0.75); font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px 0;">INFORME AUTOMÁTICO</p>
              <h1 style="color: white; font-size: 28px; font-weight: 900; margin: 0 0 6px 0;">${DEFAULT_BRANDING.name}</h1>
              <p style="color: rgba(255,255,255,0.8); font-size: 15px; margin: 0;">${reportDate}</p>
            </div>

            <!-- Resumen de Estudiantes -->
            <div style="background: white; border-radius: 16px; padding: 28px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
              <h2 style="color: #0f172a; font-size: 16px; font-weight: 800; margin: 0 0 20px 0; display: flex; align-items: center; gap: 8px;">
                👥 Estudiantes
              </h2>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                <div style="background: #f0f9ff; border-radius: 12px; padding: 18px; text-align: center;">
                  <p style="font-size: 32px; font-weight: 900; color: #0284c7; margin: 0;">${totalStudents}</p>
                  <p style="font-size: 12px; color: #64748b; margin: 6px 0 0 0; font-weight: 600;">Total</p>
                </div>
                <div style="background: #f0fdf4; border-radius: 12px; padding: 18px; text-align: center;">
                  <p style="font-size: 32px; font-weight: 900; color: #16a34a; margin: 0;">${activeStudents}</p>
                  <p style="font-size: 12px; color: #64748b; margin: 6px 0 0 0; font-weight: 600;">Activos</p>
                </div>
                <div style="background: #fef3c7; border-radius: 12px; padding: 18px; text-align: center;">
                  <p style="font-size: 32px; font-weight: 900; color: #d97706; margin: 0;">+${newThisWeek}</p>
                  <p style="font-size: 12px; color: #64748b; margin: 6px 0 0 0; font-weight: 600;">Nuevos esta semana</p>
                </div>
              </div>
            </div>

            <!-- Resumen de Cursos -->
            <div style="background: white; border-radius: 16px; padding: 28px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
              <h2 style="color: #0f172a; font-size: 16px; font-weight: 800; margin: 0 0 20px 0;">📚 Cursos</h2>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
                <div style="background: #f5f3ff; border-radius: 12px; padding: 18px; text-align: center;">
                  <p style="font-size: 32px; font-weight: 900; color: #7c3aed; margin: 0;">${totalCourses}</p>
                  <p style="font-size: 12px; color: #64748b; margin: 6px 0 0 0; font-weight: 600;">Total de cursos</p>
                </div>
                <div style="background: #f0fdf4; border-radius: 12px; padding: 18px; text-align: center;">
                  <p style="font-size: 32px; font-weight: 900; color: #16a34a; margin: 0;">${activeCourses}</p>
                  <p style="font-size: 12px; color: #64748b; margin: 6px 0 0 0; font-weight: 600;">Cursos activos</p>
                </div>
              </div>
            </div>

            <!-- Progreso e Inscripciones -->
            <div style="background: white; border-radius: 16px; padding: 28px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
              <h2 style="color: #0f172a; font-size: 16px; font-weight: 800; margin: 0 0 20px 0;">📈 Progreso e Inscripciones</h2>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 16px;">
                <div style="background: #f8fafc; border-radius: 12px; padding: 18px; text-align: center;">
                  <p style="font-size: 32px; font-weight: 900; color: #6366f1; margin: 0;">${totalEnrollments}</p>
                  <p style="font-size: 12px; color: #64748b; margin: 6px 0 0 0; font-weight: 600;">Inscripciones totales</p>
                </div>
                <div style="background: #f8fafc; border-radius: 12px; padding: 18px; text-align: center;">
                  <p style="font-size: 32px; font-weight: 900; color: #6366f1; margin: 0;">${avgProgress}%</p>
                  <p style="font-size: 12px; color: #64748b; margin: 6px 0 0 0; font-weight: 600;">Progreso promedio</p>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
                <div style="background: #fef9c3; border-radius: 12px; padding: 16px; text-align: center;">
                  <p style="font-size: 26px; font-weight: 900; color: #854d0e; margin: 0;">${inProgressCourses}</p>
                  <p style="font-size: 11px; color: #64748b; margin: 5px 0 0 0; font-weight: 600;">En progreso</p>
                </div>
                <div style="background: #dcfce7; border-radius: 12px; padding: 16px; text-align: center;">
                  <p style="font-size: 26px; font-weight: 900; color: #166534; margin: 0;">${completedCourses}</p>
                  <p style="font-size: 11px; color: #64748b; margin: 5px 0 0 0; font-weight: 600;">Completados</p>
                </div>
                <div style="background: #dbeafe; border-radius: 12px; padding: 16px; text-align: center;">
                  <p style="font-size: 26px; font-weight: 900; color: #1d4ed8; margin: 0;">+${completedThisWeek}</p>
                  <p style="font-size: 11px; color: #64748b; margin: 5px 0 0 0; font-weight: 600;">Completados esta semana</p>
                </div>
              </div>
            </div>

            <!-- Top Cursos -->
            ${topCourses.length > 0 ? `
            <div style="background: white; border-radius: 16px; padding: 28px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
              <h2 style="color: #0f172a; font-size: 16px; font-weight: 800; margin: 0 0 16px 0;">🏆 Top Cursos por Inscripciones</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #f8fafc;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">#</th>
                    <th style="padding: 10px 12px; text-align: left; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Curso</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Inscritos</th>
                  </tr>
                </thead>
                <tbody>
                  ${topCoursesHtml}
                </tbody>
              </table>
            </div>
            ` : ''}

            <!-- CTA -->
            <div style="text-align: center; margin-bottom: 28px;">
              <a href="https://${DEFAULT_BRANDING.domain}/admin/students" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: 800; font-size: 15px;">
                Ver Panel Completo →
              </a>
            </div>

            <!-- Footer -->
            <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
              Este informe es generado automáticamente cada sábado por ${DEFAULT_BRANDING.name}.<br/>
              Para dejar de recibirlo, desactiva el cron en tu panel de Vercel.
            </p>
          </div>
        `,
      });
      return { success: true, data: response };
    } catch (err: any) {
      console.error('Error enviando informe semanal:', err?.response?.body || err);
      return { success: false, error: err?.response?.body?.message || err.message };
    }
  }
};


