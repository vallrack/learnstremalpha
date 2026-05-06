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
  }
};


