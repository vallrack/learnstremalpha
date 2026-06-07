'use client';

import { Navbar } from '@/components/layout/Navbar';
import { useBrand } from '@/lib/branding/BrandingProvider';

export default function PrivacyPage() {
  const { name } = useBrand();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white rounded-[2.5rem] p-8 md:p-16 shadow-xl border border-slate-100 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-headline font-black text-slate-900">Política de Privacidad</h1>
            <p className="text-sm text-slate-400 font-medium">Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div className="prose prose-slate max-w-none text-slate-600 space-y-6 leading-relaxed">
            <p>
              En <strong>{name}</strong>, valoramos tu privacidad y nos comprometemos a proteger tus datos personales. Esta Política de Privacidad describe cómo recopilamos, utilizamos y compartimos tu información cuando utilizas nuestra plataforma.
            </p>

            <h2 className="text-xl font-headline font-bold text-slate-800 pt-4 border-t">1. Información que Recopilamos</h2>
            <p>
              Recopilamos información para proporcionarte una mejor experiencia de aprendizaje:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Datos de Registro:</strong> Cuando creas una cuenta, recopilamos tu nombre, dirección de correo electrónico, foto de perfil y contraseña.</li>
              <li><strong>Datos de Aprendizaje:</strong> Registramos tu progreso en los cursos, lecciones completadas, respuestas de cuestionarios, código ejecutado en desafíos y participación en los foros.</li>
              <li><strong>Datos de Pago:</strong> Para transacciones Premium, la pasarela de pago (como ePayco) procesa tus datos bancarios o de tarjeta de forma cifrada y segura. Nosotros no almacenamos tu número de tarjeta de crédito completo en nuestros servidores.</li>
            </ul>

            <h2 className="text-xl font-headline font-bold text-slate-800 pt-4 border-t">2. Uso de la Información</h2>
            <p>
              Utilizamos la información recopilada con los siguientes propósitos:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Personalizar y optimizar tu experiencia de aprendizaje.</li>
              <li>Emitir certificados verificables a tu nombre tras la finalización de los cursos.</li>
              <li>Enviar notificaciones sobre actualizaciones de cursos, anuncios importantes o soporte técnico.</li>
              <li>Procesar transacciones de manera segura y prevenir el fraude.</li>
            </ul>

            <h2 className="text-xl font-headline font-bold text-slate-800 pt-4 border-t">3. Cookies y Tecnologías de Seguimiento</h2>
            <p>
              Utilizamos cookies esenciales y de análisis para mantener tu sesión activa, recordar tus preferencias de idioma y analizar el rendimiento del sitio web. Puedes desactivar las cookies en la configuración de tu navegador, aunque esto podría afectar la disponibilidad de algunas funciones de la plataforma.
            </p>

            <h2 className="text-xl font-headline font-bold text-slate-800 pt-4 border-t">4. Protección de Datos y Seguridad</h2>
            <p>
              Implementamos medidas de seguridad técnicas y administrativas avanzadas (incluyendo cifrado SSL/HTTPS, autenticación Firebase y bases de datos seguras) para proteger tus datos contra accesos no autorizados, pérdidas o alteraciones. Sin embargo, recuerda que ningún método de transmisión por Internet o almacenamiento electrónico es 100% seguro.
            </p>

            <h2 className="text-xl font-headline font-bold text-slate-800 pt-4 border-t">5. Derechos del Usuario (ARCO)</h2>
            <p>
              Tienes derecho a acceder, rectificar, cancelar u oponerte al tratamiento de tus datos personales. Puedes solicitar la actualización de tus datos desde la sección de perfil o solicitar la eliminación definitiva de tu cuenta enviándonos un correo electrónico.
            </p>

            <h2 className="text-xl font-headline font-bold text-slate-800 pt-4 border-t">6. Cambios a esta Política</h2>
            <p>
              Podemos actualizar nuestra Política de Privacidad periódicamente. Te recomendamos revisar esta página regularmente para estar al tanto de cualquier cambio. Las actualizaciones entrarán en vigor tan pronto como se publiquen en el sitio web.
            </p>

            <h2 className="text-xl font-headline font-bold text-slate-800 pt-4 border-t">7. Contacto</h2>
            <p>
              Si tienes preguntas sobre esta Política de Privacidad o el tratamiento de tus datos, ponte en contacto a: <a href="mailto:vallrack67@gmail.com" className="text-primary hover:underline font-bold">vallrack67@gmail.com</a>.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
