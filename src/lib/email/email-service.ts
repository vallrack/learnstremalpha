import { Resend } from 'resend';
import { BrevoClient } from '@getbrevo/brevo';

// Configuración de Resend
const resend = new Resend(process.env.RESEND_API_KEY || 're_E8feRJYo_7ei253LwNVE7PQahPkqFoiPi');

// Configuración de Brevo (V5 Moderno)
const brevo = new BrevoClient({ 
  apiKey: process.env.BREVO_API_KEY || 'YOUR_BREVO_API_KEY'
});

export const emailService = {
  /**
   * Envía un correo de certificado usando Resend (preferido para transaccionales)
   */
  async sendCertificateEmail({ email, name, courseTitle, technology }: { 
    email: string, 
    name: string, 
    courseTitle: string, 
    technology: string 
  }) {
    try {
      const { data, error } = await resend.emails.send({
        from: 'LearnStream <notifications@learnstream.com>',
        to: [email],
        subject: `¡Felicidades! Tu certificado de ${courseTitle} está listo`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #6366f1;">¡Lo lograste, ${name}!</h1>
            <p style="font-size: 16px; line-height: 1.5; color: #374151;">
              Has completado exitosamente el curso <strong>${courseTitle}</strong> y has demostrado tu maestría en <strong>${technology}</strong>.
            </p>
            <p style="font-size: 16px; line-height: 1.5; color: #374151;">
              Tu certificado ya está disponible en tu perfil de LearnStream. ¡Sigue aprendiendo y alcanzando nuevas metas!
            </p>
            <div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px; text-align: center;">
              <a href="https://learnstream.com/profile" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver mi Certificado</a>
            </div>
            <hr style="margin-top: 40px; border: 0; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              Enviado por LearnStream - Plataforma de Aprendizaje con IA
            </p>
          </div>
        `,
      });

      if (error) {
        console.error('Error sending with Resend:', error);
        // Fallback or just log
        return { success: false, error };
      }
      return { success: true, data };
    } catch (err) {
      console.error('Exception in Resend service:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Envía un recordatorio de pago usando Brevo (Sib)
   */
  async sendPaymentReminder({ email, name }: { email: string, name: string }) {
    try {
      const response = await brevo.transactionalEmails.sendTransacEmail({
        subject: "No pierdas tu progreso - Pásate a Premium en LearnStream",
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366f1;">¡Hola ${name}!</h2>
            <p>Hemos notado que has estado aprendiendo mucho en LearnStream. ¡Felicidades por tu compromiso!</p>
            <p>Para desbloquear todos los retos con IA, obtener certificados verificados y acceso vitalicio a todo el contenido, considera pasarte a nuestro plan <strong>Premium</strong>.</p>
            <p>Es un único pago para siempre. ¡Invierte en tu futuro hoy!</p>
            <div style="margin: 30px 0;">
              <a href="https://learnstream.com/checkout" style="background-color: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold;">Obtener Acceso Vitalicio</a>
            </div>
            <p style="font-size: 12px; color: #64748b;">Si tienes alguna duda, responde a este correo y nuestro equipo te ayudará.</p>
          </div>
        `,
        sender: { name: "LearnStream", email: "ventas@learnstream.com" },
        to: [{ email: email, name: name }]
      });
      return { success: true, data: response };
    } catch (err) {
      console.error('Error sending with Brevo:', err);
      return { success: false, error: err };
    }
  }
};
